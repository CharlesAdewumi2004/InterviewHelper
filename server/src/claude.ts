import Anthropic from '@anthropic-ai/sdk';
import type { Session, UsageEntry } from './types.js';

export const MODELS = {
  chat: 'claude-sonnet-5',
  heavy: 'claude-opus-4-8',
  compact: 'claude-haiku-4-5',
} as const;

// API key from .env; the client never sees it (§2). SDK retries 429/5xx itself.
const anthropic = new Anthropic({ maxRetries: 2 });

function usageEntry(
  purpose: UsageEntry['purpose'],
  model: string,
  usage: Anthropic.Usage,
): UsageEntry {
  return {
    at: Date.now(),
    purpose,
    model,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
  };
}

export async function streamChat(opts: {
  system: Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
  onDelta: (text: string) => void;
}): Promise<{ text: string; usage: UsageEntry }> {
  const stream = anthropic.messages.stream({
    model: MODELS.chat,
    max_tokens: 8192,
    system: opts.system,
    messages: opts.messages,
  });
  stream.on('text', opts.onDelta);
  const final = await stream.finalMessage();
  if (final.stop_reason === 'refusal') {
    throw new Error('The model declined to respond to this request.');
  }
  const text = final.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return { text, usage: usageEntry('chat', MODELS.chat, final.usage) };
}

export async function structuredCall<T>(opts: {
  purpose: UsageEntry['purpose'];
  system: string;
  userContent: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<{ data: T; usage: UsageEntry }> {
  const response = await anthropic.messages.create({
    model: MODELS.heavy,
    max_tokens: opts.maxTokens ?? 16000,
    system: opts.system,
    messages: [{ role: 'user', content: opts.userContent }],
    output_config: { format: { type: 'json_schema', schema: opts.schema } },
  });
  if (response.stop_reason === 'max_tokens') {
    throw new Error('Model response was truncated — try a shorter problem statement.');
  }
  if (response.stop_reason === 'refusal') {
    throw new Error('The model declined this request.');
  }
  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text ?? '';
  return {
    data: JSON.parse(text) as T,
    usage: usageEntry(opts.purpose, MODELS.heavy, response.usage),
  };
}

// §6.2: past 20 live turns, fold the older ones into a ~150-word summary and
// keep the last 10 verbatim. Runs off the hot path after a turn completes.
export async function maybeCompact(session: Session): Promise<UsageEntry | null> {
  const live = session.turns.length - session.compactedThrough;
  if (live <= 20) return null;

  const keepFrom = session.turns.length - 10;
  const toFold = session.turns.slice(session.compactedThrough, keepFrom);
  const transcript = toFold
    .map((t) => `${t.role === 'user' ? 'CANDIDATE' : t.persona.toUpperCase()}: ${t.content}`)
    .join('\n\n');
  const prior = session.compactSummary ? `Earlier summary:\n${session.compactSummary}\n\n` : '';

  const response = await anthropic.messages.create({
    model: MODELS.compact,
    max_tokens: 1024,
    system:
      'Summarize this C++ interview-practice conversation segment in at most 150 words: what was discussed, decisions made, mistakes and corrections, and any points the interviewer already raised (so they are not repeated). Output only the summary.',
    messages: [{ role: 'user', content: `${prior}${transcript}` }],
  });
  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text ?? '';
  if (!text) return null;

  session.compactSummary = text.trim();
  session.compactedThrough = keepFrom;
  return usageEntry('compact', MODELS.compact, response.usage);
}
