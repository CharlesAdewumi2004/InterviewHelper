export const INTAKE_PROMPT = `You convert rough, pasted interview-problem text into a structured practice problem for a local C++ practice IDE. The user's editor buffer will be saved as solution.hpp; your harness will be saved as main.cpp and compiled with: g++ -std=c++23 -Wall -Wextra -fsanitize=address,undefined.

Produce JSON with these fields:

- title: short problem name.
- statement: clean 2-4 sentence statement with all constraints made explicit.
- constraints: list of constraint strings.
- examples: worked examples with input, output, and a note (empty string if no note is needed).
- signature: the C++ stub written into the editor as the starting buffer. It must compile standalone against the harness: complete class/function declarations with empty bodies that return a default value where needed. Include the necessary #include lines. No main(). Match LeetCode conventions for this problem where they exist.
- tests: 4-8 cases. input and expected are one-line human-readable strings (shown to the user when a case fails).
- harness: a complete main.cpp implementing the test runner.
- brief: a private interviewer brief — the expected optimal solution and complexity, common wrong turns, and follow-ups to push on. This is never shown to the candidate.

HARNESS CONTRACT — follow exactly:
- First line: #include "solution.hpp"
- May include any standard headers; defines int main().
- main() must begin with: std::cout << std::unitbuf; — stdout to a pipe is fully buffered, and without this a timeout kill discards every marker already earned, so a hang on case 5 reports as a crash before case 0.
- Hardcode each test case's inputs in the harness. Never read stdin.
- Run the cases in the same order as the tests array. For each case i (0-based), print exactly one line: "###CASE <i> PASS" or "###CASE <i> FAIL". Immediately after a FAIL line, print "###EXPECTED <one line>" and "###ACTUAL <one line>".
- After all cases, print "###DONE".
- No other output line may begin with ###.
- For design problems (a class driven by a sequence of method calls), encode the call sequence per case and compare the aggregate result (e.g. the sequence of return values) as one line.
- The harness must compile cleanly against the unmodified stub in signature (the stub will fail the tests — that is expected — but compilation must succeed).
- Keep the harness deterministic and self-contained.`;

// Structured-outputs schema: every object closes with additionalProperties:false
// and lists all keys in required, per API constraints.
export const INTAKE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    statement: { type: 'string' },
    constraints: { type: 'array', items: { type: 'string' } },
    examples: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          input: { type: 'string' },
          output: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['input', 'output', 'note'],
        additionalProperties: false,
      },
    },
    signature: { type: 'string' },
    tests: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          input: { type: 'string' },
          expected: { type: 'string' },
        },
        required: ['input', 'expected'],
        additionalProperties: false,
      },
    },
    harness: { type: 'string' },
    brief: { type: 'string' },
  },
  required: ['title', 'statement', 'constraints', 'examples', 'signature', 'tests', 'harness', 'brief'],
  additionalProperties: false,
} as const;
