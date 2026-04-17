# Negative trials — people who **should not** get in (E9-T3)

**Definition:** The person at the camera is **not** the enrolled person the system should welcome, or is a **spoof** (printed photo). A **successful negative trial** is one where the person is **not** let in as a known resident—typically **DENIED** with **Unknown** for live strangers per SPECS Testing **#4**.

## Spec anchor (do not contradict)

From [docs/SPECS.txt](../../docs/SPECS.txt) **Performance Targets** — paired with the positive target:

- **≤ 5%** “false positive rate” (for this playbook: **wrong welcomes** — a stranger or non-enrolled person is welcomed **as if** they were an enrolled resident).

Negative trials supply the numerator/denominator for that **wrong welcomes** rate.

## Cohort A — Unenrolled live person (SPECS #4)

Use **Subjects 13–15** (and optional 21+) as **never enrolled** for this test run.

| Design | Minimum planned |
| --- | ---: |
| Distinct unenrolled identities | ≥ 3 |
| Door visits per identity across L1–L4 | ≥ 1 each bucket where safe/feasible |
| Attempts per visit | ≤ 3 (cooldown obeyed) |

**Expected outcome:** **DENIED** + **Unknown** label (per SPECS #4).

## Cohort B — Impostor / wrong identity (not in gallery)

Use **Subjects 16–17** (optional): present at door; **not** in gallery. Same logging as Cohort A. Distinguish in the log as **“impostor script”** if they verbally claim a enrolled name—still must not be GRANTED with that name.

## Cohort C — Printed photo of enrolled user (SPECS #5)

**Goal:** Hold a **physical print** of an enrolled subject’s face to the camera. SPECS: system **should ideally detect or flag** the attempt ([docs/SPECS.txt](../../docs/SPECS.txt) Testing #5; Evaluation Criteria row “Printed photo…”).

| Design | Minimum planned |
| --- | ---: |
| Distinct enrolled faces used as print source | ≥ 2 (e.g. Subject 01 and Subject 07) |
| Print trials per source | ≥ 3 lighting conditions each |

Log **outcome class:** DENIED / flagged / wrongly GRANTED (the last counts against the **wrong welcomes** cap).

## Cohort D — Two people in frame (SPECS #6)

Use **Subject 18–19** paired with enrolled subjects (rotate pairs). Not a single-person positive or negative row; see [protocol-specs-mapping.md](./protocol-specs-mapping.md).

**Expected outcome:** Graceful handling—**reject** or **prompt** until one person (per SPECS #6 and PRE-SEARCH two-face row).

## Minimum counts (intent ≥ spec)

| Cohort | Trials (attempts logged) |
| --- | ---: |
| A + B combined “stranger at door” | ≥ 36 attempts (example: 4 identities × 3 buckets × 3 attempts) — adjust to roster |
| C printed photo | ≥ 6 attempts |
| D two-face | ≥ 8 attempts (4 pairings × 2 repeats) |

Tune upward if the supervisor wants more statistical margin; keep **total distinct identities ≥ 20** on the roster.

## Cross-links

- Roster: [protocol-playbook.md](./protocol-playbook.md)
- Mapping: [protocol-specs-mapping.md](./protocol-specs-mapping.md)
