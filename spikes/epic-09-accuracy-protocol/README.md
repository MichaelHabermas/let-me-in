# Epic 9 — Accuracy protocol (PRE-PRD spike)

Written playbook for a **later** formal check that the door app **welcomes people who should get in** and **turns away people who should not**, using **at least 20 distinct identities** in the plan (placeholders until supervisor approval).

**Authority:** [docs/PRE-PRD.md](../../docs/PRE-PRD.md) (Epic 9), [docs/SPECS.txt](../../docs/SPECS.txt) (Testing #4–#6, similarity accuracy target), [docs/PRE-SEARCH.md](../../docs/PRE-SEARCH.md) (evaluation bands).

**Outcomes:** [FINDINGS.md](./FINDINGS.md)

## Protocol documents

| File | Epic tasks |
| --- | --- |
| [protocol-playbook.md](./protocol-playbook.md) | F9.1, E9-T1 — roster (≥20), enrollment rules, lighting buckets, attempts, consent template |
| [protocol-positive-trials.md](./protocol-positive-trials.md) | E9-T2 — positive trials (enrolled, varied light) |
| [protocol-negative-trials.md](./protocol-negative-trials.md) | E9-T3 — negative trials (not enrolled, impostors, photo) |
| [protocol-specs-mapping.md](./protocol-specs-mapping.md) | E9-T4 — map trial types → SPECS Testing #4–#6 |
| [protocol-metrics.md](./protocol-metrics.md) | F9.2, F9.4 — headline metrics + PRE-SEARCH bands |

## Optional smoke (E9-T5, F9.3)

If approved, a tiny run against [spikes/epic-06-e2e-toy-pipeline/](../epic-06-e2e-toy-pipeline/) checks **F9.3** intent: **stranger → turned away** (DENIED / Unknown) and **two faces → clear message**, not a normal welcome. **Do not run** until supervisor approves protocol **and** accepts fixture ethics (see [FINDINGS.md](./FINDINGS.md)).

## STOP (E9-T6)

No **real** face collection, **live** human trials at the door, or **campus** recruiting until a human supervisor records approval in [FINDINGS.md](./FINDINGS.md).
