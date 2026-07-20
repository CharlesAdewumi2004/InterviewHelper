import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import type { BuildResult, Cursor, Persona, Selection, TestsResult, Turn } from '../../shared/protocol';
import type { EditSummary, ServerProblem, Session, UsageEntry } from './types.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SESSIONS_DIR = path.join(REPO_ROOT, 'sessions');

const DEFAULT_BUFFER = `#include <bits/stdc++.h>
using namespace std;

// Paste a rough problem into the left pane to generate a stub and tests,
// or just write code here and hit Ctrl/Cmd+Enter to compile and run.

int main() {
    cout << "hello" << endl;
    return 0;
}
`;

export class SessionStore {
  session: Session;
  // Snapshot of the buffer at the last turn boundary — memory only, never
  // enters model context (§6.2). Used to produce mechanical edit summaries.
  private lastTurnBuffer: string;
  private lastErrorSignature: string | null = null;

  constructor() {
    this.session = {
      id: `${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}`,
      startedAt: Date.now(),
      persona: 'interviewer',
      problem: null,
      buffer: DEFAULT_BUFFER,
      language: 'cpp',
      selection: null,
      cursor: { line: 1, column: 1 },
      build: { status: 'clean', stderr: null, at: 0 },
      lastBuild: null,
      consecutiveBuildFailures: 0,
      tests: null,
      turns: [],
      edits: [],
      usage: [],
      compactSummary: null,
      compactedThrough: 0,
    };
    this.lastTurnBuffer = this.session.buffer;
  }

  updateEditor(buffer: string, selection: Selection | null, cursor: Cursor): void {
    this.session.buffer = buffer;
    this.session.selection = selection;
    this.session.cursor = cursor;
  }

  setPersona(persona: Persona): void {
    this.session.persona = persona;
  }

  setProblem(problem: ServerProblem): void {
    this.session.problem = problem;
    this.session.buffer = problem.signature;
    this.session.selection = null;
    this.session.cursor = { line: 1, column: 1 };
    this.session.build = { status: 'clean', stderr: null, at: 0 };
    this.session.lastBuild = null;
    this.session.consecutiveBuildFailures = 0;
    this.session.tests = null;
    this.lastTurnBuffer = problem.signature;
    this.lastErrorSignature = null;
  }

  // Called just before a user message enters history: if the buffer changed
  // since the previous turn boundary, record a ~15-token mechanical summary.
  recordEditBoundary(): EditSummary | null {
    const prev = this.lastTurnBuffer;
    const next = this.session.buffer;
    if (prev === next) return null;

    const prevLines = prev.split('\n');
    const nextLines = next.split('\n');
    let start = 0;
    while (start < prevLines.length && start < nextLines.length && prevLines[start] === nextLines[start]) {
      start++;
    }
    let endPrev = prevLines.length - 1;
    let endNext = nextLines.length - 1;
    while (endPrev >= start && endNext >= start && prevLines[endPrev] === nextLines[endNext]) {
      endPrev--;
      endNext--;
    }

    const delta = next.length - prev.length;
    const deltaStr = `${delta >= 0 ? '+' : ''}${delta} chars`;
    let linesTouched: [number, number] | null;
    let summary: string;
    if (endNext < start) {
      linesTouched = null;
      summary = `removed lines around ${start + 1} (${deltaStr})`;
    } else {
      linesTouched = [start + 1, endNext + 1];
      summary =
        start === endNext
          ? `modified line ${start + 1} (${deltaStr})`
          : `modified lines ${start + 1}-${endNext + 1} (${deltaStr})`;
    }

    const edit: EditSummary = {
      atTurn: this.session.turns.length,
      linesTouched,
      netCharDelta: delta,
      summary,
    };
    this.session.edits.push(edit);
    this.lastTurnBuffer = next;
    return edit;
  }

  addTurn(turn: Turn): void {
    this.session.turns.push(turn);
  }

  recordBuild(result: BuildResult): void {
    this.session.lastBuild = result;
    this.session.build = {
      status: result.status,
      stderr: result.status === 'error' || result.stderr ? result.stderr : null,
      at: Date.now(),
    };
    if (result.status === 'error') {
      const signature = result.stderr.split('\n')[0]?.trim() ?? '';
      this.session.consecutiveBuildFailures =
        signature && signature === this.lastErrorSignature ? this.session.consecutiveBuildFailures + 1 : 1;
      this.lastErrorSignature = signature;
    } else {
      this.session.consecutiveBuildFailures = 0;
      this.lastErrorSignature = null;
    }
  }

  recordTests(result: TestsResult): void {
    this.session.tests = { ...result, at: Date.now() };
  }

  recordUsage(entry: UsageEntry): void {
    this.session.usage.push(entry);
  }

  save(): void {
    try {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(SESSIONS_DIR, `${this.session.id}.json`),
        JSON.stringify(this.session, null, 2),
      );
    } catch (err) {
      console.error('failed to persist session:', err);
    }
  }
}
