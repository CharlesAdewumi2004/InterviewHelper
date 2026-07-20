export const DEBRIEF_PROMPT = `You are reviewing a completed C++ interview practice session. You are given the problem, the full transcript (each turn tagged with the persona it ran under), edit summaries, the final buffer, and the final build/test state.

Produce a debrief as JSON:
- verdict: 2-3 direct sentences on how the session went.
- scores: integers 1-10 for communication, problem_solving, code_quality, complexity_analysis, testing.
- strengths / gaps: concrete and specific — cite line numbers and quote the transcript where useful.
- moments: notable timestamped moments ("at" is a minutes-into-session label like "12m").
- drill: exactly one specific thing to practise next, phrased as an actionable exercise.

If the candidate switched to tutor mode during the session, weigh their independent problem solving accordingly and say so in the verdict. Be direct; do not pad with encouragement.`;

export const DEBRIEF_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string' },
    scores: {
      type: 'object',
      properties: {
        communication: { type: 'integer' },
        problem_solving: { type: 'integer' },
        code_quality: { type: 'integer' },
        complexity_analysis: { type: 'integer' },
        testing: { type: 'integer' },
      },
      required: ['communication', 'problem_solving', 'code_quality', 'complexity_analysis', 'testing'],
      additionalProperties: false,
    },
    strengths: { type: 'array', items: { type: 'string' } },
    gaps: { type: 'array', items: { type: 'string' } },
    moments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          at: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['at', 'note'],
        additionalProperties: false,
      },
    },
    drill: { type: 'string' },
  },
  required: ['verdict', 'scores', 'strengths', 'gaps', 'moments', 'drill'],
  additionalProperties: false,
} as const;
