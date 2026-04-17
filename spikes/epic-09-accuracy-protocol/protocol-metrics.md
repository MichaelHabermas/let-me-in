# Metrics and evaluation bands (F9.2, F9.4)

## Quote from SPECS (headline accuracy)

[docs/SPECS.txt](../../docs/SPECS.txt) **Performance Targets** — Similarity Accuracy (rendering may show `³` / `£`; **intent** is):

> **≥ 85%** true positive rate at **≤ 5%** false positive rate on test set of **20+ faces**

## Definitions for **this** demo (F9.2)

Terms below match classroom language; implementers may map to standard ML definitions in the final report.

| Term in SPECS | Meaning here | Numerator / denominator (after data collection) |
| --- | --- | --- |
| **True positive rate** | **Correct welcomes** | (# enrolled door attempts where the app **GRANTED** with the **correct** resident name) ÷ (# **eligible** enrolled door attempts in the log) |
| **False positive rate** | **Wrong welcomes** | (# attempts where a **non-enrolled** or **spoof** visitor was **GRANTED as a named resident**) ÷ (# **eligible** negative-class attempts: unenrolled live, impostor, print, excluding protocol violations) |

**Eligible attempts:** Exclude failed runs (camera off, two-face unresolved, runner error). Document exclusions in the run log.

**Stretch (#5):** Count “flagged as spoof” as a **successful** negative outcome for photo trials even if the UI is not a plain DENIED.

## PRE-SEARCH evaluation bands (F9.4)

Adopted narrative from [docs/PRE-SEARCH.md](../../docs/PRE-SEARCH.md) § **“3. Matching & decision logic (evaluation bands)”**:

| Scenario (plain product terms) | Expected behavior | Band name |
| --- | --- | --- |
| Enrolled, good lighting | Welcome with correct name; high confidence score | **Strong accept** |
| Enrolled, low light / partial cover | Welcome **or** “not sure—try again”; middling score; UI should not look “fully sure” | **Weak accept** |
| Not enrolled | Turn away; show **Unknown**; low score vs gallery | **Reject** |
| No face detected | Prompt **No face detected** | (no match) |
| Two faces in frame | Message: multiple faces; need a single person before a welcome | (blocks welcome) |

**Implementation cross-check:** The project standardizes on these bands rather than treating a single default line in isolation—see PRE-SEARCH note after the table.

## How trials connect to rates

- **Positive trials** ([protocol-positive-trials.md](./protocol-positive-trials.md)) drive the **correct welcomes** statistic vs the **≥ 85%** target.
- **Negative trials** ([protocol-negative-trials.md](./protocol-negative-trials.md)) drive the **wrong welcomes** statistic vs the **≤ 5%** target.
- **Two-face** and **no-face** attempts are **out of band** for cosine matching until resolved; they validate **#6** and detector UX, not the headline fraction unless explicitly included in a denominator (avoid mixing without documenting).
