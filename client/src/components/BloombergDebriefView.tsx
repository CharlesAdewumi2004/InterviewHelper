import type { BloombergDebrief } from '../../../shared/protocol';

interface Props {
  debrief: BloombergDebrief;
  onClose: () => void;
}

const REC_COLORS: Record<BloombergDebrief['recommendation'], string> = {
  'strong hire': 'bg-green-800 text-green-100',
  hire: 'bg-green-900 text-green-200',
  'no hire': 'bg-red-900 text-red-200',
  'strong no hire': 'bg-red-800 text-red-100',
};

export default function BloombergDebriefView({ debrief, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900 p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">Bloomberg mock — scorecard</h2>
            <span
              className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${REC_COLORS[debrief.recommendation]}`}
            >
              {debrief.recommendation}
            </span>
            <span className="ml-2 text-xs text-neutral-500">confidence: {debrief.confidence}</span>
          </div>
          <button onClick={onClose} className="rounded bg-neutral-800 px-3 py-1 text-sm hover:bg-neutral-700">
            Close
          </button>
        </div>

        <section className="mb-4">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Evidence</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-neutral-300">
            {debrief.evidence.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </section>

        <section className="mb-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Axis scores</h3>
          {debrief.axes.map((a) => (
            <div key={a.axis} className="flex items-start gap-3 rounded bg-neutral-800 p-2">
              <div className="w-14 shrink-0 text-center">
                <div className="text-xl font-bold text-blue-400">{a.score}/4</div>
                <div className="text-[10px] text-neutral-500">Axis {a.axis}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-neutral-200">{a.name}</div>
                <div className="text-xs text-neutral-400">{a.evidence}</div>
              </div>
            </div>
          ))}
        </section>

        <section className="mb-4 rounded border border-red-900 bg-red-950/30 p-3">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-400">Biggest interview risk</h3>
          <p className="text-sm text-neutral-200">{debrief.biggest_risk}</p>
        </section>

        <section className="mb-4 rounded bg-neutral-800 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">One rewrite</h3>
          <p className="mb-2 border-l-2 border-red-700 pl-2 text-sm italic text-neutral-400">
            {debrief.rewrite.original}
          </p>
          <p className="border-l-2 border-green-700 pl-2 text-sm text-neutral-200">{debrief.rewrite.improved}</p>
        </section>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <section className="rounded border border-blue-900 bg-blue-950/40 p-3">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-400">
              Highest-leverage fix
            </h3>
            <p className="text-sm text-neutral-200">{debrief.highest_leverage_fix}</p>
          </section>
          <section className="rounded border border-blue-900 bg-blue-950/40 p-3">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-400">Next drill</h3>
            <p className="text-sm text-neutral-200">{debrief.next_drill}</p>
          </section>
        </div>

        {debrief.hints.length > 0 && (
          <section className="mb-4">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Hints given</h3>
            <ul className="space-y-1 text-sm text-neutral-300">
              {debrief.hints.map((h, i) => (
                <li key={i}>
                  <span className="text-neutral-400">“{h.hint}”</span> — {h.uptake}
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-sm text-neutral-400">
          <span className="font-semibold text-neutral-300">Decision-relevant observation: </span>
          {debrief.decision_observation}
        </p>
      </div>
    </div>
  );
}
