import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { BuildResult, TestFailure, TestsResult } from '../../shared/protocol';
import type { Session } from './types.js';

const COMPILE_TIMEOUT_MS = 10_000;
const EXEC_TIMEOUT_MS = 5_000;

interface ProcResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

function runProcess(
  cmd: string,
  args: string[],
  opts: { cwd: string; timeoutMs: number; env?: NodeJS.ProcessEnv },
): Promise<ProcResult> {
  return new Promise((resolve) => {
    // detached → own process group, so on timeout we can kill the whole group
    // (§10: kill the process group, not just the child).
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const cap = (s: string) => (s.length > 100_000 ? s.slice(0, 100_000) + '\n[output truncated]' : s);
    child.stdout.on('data', (d) => (stdout = cap(stdout + d)));
    child.stderr.on('data', (d) => (stderr = cap(stderr + d)));

    const timer = setTimeout(() => {
      timedOut = true;
      if (child.pid) {
        try {
          process.kill(-child.pid, 'SIGKILL');
        } catch {
          child.kill('SIGKILL');
        }
      }
    }, opts.timeoutMs);

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: null, stdout, stderr: stderr + `\n${err.message}`, timedOut });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
}

function parseTestOutput(stdout: string, session: Session): { tests: TestsResult; programOutput: string } {
  const cases = session.problem?.tests ?? [];
  const results = new Map<number, boolean>();
  const failures: TestFailure[] = [];
  const programLines: string[] = [];

  let pendingFail: TestFailure | null = null;
  for (const line of stdout.split('\n')) {
    const caseMatch = line.match(/^###CASE (\d+) (PASS|FAIL)$/);
    if (caseMatch) {
      const index = Number(caseMatch[1]);
      const passed = caseMatch[2] === 'PASS';
      results.set(index, passed);
      if (!passed) {
        pendingFail = {
          index,
          input: cases[index]?.input ?? '',
          expected: cases[index]?.expected ?? '',
          actual: '',
        };
        failures.push(pendingFail);
      }
      continue;
    }
    if (line.startsWith('###EXPECTED ') && pendingFail) {
      pendingFail.expected = line.slice('###EXPECTED '.length);
      continue;
    }
    if (line.startsWith('###ACTUAL ') && pendingFail) {
      pendingFail.actual = line.slice('###ACTUAL '.length);
      continue;
    }
    if (line.startsWith('###')) continue; // ###DONE and anything stray
    programLines.push(line);
  }

  // Crash or timeout before all cases ran: flag the first case that never
  // reported, so the model and console both see where it died.
  if (results.size < cases.length) {
    for (let i = 0; i < cases.length; i++) {
      if (!results.has(i)) {
        failures.push({
          index: i,
          input: cases[i].input,
          expected: cases[i].expected,
          actual: '(crashed or timed out before this case ran)',
        });
        break;
      }
    }
  }

  const passed = [...results.values()].filter(Boolean).length;
  return {
    tests: { passed, total: cases.length, failures },
    programOutput: programLines.join('\n').trim(),
  };
}

export async function compileAndRun(
  session: Session,
): Promise<{ build: BuildResult; tests: TestsResult | null }> {
  const workDir = path.join(os.tmpdir(), 'practice-ide', session.id);
  fs.mkdirSync(workDir, { recursive: true });

  const problem = session.problem;
  const hasHarness = Boolean(problem && problem.harness && problem.tests.length);

  if (hasHarness && problem) {
    fs.writeFileSync(path.join(workDir, 'solution.hpp'), session.buffer);
    const harness = problem.harness.includes('solution.hpp')
      ? problem.harness
      : `#include "solution.hpp"\n${problem.harness}`;
    fs.writeFileSync(path.join(workDir, 'main.cpp'), harness);
  } else {
    // No problem loaded yet: compile the buffer as a standalone program.
    fs.writeFileSync(path.join(workDir, 'main.cpp'), session.buffer);
  }

  const cxx = process.env.CXX || 'g++';
  const compile = await runProcess(
    cxx,
    ['-std=c++23', '-O2', '-Wall', '-Wextra', '-fsanitize=address,undefined', '-o', 'a.out', 'main.cpp'],
    { cwd: workDir, timeoutMs: COMPILE_TIMEOUT_MS },
  );

  if (compile.timedOut) {
    return { build: { status: 'error', stderr: '[compilation timed out after 10s]', stdout: '' }, tests: null };
  }
  if (compile.code !== 0) {
    return { build: { status: 'error', stderr: compile.stderr.trim(), stdout: '' }, tests: null };
  }

  // ASan reserves ~20TB of virtual address space, so no ulimit -v — cap RSS
  // through ASan itself instead. Leak detection off to match LeetCode
  // semantics (linked-list problems "leak" by design).
  const exec = await runProcess('bash', ['-c', 'ulimit -f 1024; exec ./a.out'], {
    cwd: workDir,
    timeoutMs: EXEC_TIMEOUT_MS,
    env: {
      ASAN_OPTIONS: 'hard_rss_limit_mb=512:detect_leaks=0',
      UBSAN_OPTIONS: 'print_stacktrace=1',
    },
  });

  let runtimeStderr = exec.stderr.trim();
  if (exec.timedOut) {
    runtimeStderr = [runtimeStderr, '[execution timed out after 5s — killed]'].filter(Boolean).join('\n');
  } else if (exec.code !== 0) {
    runtimeStderr = [runtimeStderr, `[process exited with code ${exec.code}]`].filter(Boolean).join('\n');
  }

  if (hasHarness) {
    const { tests, programOutput } = parseTestOutput(exec.stdout, session);
    return {
      build: { status: 'ok', stderr: runtimeStderr, stdout: programOutput },
      tests,
    };
  }

  return {
    build: { status: 'ok', stderr: runtimeStderr, stdout: exec.stdout.trim() },
    tests: null,
  };
}
