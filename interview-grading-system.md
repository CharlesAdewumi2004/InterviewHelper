# Full Interview Grading System

Companion to the Mock Interview Process Spec. This defines exactly how every session is scored, how scores map to a hire decision, and how progress is tracked across sessions.

---

## 1. Principles

1. **Behaviorally anchored.** Every score point is tied to a written description of observable behaviour, never an adjective. The grader compares what happened against the anchor, not against intuition or a previous session.
2. **Evidence before judgment.** No score is assigned without at least two specific behavioural observations (what was said/done, verbatim where useful). If there's no evidence, the axis is marked *Not Observed*, never guessed.
3. **Independent axes.** Each axis is scored on its own. A brilliant algorithm does not buy back silent grinding; strong narration does not buy back a broken solution.
4. **Signal over correctness.** *How* the answer was reached (decomposition, narration, self-correction, hint uptake, testing) carries as much weight as the answer itself — but correctness is still a hard requirement, not optional (Bloomberg explicitly rejects the myth that communication alone carries you).
5. **No mid-session averaging.** Scores are assigned only in the debrief, from notes.

---

## 2. The Scale

All axes use a 1–4 scale (mirrors the poor / borderline / solid / outstanding pattern used in industry BARS):

| Score | Label | Meaning |
|---|---|---|
| 1 | Poor | Would end the loop on its own |
| 2 | Borderline | Real concern; needs other axes to compensate strongly |
| 3 | Solid | Meets the hiring bar for a grad hire |
| 4 | Outstanding | Better than most candidates who get offers; would be cited in the debrief as a reason to fight for the hire |

Half-points (e.g., 2.5) are allowed only when evidence genuinely straddles two anchors, and the writeup must say which behaviours pulled each way.

---

## 3. Axes, Anchors, and Weights

Weights reflect Bloomberg's documented emphasis: coding competence is the baseline; communication, hint uptake, and fit differentiate.

### Coding sessions (Question Practice — axes A–D)

| Axis | Weight |
|---|---|
| A — Problem comprehension & requirements | 20% |
| B — Coding fluency & correctness | 30% |
| C — Algorithms, DS & complexity | 25% |
| D — Communication, collaboration & hint uptake | 25% |

### Full interviews (axes A–D + F)

| Axis | Weight |
|---|---|
| A | 15% |
| B | 25% |
| C | 20% |
| D | 25% |
| F — Motivation & fit | 15% |

### System design rounds (E replaces B/C weighting)

| Axis | Weight |
|---|---|
| A | 15% · E — System design | 45% · D | 25% · F | 15% |

### Behavioral anchors

**Axis A — Problem comprehension & requirements**
- **1:** Starts coding immediately; misreads the problem; assumptions unstated and wrong.
- **2:** Restates the problem but misses key constraints or edge conditions until prompted (including missing them after the one "anything else to clarify?" nudge).
- **3:** Clarifies inputs/outputs and constraints, states and verifies assumptions, identifies main edge cases up front, writes them down.
- **4:** All of 3, plus surfaces non-obvious constraints or ambiguities the prompt hid; scopes deliberately.
- *Checklist evidence:* clarified input size, empty/null, duplicates, boundaries, mutation, complexity target, ordering, invalid input — each unprompted clarification is logged.

**Axis B — Coding fluency & correctness**
- **1:** Code conceptually wouldn't run; persistent logic failures; visibly unfamiliar with C++.
- **2:** Mostly working only with significant interviewer repair; messy structure; edge cases fail in the trace.
- **3:** Clean, working, idiomatic code; handles the stated edge cases; traces/tests own code unprompted; bugs found and fixed by the candidate.
- **4:** All of 3, plus production instincts: naming, decomposition, error handling, and self-review that would pass a real code review.
- *Calibration note for this candidate:* graded against a strong-C++ bar. Non-idiomatic C++ (raw loops where an algorithm fits, missed const-correctness, gratuitous copies) caps B at 3 even if correct.

