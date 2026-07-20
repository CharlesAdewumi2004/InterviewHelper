import { useEffect, useState } from 'react';
import type { EditorMode, Persona } from '../../../shared/protocol';

interface Props {
  persona: Persona;
  mode: EditorMode;
  compiling: boolean;
  connected: boolean;
  startedAt: number;
  endingSession: boolean;
  onPersona: (p: Persona) => void;
  onMode: (m: EditorMode) => void;
  onRun: () => void;
  onEndSession: () => void;
}

function useElapsed(startedAt: number): string {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const total = Math.max(0, Math.floor((now - startedAt) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded border border-neutral-700 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={
            o.value === value
              ? 'bg-blue-700 px-2.5 py-1 font-medium text-white'
              : 'bg-neutral-900 px-2.5 py-1 text-neutral-400 hover:bg-neutral-800'
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Toolbar(props: Props) {
  const elapsed = useElapsed(props.startedAt);
  return (
    <div className="flex items-center gap-3 border-b border-neutral-800 bg-neutral-900 px-3 py-2">
      <span className="text-sm font-semibold tracking-tight text-neutral-200">Practice IDE</span>
      <span className="font-mono text-xs text-neutral-500">{elapsed}</span>
      <span
        className={`h-2 w-2 rounded-full ${props.connected ? 'bg-green-500' : 'bg-red-500'}`}
        title={props.connected ? 'connected' : 'disconnected'}
      />

      <div className="flex-1" />

      <Segmented
        value={props.persona}
        options={[
          { value: 'interviewer', label: 'Interviewer' },
          { value: 'tutor', label: 'Tutor' },
        ]}
        onChange={props.onPersona}
      />

      <Segmented
        value={props.mode}
        options={[
          { value: 'interview', label: 'Interview mode' },
          { value: 'study', label: 'Study mode' },
        ]}
        onChange={props.onMode}
      />

      <button
        onClick={props.onRun}
        disabled={props.compiling}
        className="rounded bg-green-700 px-3 py-1 text-sm font-medium hover:bg-green-600 disabled:opacity-40"
        title="Ctrl/Cmd+Enter"
      >
        {props.compiling ? 'Compiling…' : '▶ Run'}
      </button>

      <button
        onClick={props.onEndSession}
        disabled={props.endingSession}
        className="rounded bg-neutral-700 px-3 py-1 text-sm hover:bg-neutral-600 disabled:opacity-40"
      >
        {props.endingSession ? 'Debriefing…' : 'End session'}
      </button>
    </div>
  );
}
