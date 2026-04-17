# Positive trials — people who **should** be let in (E9-T2)

**Definition:** The subject is **in the enrollment gallery** for the test run. A **successful positive trial** is one where the product behavior matches SPECS Testing **#3** intent: **GRANTED** with the **correct name** within the end-to-end time budget (see [docs/SPECS.txt](../../docs/SPECS.txt) — scenario 3 and “End-to-End Verification < 3 seconds”).

## Spec anchor (do not contradict)

From [docs/SPECS.txt](../../docs/SPECS.txt) **Performance Targets** — **Similarity Accuracy** (wording in file uses legacy glyphs; intent is):

- **≥ 85%** “true positive rate” (for this playbook: **correct welcomes** — enrolled person at the door is recognized and welcomed as themselves).
- On a test set of **20+ faces** (this protocol defines **20** roster slots minimum, expandable to 21+).

Positive trials supply the numerator/denominator for that **correct welcomes** rate once real data exists.

## Enrolled set for this protocol

Use **Subjects 01–12** from [protocol-playbook.md](./protocol-playbook.md) as the **enrolled gallery** (12 distinct enrolled faces). The study roster still lists **≥ 20 different people** (12 enrolled + 8 not enrolled, plus optional 21+), which matches the SPECS intent of a **test set of 20+ faces** for the combined accuracy headline. The **correct welcomes** percentage is computed over **enrolled** door attempts (numerator and denominator both from “should let in” sessions), not over the whole roster. If a supervisor requires **20 enrolled** identities specifically, extend the gallery with Subjects **21–32** as enrolled **after approval** and note the change in [FINDINGS.md](./FINDINGS.md).

## Lighting variety

For **each** enrolled subject (01–12), schedule **at least one** door visit per lighting bucket **L1–L4** (see playbook), for **≥ 48** positive-class visits minimum (12 × 4 buckets × 1 visit). Each visit may include up to **3** attempts per playbook, yielding up to **144** scored positive attempts for stability.

## Recommended minimum counts (intent ≥ spec)

| Metric | Minimum planned |
| --- | ---: |
| Distinct **enrolled** identities | 12 |
| Distinct **lighting buckets** exercised per enrolled identity | 4 |
| Door **visits** (enrolled × bucket) | 48 |
| Door **attempts** (if 3 per visit) | 144 (cap per cooldown) |

Record separately:

- **Strong welcome** outcomes vs **uncertain / re-prompt** outcomes (see [protocol-metrics.md](./protocol-metrics.md) and PRE-SEARCH bands) so the team can narrate “good light” vs “hard light” without mixing them into one opaque score.

## Inclusion / exclusion

- **Include** only attempts where **exactly one face** is detected (excludes two-person frame; those map to scenario **#6**, not a clean positive).
- **Exclude** from the positive rate if the runner mis-tags lighting or wrong person steps in—mark **protocol violation** and discard row.

## Cross-links

- Roster and cooldown: [protocol-playbook.md](./protocol-playbook.md)
- SPECS mapping: [protocol-specs-mapping.md](./protocol-specs-mapping.md)
