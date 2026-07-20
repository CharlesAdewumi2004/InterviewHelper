import { CANDIDATE_CONTEXT } from './candidate.js';

export const BLOOMBERG_DEBRIEF_PROMPT = `You are producing the structured end-of-session scorecard for a Bloomberg-style graduate SWE mock interview. You are given the problem (if one was loaded), the full transcript with persona tags and timestamps, edit summaries, the final buffer, and the final build/test state.

${CANDIDATE_CONTEXT}

Score against the behaviorally anchored rubric (1-4 per axis, scored independently, citing specific observed evidence — no mental averaging):
- A: problem comprehension & requirements (clarified constraints, edge cases, assumptions unprompted?)
- B: coding fluency & correctness (clean idiomatic C++; traced/tested unprompted; found own bugs?)
- C: algorithms, data structures & complexity (brute force → optimised with justification; accurate analysis?)
- D: communication, collaboration & hint uptake — Bloomberg-weighted (continuous legible narration; integrated hints quickly without ego?)
- E: system design — include only if a design discussion actually happened.
- F: motivation & fit — include only if intro/behavioral/candidate-questions phases actually happened.
Include in "axes" only the axes with actual evidence in this session. Bloomberg-specific penalties: solving silently, not clarifying, not taking interviewer input, generic trade-off claims, weak "why Bloomberg", hiding behind "we", disrespecting legacy code.

Rules for the output:
- evidence: quotes or close paraphrases of specific things the candidate said or did, tied to observed behaviour. Evidence comes first and drives everything else.
- biggest_risk: the single observation most likely to cost the offer.
- rewrite: take one weak explanation the candidate actually gave (quote it as "original") and write the stronger version they should have said ("improved").
- highest_leverage_fix: the one change for next session.
- next_drill: concrete — a problem type, behavioral question, or round to run.
- hints: every hint given during the session and how quickly/completely the candidate integrated it. Empty array if none were given.
- recommendation + confidence + decision_observation: overall hire recommendation as a trained Bloomberg interviewer would file it, your confidence in it, and the single most decision-relevant observation.
Be blunt. State exactly what would concern a real interviewer. No generic encouragement.`;

export const BLOOMBERG_DEBRIEF_SCHEMA = {
  type: 'object',
  properties: {
    evidence: { type: 'array', items: { type: 'string' } },
    axes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          axis: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E', 'F'] },
          name: { type: 'string' },
          score: { type: 'integer' },
          evidence: { type: 'string' },
        },
        required: ['axis', 'name', 'score', 'evidence'],
        additionalProperties: false,
      },
    },
    biggest_risk: { type: 'string' },
    rewrite: {
      type: 'object',
      properties: {
        original: { type: 'string' },
        improved: { type: 'string' },
      },
      required: ['original', 'improved'],
      additionalProperties: false,
    },
    highest_leverage_fix: { type: 'string' },
    next_drill: { type: 'string' },
    hints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          hint: { type: 'string' },
          uptake: { type: 'string' },
        },
        required: ['hint', 'uptake'],
        additionalProperties: false,
      },
    },
    recommendation: { type: 'string', enum: ['strong hire', 'hire', 'no hire', 'strong no hire'] },
    confidence: { type: 'string' },
    decision_observation: { type: 'string' },
  },
  required: [
    'evidence',
    'axes',
    'biggest_risk',
    'rewrite',
    'highest_leverage_fix',
    'next_drill',
    'hints',
    'recommendation',
    'confidence',
    'decision_observation',
  ],
  additionalProperties: false,
} as const;
