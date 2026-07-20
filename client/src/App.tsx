import { useCallback, useRef, useState } from 'react';
import type {
  BloombergDebrief,
  BuildResult,
  ClientProblem,
  Debrief,
  EditorMode,
  Persona,
  ServerMessage,
  TestsResult,
  Turn,
} from '../../shared/protocol';
import { useSocket } from './hooks/useSocket';
import Editor, { type EditorApi } from './components/Editor';
import ChatPane from './components/ChatPane';
import ProblemPane from './components/ProblemPane';
import Console from './components/Console';
import Toolbar from './components/Toolbar';
import DebriefView from './components/DebriefView';
import BloombergDebriefView from './components/BloombergDebriefView';

type DebriefState =
  | { kind: 'standard'; data: Debrief }
  | { kind: 'bloomberg'; data: BloombergDebrief }
  | null;

export default function App() {
  const [persona, setPersona] = useState<Persona>('interviewer');
  const [mode, setMode] = useState<EditorMode>('interview');
  const [problem, setProblem] = useState<ClientProblem | null>(null);
  const [intakeLoading, setIntakeLoading] = useState(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [streamText, setStreamText] = useState<string | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [compiling, setCompiling] = useState(false);
  const [build, setBuild] = useState<BuildResult | null>(null);
  const [tests, setTests] = useState<TestsResult | null>(null);

  const [startedAt, setStartedAt] = useState(Date.now());
  const [endingSession, setEndingSession] = useState(false);
  const [debrief, setDebrief] = useState<DebriefState>(null);

  const editorApiRef = useRef<EditorApi | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);

  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'session:ready':
        // Fresh session (first connect or reconnect): reset client state.
        setStartedAt(Date.now());
        setPersona(msg.persona);
        setTurns([]);
        setStreamText(null);
        setDebrief(null);
        break;
      case 'problem:ready':
        setIntakeLoading(false);
        setIntakeError(null);
        setProblem(msg.problem);
        setBuild(null);
        setTests(null);
        editorApiRef.current?.setValue(msg.buffer);
        break;
      case 'problem:error':
        setIntakeLoading(false);
        setIntakeError(msg.message);
        break;
      case 'chat:delta':
        setStreamText((prev) => (prev ?? '') + msg.text);
        break;
      case 'chat:done':
        setStreamText(null);
        setChatBusy(false);
        setTurns((prev) => [...prev, msg.turn]);
        break;
      case 'chat:error':
        setStreamText(null);
        setChatBusy(false);
        setChatError(msg.message);
        break;
      case 'build:status':
        setCompiling(true);
        setTests(null);
        break;
      case 'build:result':
        setCompiling(false);
        setBuild(msg.result);
        break;
      case 'tests:result':
        setTests(msg.result);
        break;
      case 'debrief:ready':
        setEndingSession(false);
        setDebrief({ kind: 'standard', data: msg.debrief });
        break;
      case 'debrief:bloomberg':
        setEndingSession(false);
        setDebrief({ kind: 'bloomberg', data: msg.debrief });
        break;
      case 'debrief:error':
        setEndingSession(false);
        setChatError(`Debrief failed: ${msg.message}`);
        break;
    }
  }, []);

  const { send, connected } = useSocket(handleMessage);

  const handleRun = useCallback(() => {
    const state = editorApiRef.current?.getState();
    if (!state) return;
    send({ type: 'run', buffer: state.buffer });
  }, [send]);

  const handleChatSend = useCallback(
    (content: string) => {
      const state = editorApiRef.current?.getState();
      if (!state) return;
      setChatError(null);
      setChatBusy(true);
      setStreamText('');
      setTurns((prev) => [...prev, { role: 'user', content, at: Date.now(), persona }]);
      // Bundle the live editor state so the model never sees a stale buffer.
      send({ type: 'chat:send', content, ...state });
    },
    [send, persona],
  );

  const handlePersona = useCallback(
    (p: Persona) => {
      setPersona(p);
      send({ type: 'persona:set', persona: p });
    },
    [send],
  );

  const handleIntake = useCallback(
    (raw: string) => {
      setIntakeLoading(true);
      setIntakeError(null);
      send({ type: 'problem:intake', raw });
    },
    [send],
  );

  const handleEndSession = useCallback(() => {
    setEndingSession(true);
    send({ type: 'session:end' });
  }, [send]);

  return (
    <div className="flex h-full flex-col">
      <Toolbar
        persona={persona}
        mode={mode}
        compiling={compiling}
        connected={connected}
        startedAt={startedAt}
        endingSession={endingSession}
        onPersona={handlePersona}
        onMode={setMode}
        onRun={handleRun}
        onEndSession={handleEndSession}
      />

      <div className="flex min-h-0 flex-1">
        <div className="w-[22%] min-w-[260px] border-r border-neutral-800">
          <ProblemPane problem={problem} loading={intakeLoading} error={intakeError} onIntake={handleIntake} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-[3]">
            <Editor
              mode={mode}
              onState={(state) => send({ type: 'editor:state', ...state })}
              onRun={handleRun}
              onFocusChat={() => chatInputRef.current?.focus()}
              onReady={(api) => (editorApiRef.current = api)}
            />
          </div>
          <div className="min-h-0 flex-1 border-t border-neutral-800">
            <Console compiling={compiling} build={build} tests={tests} />
          </div>
        </div>

        <div className="w-[28%] min-w-[300px] border-l border-neutral-800">
          <ChatPane
            turns={turns}
            streamText={streamText}
            busy={chatBusy}
            error={chatError}
            persona={persona}
            inputRef={chatInputRef}
            onSend={handleChatSend}
          />
        </div>
      </div>

      {debrief?.kind === 'standard' && <DebriefView debrief={debrief.data} onClose={() => setDebrief(null)} />}
      {debrief?.kind === 'bloomberg' && (
        <BloombergDebriefView debrief={debrief.data} onClose={() => setDebrief(null)} />
      )}
    </div>
  );
}
