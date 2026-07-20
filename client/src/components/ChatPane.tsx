import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Persona, Turn } from '../../../shared/protocol';

interface Props {
  turns: Turn[];
  streamText: string | null;
  busy: boolean;
  error: string | null;
  persona: Persona;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onSend: (content: string) => void;
}

// Minimal markdown: fenced code blocks render as <pre>, everything else as
// pre-wrapped text. Enough for tutor snippets without a markdown dependency.
function renderContent(content: string) {
  const parts = content.split(/```(?:\w*\n)?/);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <pre key={i} className="my-2 overflow-x-auto rounded bg-black/40 p-2 font-mono text-xs leading-relaxed">
        {part.replace(/\n$/, '')}
      </pre>
    ) : (
      <span key={i} className="whitespace-pre-wrap">
        {part}
      </span>
    ),
  );
}

function personaLabel(p: Persona): string {
  return p === 'interviewer' ? 'Interviewer' : 'Tutor';
}

export default function ChatPane({ turns, streamText, busy, error, persona, inputRef, onSend }: Props) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, streamText]);

  const submit = () => {
    const content = draft.trim();
    if (!content || busy) return;
    setDraft('');
    onSend(content);
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {turns.length === 0 && !streamText && (
          <p className="text-sm text-neutral-500">
            Talk to the {personaLabel(persona).toLowerCase()} — they can already see your code, build status and
            test results. No need to paste anything.
          </p>
        )}
        {turns.map((t, i) => (
          <div key={i} className={t.role === 'user' ? 'text-right' : ''}>
            <div
              className={
                t.role === 'user'
                  ? 'inline-block max-w-[90%] rounded-lg bg-blue-900/60 px-3 py-2 text-left text-sm'
                  : 'inline-block max-w-[95%] rounded-lg bg-neutral-800 px-3 py-2 text-sm'
              }
            >
              {t.role === 'assistant' && (
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  {personaLabel(t.persona)}
                </div>
              )}
              {renderContent(t.content)}
            </div>
          </div>
        ))}
        {streamText !== null && (
          <div>
            <div className="inline-block max-w-[95%] rounded-lg bg-neutral-800 px-3 py-2 text-sm">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                {personaLabel(persona)}
              </div>
              {renderContent(streamText)}
              <span className="animate-pulse">▌</span>
            </div>
          </div>
        )}
        {error && <div className="rounded bg-red-900/40 px-3 py-2 text-sm text-red-300">{error}</div>}
      </div>
      <div className="border-t border-neutral-800 p-2">
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={busy ? 'Waiting for response…' : 'Ask a question (Enter to send, Shift+Enter for newline)'}
          rows={2}
          className="w-full resize-none rounded border border-neutral-700 bg-neutral-900 p-2 text-sm outline-none focus:border-blue-600"
        />
      </div>
    </div>
  );
}
