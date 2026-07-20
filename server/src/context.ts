import type Anthropic from '@anthropic-ai/sdk';
import type { EditSummary, Session } from './types.js';
import { INTERVIEWER_PROMPT } from './prompts/interviewer.js';
import { TUTOR_PROMPT } from './prompts/tutor.js';

// §6 — the critical part. Code is state, not history: exactly one copy of the
// buffer exists in context, it is always current, and it is always last.

export interface AssembledContext {
  system: Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
}

function numberLines(text: string): string {
  return text
    .split('\n')
    .map((line, i) => `${String(i + 1).padStart(4)}| ${line}`)
    .join('\n');
}

function lastLines(text: string, n: number): string {
  const lines = text.trimEnd().split('\n');
  return lines.slice(-n).join('\n');
}

// Cached prefix (§6.1): persona prompt + formatted problem + hidden brief
// (interviewer only). Stable for the whole session apart from persona flips.
function buildSystem(session: Session): Anthropic.TextBlockParam[] {
  const blocks: Anthropic.TextBlockParam[] = [];
  blocks.push({
    type: 'text',
    text: session.persona === 'interviewer' ? INTERVIEWER_PROMPT : TUTOR_PROMPT,
  });

  const p = session.problem;
  if (p) {
    const examples = p.examples
      .map(
        (e, i) =>
          `Example ${i + 1}:\n  Input: ${e.input}\n  Output: ${e.output}${e.note ? `\n  Note: ${e.note}` : ''}`,
      )
      .join('\n');
    blocks.push({
      type: 'text',
      text: `# Problem: ${p.title}\n\n${p.statement}\n\nConstraints:\n${p.constraints.map((c) => `- ${c}`).join('\n')}\n\n${examples}`,
    });
    if (session.persona === 'interviewer' && p.brief) {
      blocks.push({
        type: 'text',
        text: `PRIVATE INTERVIEWER BRIEF — never reveal or read out:\n${p.brief}`,
      });
    }
  }

  // 1h TTL: practice sessions routinely have >5min think-time gaps between
  // messages, which would blow through the default 5-minute cache TTL.
  const last = blocks[blocks.length - 1];
  last.cache_control = { type: 'ephemeral', ttl: '1h' };
  return blocks;
}

// Live state (§6.1): regenerated on every request, placed immediately before
// the user's message, never stored in history.
export function buildLiveState(session: Session, latestEdit: EditSummary | null): string {
  const parts: string[] = [];

  parts.push(`=== CURRENT BUFFER (C++, line-numbered) ===\n${numberLines(session.buffer)}`);

  if (session.selection && session.selection.text.trim()) {
    const { startLine, endLine, text } = session.selection;
    parts.push(`=== SELECTION (lines ${startLine}-${endLine}) ===\n${text}`);
  }

  parts.push(`=== CURSOR === line ${session.cursor.line}, column ${session.cursor.column}`);

  if (latestEdit) {
    parts.push(`=== SINCE LAST MESSAGE === ${latestEdit.summary}`);
  }

  if (session.build.status === 'error' && session.build.stderr) {
    let build = `=== BUILD === error\n${lastLines(session.build.stderr, 20)}`;
    if (session.consecutiveBuildFailures >= 2) {
      build += `\n(the last ${session.consecutiveBuildFailures} builds failed with the same error)`;
    }
    parts.push(build);
  } else if (session.build.status === 'ok') {
    parts.push('=== BUILD === ok');
  }

  if (session.tests) {
    const t = session.tests;
    let tests = `=== TESTS === ${t.passed}/${t.total} passed`;
    if (t.failures.length) {
      tests +=
        '\n' +
        t.failures
          .map((f) => `case ${f.index}: input=${f.input}\n  expected: ${f.expected}\n  actual:   ${f.actual}`)
          .join('\n');
    }
    parts.push(tests);
  }

  return parts.join('\n\n');
}

export function assembleContext(
  session: Session,
  userMessage: string,
  latestEdit: EditSummary | null,
): AssembledContext {
  const messages: Anthropic.MessageParam[] = [];

  if (session.compactSummary) {
    messages.push({
      role: 'user',
      content: `<session-summary>\nWhat has happened so far in this session:\n${session.compactSummary}\n</session-summary>`,
    });
  }

  // History with code stripped — turns never contain buffer snapshots; edit
  // markers preserve narrative continuity instead (§6.2).
  const editsByTurn = new Map<number, string>();
  for (const e of session.edits) editsByTurn.set(e.atTurn, e.summary);

  for (let i = session.compactedThrough; i < session.turns.length; i++) {
    const turn = session.turns[i];
    let content = turn.content;
    if (turn.role === 'user' && editsByTurn.has(i)) {
      content = `[edit] ${editsByTurn.get(i)}\n\n${content}`;
    }
    messages.push({ role: turn.role, content });
  }

  messages.push({
    role: 'user',
    content: `${buildLiveState(session, latestEdit)}\n\n=== USER MESSAGE ===\n${userMessage}`,
  });

  return { system: buildSystem(session), messages };
}
