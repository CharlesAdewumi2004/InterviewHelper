import 'dotenv/config';
import Fastify from 'fastify';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ClientMessage, Debrief, ServerMessage, Turn } from '../../shared/protocol';
import { SessionStore } from './session.js';
import { assembleContext } from './context.js';
import { maybeCompact, streamChat, structuredCall } from './claude.js';
import { compileAndRun } from './runner.js';
import { INTAKE_PROMPT, INTAKE_SCHEMA } from './prompts/intake.js';
import { DEBRIEF_PROMPT, DEBRIEF_SCHEMA } from './prompts/debrief.js';
import type { ServerProblem } from './types.js';

const PORT = Number(process.env.PORT || 3001);

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠  ANTHROPIC_API_KEY is not set — chat, intake and debrief will fail. Copy .env.example to .env.');
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function handleConnection(socket: WebSocket): void {
  const store = new SessionStore();
  let chatBusy = false;
  let runBusy = false;

  const send = (msg: ServerMessage) => {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(msg));
  };

  send({ type: 'session:ready', sessionId: store.session.id, persona: store.session.persona });

  async function handleChat(msg: Extract<ClientMessage, { type: 'chat:send' }>): Promise<void> {
    if (chatBusy) {
      send({ type: 'chat:error', message: 'Still responding to the previous message.' });
      return;
    }
    chatBusy = true;
    try {
      // The chat payload carries the authoritative editor state — never trust
      // the debounced copy at the moment the user asks a question.
      store.updateEditor(msg.buffer, msg.selection, msg.cursor);
      const latestEdit = store.recordEditBoundary();
      const context = assembleContext(store.session, msg.content, latestEdit);

      store.addTurn({ role: 'user', content: msg.content, at: Date.now(), persona: store.session.persona });

      const { text, usage } = await streamChat({
        ...context,
        onDelta: (t) => send({ type: 'chat:delta', text: t }),
      });

      const turn: Turn = { role: 'assistant', content: text, at: Date.now(), persona: store.session.persona };
      store.addTurn(turn);
      store.recordUsage(usage);
      store.save();
      send({ type: 'chat:done', turn });

      maybeCompact(store.session)
        .then((compactUsage) => {
          if (compactUsage) {
            store.recordUsage(compactUsage);
            store.save();
          }
        })
        .catch((err) => console.error('compaction failed:', err));
    } catch (err) {
      send({ type: 'chat:error', message: errorMessage(err) });
    } finally {
      chatBusy = false;
    }
  }

  async function handleRun(msg: Extract<ClientMessage, { type: 'run' }>): Promise<void> {
    if (runBusy) return;
    runBusy = true;
    try {
      store.updateEditor(msg.buffer, store.session.selection, store.session.cursor);
      send({ type: 'build:status', status: 'compiling' });
      const { build, tests } = await compileAndRun(store.session);
      store.recordBuild(build);
      if (tests) store.recordTests(tests);
      store.save();
      send({ type: 'build:result', result: build });
      if (tests) send({ type: 'tests:result', result: tests });
    } catch (err) {
      send({ type: 'build:result', result: { status: 'error', stderr: errorMessage(err), stdout: '' } });
    } finally {
      runBusy = false;
    }
  }

  async function handleIntake(msg: Extract<ClientMessage, { type: 'problem:intake' }>): Promise<void> {
    try {
      const { data, usage } = await structuredCall<ServerProblem>({
        purpose: 'intake',
        system: INTAKE_PROMPT,
        userContent: msg.raw,
        schema: INTAKE_SCHEMA as unknown as Record<string, unknown>,
      });
      store.setProblem(data);
      store.recordUsage(usage);
      store.save();
      // Strip brief/tests/harness here, in the handler — never rely on the
      // React layer to hide them (§15).
      const { brief: _brief, tests: _tests, harness: _harness, ...clientProblem } = data;
      send({ type: 'problem:ready', problem: clientProblem, buffer: data.signature });
    } catch (err) {
      send({ type: 'problem:error', message: errorMessage(err) });
    }
  }

  async function handleEnd(): Promise<void> {
    try {
      const s = store.session;
      const minutesIn = (at: number) => `${Math.round((at - s.startedAt) / 60_000)}m`;
      const payload = {
        problem: s.problem
          ? { title: s.problem.title, statement: s.problem.statement, brief: s.problem.brief }
          : null,
        transcript: s.turns.map((t) => ({
          at: minutesIn(t.at),
          role: t.role,
          persona: t.persona,
          content: t.content,
        })),
        edits: s.edits.map((e) => e.summary),
        finalBuffer: s.buffer,
        build: s.build.status,
        tests: s.tests ? { passed: s.tests.passed, total: s.tests.total } : null,
        durationMinutes: Math.round((Date.now() - s.startedAt) / 60_000),
      };
      const { data, usage } = await structuredCall<Debrief>({
        purpose: 'debrief',
        system: DEBRIEF_PROMPT,
        userContent: JSON.stringify(payload, null, 2),
        schema: DEBRIEF_SCHEMA as unknown as Record<string, unknown>,
      });
      store.recordUsage(usage);
      (store.session as unknown as Record<string, unknown>).debrief = data;
      store.save();
      send({ type: 'debrief:ready', debrief: data });
    } catch (err) {
      send({ type: 'debrief:error', message: errorMessage(err) });
    }
  }

  socket.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(String(raw)) as ClientMessage;
    } catch {
      return;
    }
    switch (msg.type) {
      case 'editor:state':
        store.updateEditor(msg.buffer, msg.selection, msg.cursor);
        break;
      case 'chat:send':
        void handleChat(msg);
        break;
      case 'run':
        void handleRun(msg);
        break;
      case 'problem:intake':
        void handleIntake(msg);
        break;
      case 'persona:set':
        store.setPersona(msg.persona);
        store.save();
        break;
      case 'session:end':
        void handleEnd();
        break;
    }
  });

  socket.on('close', () => store.save());
}

const fastify = Fastify({ logger: false });
fastify.get('/health', async () => ({ ok: true }));

await fastify.listen({ port: PORT, host: '127.0.0.1' });
const wss = new WebSocketServer({ server: fastify.server, path: '/ws' });
wss.on('connection', handleConnection);
console.log(`practice-ide server listening on http://127.0.0.1:${PORT} (ws at /ws)`);
