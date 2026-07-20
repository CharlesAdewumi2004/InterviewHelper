import type { Debrief } from '../../../shared/protocol';

interface Props {
  debrief: Debrief;
  onClose: () => void;
}

const SCORE_LABELS: { key: keyof Debrief['scores']; label: string }[] = [
  { key: 'communication', label: 'Communication' },
  { key: 'problem_solving', label: 'Problem solving' },
  { key: 'code_quality', label: 'Code quality' },
  { key: 'complexity_analysis', label: 'Complexity analysis' },
  { key: 'testing', label: 'Testing' },
];

export default function DebriefView({ debrief, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900 p-6">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-neutral-100">Session debrief</h2>
          <button onClick={onClose} className="rounded bg-neutral-800 px-3 py-1 text-sm hover:bg-neutral-700">
            Close
          </button>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-neutral-300">{debrief.verdict}</p>

        <div className="mb-4 grid grid-cols-5 gap-2">
          {SCORE_LABELS.map(({ key, label }) => (
            <div key={key} className="rounded bg-neutral-800 p-2 text-center">
              <div className="text-xl font-bold text-blue-400">{debrief.scores[key]}</div>
              <div className="text-[10px] text-neutral-500">{label}</div>
            </div>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-500">Strengths</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-neutral-300">
              {debrief.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-orange-500">Gaps</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-neutral-300">
              {debrief.gaps.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>
        </div>

        {debrief.moments.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Moments</h3>
            <ul className="space-y-1 text-sm text-neutral-300">
              {debrief.moments.map((m, i) => (
                <li key={i}>
                  <span className="mr-2 font-mono text-xs text-neutral-500">{m.at}</span>
                  {m.note}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded border border-blue-900 bg-blue-950/40 p-3">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-400">Next drill</h3>
          <p className="text-sm text-neutral-200">{debrief.drill}</p>
        </div>
      </div>
    </div>
  );
}
