# Practice IDE

A local, single-user C++ coding environment with a conversational AI that can always see the
current code. Built for interview practice — you never paste code into a chat box.

- **LeetCode-style Monaco editor** with C++ config, STL snippets and word-based suggestions.
- **Two AI personas**: an interviewer who won't hand you answers, and a tutor who will.
- **Problem intake**: paste rough problem text; it becomes a formatted statement, a starting
  stub, test cases and a generated test harness.
- **Compile and run** against the tests locally with ASan/UBSan on, results flowing straight
  into the AI's context — hit run, see three failures, and just type "why is that failing?".
- **Session debrief** on demand: scores, strengths, gaps and one drill to practise next.

## Requirements

- Node 20+
- `g++` (or `clang++` — set `CXX=clang++` in `.env`) supporting `-std=c++23` and sanitizers
- An Anthropic API key

## Setup

```sh
npm install
cp .env.example .env   # add your ANTHROPIC_API_KEY
npm run dev            # server on :3001, client on the Vite port it prints
```

Open the Vite URL. The API key stays on the server; all model calls go through it.

## Usage

1. Paste a rough problem into the left pane and hit **Format problem** — the stub lands in the
   editor.
2. Write code. **Ctrl/Cmd+Enter** runs; **Ctrl/Cmd+K** focuses the chat.
3. Talk to the interviewer at any time — it sees your buffer, selection, cursor, build errors
   and test results automatically. Flip to **Tutor** when you want direct answers.
4. **End session** for a debrief.

Sessions (transcript, edit history, token usage) are saved to `sessions/<id>.json`.

## Notes

- The interviewer's hidden per-problem brief never reaches the browser — it is stripped on the
  server before `problem:ready` is sent.
- Execution runs under ASan + UBSan with `hard_rss_limit_mb=512`, a 5s wall clock, and a file
  size ulimit. Leak detection is off to match LeetCode semantics.
- Models: Claude Sonnet 5 for conversation, Claude Opus 4.8 for problem intake and the debrief,
  Claude Haiku 4.5 for history compaction on long sessions.
- A dropped WebSocket reconnects into a **fresh** session (v1 limitation).
- clangd IntelliSense (Study mode) is scaffolded in the UI but not wired yet — phase 3.