**Axis C — Algorithms, data structures & complexity**
- **1:** No viable approach; complexity analysis absent or wrong even after prompting.
- **2:** Brute force only, or names the optimal approach without being able to implement or justify it; shaky complexity analysis.
- **3:** Progresses brute force → optimised with sound justification; accurate time and space analysis; sensible structure choices.
- **4:** All of 3, plus compares multiple viable approaches with trade-offs (constant factors, memory locality, practical considerations) and picks deliberately.
- *Hard rule:* a wrong complexity claim left uncorrected by the candidate caps C at 2. Self-corrected before the interviewer flags it: no cap.

**Axis D — Communication, collaboration & hint uptake** *(Bloomberg-weighted)*
- **1:** Silent grinding (>30s gaps, repeatedly) or unstructured rambling; ignores or resists interviewer input; reasoning cannot be followed.
- **2:** Explains when asked; absorbs hints slowly or partially; loses the thread under pressure; needed the "keep talking" interrupt more than once.
- **3:** Thinks aloud continuously at intent/invariant level; listens; integrates hints quickly and credits them; corrects course without ego; executes the recovery protocol when blanked.
- **4:** All of 3, plus genuine pair-work: checks in at decision points, invites challenge, hands ambiguity back with structure.
- *Hint-uptake sub-score (logged separately, folds into D):* for each hint given, record level (1–4), latency to integration, and completeness. Rough guide: needed only level-1/2 hints and integrated immediately → no penalty; needed a level-4 hint → D capped at 3; resisted or argued past a correct hint → D capped at 2 (this is a documented Bloomberg rejection cause).
- *Narration channel:* think-aloud is captured by the ambient narration mic (timestamped, separate from chat). D's continuity anchors — "silent grinding" and "thinks aloud continuously" — are scored **only from the narration timeline within mic-on spans**. When the channel was off, absence of narration is absence of evidence, never evidence of silence: D is scored from chat-visible collaboration evidence alone (hint uptake, integration of interviewer input, written check-ins), and if that yields fewer than two specific observations, D is *Not Observed* and its weight is renormalized away (per Principle 2).

**Axis E — System design**
- **1:** Jumps to components without requirements; no trade-off reasoning; hand-waves scale and failure.
- **2:** Reasonable high-level shape but shallow: trade-offs asserted not argued; failure modes and consistency unaddressed until prompted.
- **3:** Gathers requirements and load estimates; justified architecture; explicit trade-offs (latency vs throughput, consistency vs availability, delivery semantics); addresses failure and recovery.
- **4:** All of 3, plus quantified reasoning (latency budgets, capacity math), evolution under changed requirements, domain-appropriate judgment (e.g., ordering guarantees for market data).

