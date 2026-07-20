import { useState } from 'react';
import type { ClientProblem } from '../../../shared/protocol';

interface Props {
  problem: ClientProblem | null;
  loading: boolean;
  error: string | null;
  onIntake: (raw: string) => void;
}

export default function ProblemPane({ problem, loading, error, onIntake }: Props) {
  const [raw, setRaw] = useState('');
  const [showIntake, setShowIntake] = useState(false);

  if (!problem || showIntake) {
    return (
      <div className="flex h-full flex-col gap-2 p-3">
        <h2 className="text-sm font-semibold text-neutral-300">New problem</h2>
        <p className="text-xs text-neutral-500">
          Paste a rough problem — a LeetCode description, a note from a friend, anything. It gets formatted into a
          statement, a starting stub and test cases.
        </p>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Design a data structure for an LRU cache…"
          className="min-h-0 flex-1 resize-none rounded border border-neutral-700 bg-neutral-900 p-2 text-sm outline-none focus:border-blue-600"
        />
        {error && <div className="rounded bg-red-900/40 px-2 py-1 text-xs text-red-300">{error}</div>}
        <div className="flex gap-2">
          <button
            onClick={() => raw.trim() && onIntake(raw.trim())}
            disabled={loading || !raw.trim()}
            className="rounded bg-blue-700 px-3 py-1.5 text-sm font-medium hover:bg-blue-600 disabled:opacity-40"
          >
            {loading ? 'Formatting…' : 'Format problem'}
          </button>
          {problem && (
            <button
              onClick={() => setShowIntake(false)}
              className="rounded bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700"
            >
              Back
            </button>
          )}
        </div>
        {loading && (
          <p className="text-xs text-neutral-500">Generating statement, stub, tests and harness… (~20s)</p>
        )}
      </div>
    );
  }

  return (
    <div className="h-full space-y-3 overflow-y-auto p-3">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold text-neutral-100">{problem.title}</h2>
        <button
          onClick={() => setShowIntake(true)}
          className="shrink-0 rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-700"
        >
          New problem
        </button>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">{problem.statement}</p>
      {problem.constraints.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Constraints</h3>
          <ul className="space-y-0.5 text-sm text-neutral-400">
            {problem.constraints.map((c, i) => (
              <li key={i} className="font-mono text-xs">
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
      {problem.examples.map((ex, i) => (
        <div key={i} className="rounded bg-neutral-900 p-2">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Example {i + 1}</h3>
          <pre className="whitespace-pre-wrap font-mono text-xs text-neutral-300">
            {`Input:  ${ex.input}\nOutput: ${ex.output}`}
            {ex.note ? `\n${ex.note}` : ''}
          </pre>
        </div>
      ))}
    </div>
  );
}
