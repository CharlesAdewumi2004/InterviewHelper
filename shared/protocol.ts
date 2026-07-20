// WebSocket protocol shared between client and server.

export type Persona = 'interviewer' | 'tutor';
export type EditorMode = 'interview' | 'study';

export interface Selection {
  startLine: number;
  endLine: number;
  text: string;
}

export interface Cursor {
  line: number;
  column: number;
}

export interface Example {
  input: string;
  output: string;
  note: string;
}

// The problem as the client sees it — the hidden brief, tests and harness are
// stripped server-side before this ever crosses the socket.
export interface ClientProblem {
  title: string;
  statement: string;
  constraints: string[];
  examples: Example[];
  signature: string;
}

export interface BuildResult {
  status: 'ok' | 'error';
  stderr: string;
  stdout: string;
}

export interface TestFailure {
  index: number;
  input: string;
  expected: string;
  actual: string;
}

export interface TestsResult {
  passed: number;
  total: number;
  failures: TestFailure[];
}

export interface Turn {
  role: 'user' | 'assistant';
  content: string;
  at: number;
  persona: Persona;
}

export interface DebriefScores {
  communication: number;
  problem_solving: number;
  code_quality: number;
  complexity_analysis: number;
  testing: number;
}

export interface Debrief {
  verdict: string;
  scores: DebriefScores;
  strengths: string[];
  gaps: string[];
  moments: { at: string; note: string }[];
  drill: string;
}

export type ClientMessage =
  | { type: 'problem:intake'; raw: string }
  | { type: 'editor:state'; buffer: string; selection: Selection | null; cursor: Cursor }
  // chat:send and run carry the buffer so the backend never acts on a stale
  // debounced copy — the payload is authoritative at that instant.
  | { type: 'chat:send'; content: string; buffer: string; selection: Selection | null; cursor: Cursor }
  | { type: 'run'; buffer: string }
  | { type: 'persona:set'; persona: Persona }
  | { type: 'session:end' };

export type ServerMessage =
  | { type: 'session:ready'; sessionId: string; persona: Persona }
  | { type: 'problem:ready'; problem: ClientProblem; buffer: string }
  | { type: 'problem:error'; message: string }
  | { type: 'chat:delta'; text: string }
  | { type: 'chat:done'; turn: Turn }
  | { type: 'chat:error'; message: string }
  | { type: 'build:status'; status: 'compiling' }
  | { type: 'build:result'; result: BuildResult }
  | { type: 'tests:result'; result: TestsResult }
  | { type: 'debrief:ready'; debrief: Debrief }
  | { type: 'debrief:error'; message: string };
