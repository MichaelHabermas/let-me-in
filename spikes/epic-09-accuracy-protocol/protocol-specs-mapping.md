# Map trial types → SPECS Testing #4, #5, #6 (E9-T4)

Source: [docs/SPECS.txt](../../docs/SPECS.txt) lines ~124–134.

| Trial type (this protocol) | Where defined | SPECS #4 — Unenrolled → DENIED + Unknown | SPECS #5 — Printed photo of enrolled → detect/flag | SPECS #6 — Two people → graceful reject or single-person prompt |
| --- | --- | --- | --- | --- |
| Enrolled subject, single face, L1–L4 door attempts | [protocol-positive-trials.md](./protocol-positive-trials.md) | — (not primary) | — | — |
| Unenrolled visitor (Subjects 13–15) | [protocol-negative-trials.md](./protocol-negative-trials.md) Cohort A | **Primary** — must show DENIED + Unknown | — | — |
| Impostor not in gallery (16–17) | Cohort B | **Primary** — must not GRANT as a known resident | — | — |
| Printed photo of enrolled | Cohort C | — | **Primary** — ideal: DENIED or flagged spoof | — |
| Two people visible; runner does not isolate one face | Cohort D | — | — | **Primary** — no GRANT until single face; message per product |
| Unenrolled + enrolled partially overlapping (edge framing) | Optional edge log | Partial overlap may still behave as #4 if one face is selected—**log** which face was chosen | — | If detector returns two boxes → **#6** |

**Overlap note (clarity only):** SPECS **#1–#3** cover feed, enrollment, and enrolled GRANTED path; this epic’s written trials **feed** those scenarios but E9-T4 focuses on **#4–#6** per PRE-PRD.
