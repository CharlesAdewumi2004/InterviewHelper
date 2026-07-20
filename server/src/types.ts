import type {
  BuildResult,
  ClientProblem,
  Cursor,
  Persona,
  Selection,
  TestsResult,
  Turn,
} from '../../shared/protocol';

export interface TestCase {
  input: string;
  expected: string;
}

// Full problem, server-side only. `brief` is never sent to the client;
// `tests` and `harness` feed the runner.
export interface ServerProblem extends ClientProblem {
  brief: string;
  tests: TestCase[];
  harness: string;
}

export interface EditSummary {
  atTurn: number;
  linesTouched: [number, number] | null;
  netCharDelta: number;
  summary: string;
}

export interface UsageEntry {
  at: number;
  purpose: 'chat' | 'intake' | 'debrief' | 'compact';
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface BuildState {
  status: 'clean' | 'compiling' | 'error' | 'ok';
  stderr: string | null;
  at: number;
}

export interface Session {
  id: string;
  startedAt: number;
  persona: Persona;
  problem: ServerProblem | null;
  buffer: string;
  language: 'cpp';
  selection: Selection | null;
  cursor: Cursor;
  build: BuildState;
  lastBuild: BuildResult | null;
  consecutiveBuildFailures: number;
  tests: (TestsResult & { at: number }) | null;
  turns: Turn[];
  edits: EditSummary[];
  usage: UsageEntry[];
  // History compaction (§6.2): turns[0..compactedThrough) are represented by
  // compactSummary instead of being sent verbatim.
  compactSummary: string | null;
  compactedThrough: number;
}