**Axis F — Motivation & fit** *(Bloomberg-weighted)*
- **1:** Generic or contradictory motivation; no curiosity back; behavioral answers are vague "we" stories with no personal role.
- **2:** Plausible but interchangeable motivation ("great engineering, good culture"); STAR answers lack specifics or measurable outcomes.
- **3:** Specific, credible motivation tied to Bloomberg's product/domain; STAR answers with clear personal actions, outcomes, lessons; asks informed questions back.
- **4:** All of 3, plus survives deep probing on own past decisions (why, what failed, what they'd change) with visible genuine domain engagement.
- *Auto-caps:* "salary/prestige"-shaped motivation → F ≤ 2. Answer that would fit any tech company unchanged → F ≤ 2. Hiding behind "we" after the "what did *you* do?" probe → F ≤ 2.

---

## 4. Flags (Outside the Weighted Score)

Some behaviours are decision-relevant beyond their axis score. Logged separately:

**Red flags (any one of these overrides a passing weighted score → at best Lean No Hire):**
- Bluffing: confidently asserting something false and defending it when challenged (honest "I don't know, but here's how I'd reason" is *positive* signal).
- Resisting interviewer input across multiple instances ("leading your own way").
- Solving an entire problem silently despite interrupts *(only assessable when the narration channel was on, or when interrupts in chat were visibly ignored — never inferred from transcript gaps with the mic off)*.
- (Code review) contempt for legacy code / "rewrite it all" instinct.
- Final solution materially incorrect with the candidate unaware after testing phase.

**Green flags (logged as debrief ammunition, can lift a borderline decision):**
- Found and fixed own bug before the interviewer saw it.
- Volunteered a trade-off unprompted ("if memory were tight, I'd…").
- Correctly pushed back on an interviewer's deliberate wrong steer — with reasoning, then checked in.
- Recovered from a blank via the protocol without visible spiral.

---

## 5. Mapping Scores to a Decision

Compute the weighted average, then apply gates:

| Weighted avg | Provisional recommendation |
|---|---|
| ≥ 3.5 | Strong Hire |
| 3.0 – 3.49 | Hire |
| 2.5 – 2.99 | Lean No Hire (borderline — D and F decide, per Bloomberg pattern) |
| < 2.5 | No Hire |

**Gates (applied after the average):**
1. Any axis at 1 → recommendation cannot exceed Lean No Hire.
2. D ≤ 2 → cannot exceed Lean No Hire regardless of technical scores (technically-clean loops fail on this at Bloomberg).
3. B ≤ 2 on both problems in a session → No Hire (correctness is the baseline).
4. Any red flag → at best Lean No Hire.
5. In the 2.5–2.99 band, D and F act as tiebreakers: both ≥ 3 → round up to Hire; either ≤ 2 → round down to No Hire.

Every recommendation is stated with a confidence (low / medium / high) and the **single most decision-relevant observation**.

---

## 6. Per-Session Scorecard Template

```
SESSION SCORECARD
Date:                Mode:                Problem(s):
Duration:            Frames enforced/skipped:

AXIS SCORES (evidence first, then number)
A — evidence: …            score:  /4
B — evidence: …            score:  /4
C — evidence: …            score:  /4
D — evidence: …            score:  /4
E — evidence: …            score:  /4   (if applicable)
F — evidence: …            score:  /4   (if applicable)

HINT LOG
#  level  what was said  →  uptake (latency / completeness)

CLARIFICATION CHECKLIST (unprompted? y/n)
size · empty · duplicates · boundaries · mutation · complexity target · ordering · invalid input

FLAGS
Red: …        Green: …

WEIGHTED SCORE:        GATES TRIGGERED:
RECOMMENDATION:  Strong Hire / Hire / Lean No Hire / No Hire
Confidence:            Most decision-relevant observation:

BIGGEST RISK:
ONE REWRITE (weak answer → stronger version):
HIGHEST-LEVERAGE FIX:
NEXT DRILL:
```

---

## 7. Progress Tracking Across Sessions

Maintained as a running log so drills target real trends, not one-off noise:

- **Axis trendline:** per-axis scores across the last 5 sessions. A drill is triggered by any axis averaging < 3 over 3 sessions.
- **Hint dependency curve:** average hint level needed per session — should trend toward 0–1.
- **Clarification hit rate:** fraction of the 8 checklist items raised unprompted — target ≥ 6/8 consistently.
- **Recovery record:** blanks encountered vs. protocol executed cleanly — graded on recovery, not on whether the blank happened.
- **Recurring evidence:** any identical weakness quoted in two consecutive debriefs is escalated: subsequent sessions deliberately stress it, and it stays on the list until it produces a 3+ under stress.

**Readiness bar (when to book the real interview):** three consecutive full-interview sims at Hire or better, no red flags, D ≥ 3 in all of them **with the narration channel on** (a D scored without captured think-aloud doesn't count toward readiness — the real interview is spoken), and at most one level-1/2 hint per problem.
