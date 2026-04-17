# Findings — Epic 9 (Accuracy protocol, PRE-PRD)

**Spike folder:** `spikes/epic-09-accuracy-protocol/`  
**Date:** 2026-04-17

## Task pass / status

| Task | Status | Notes |
| --- | --- | --- |
| E9-T1 | **DONE** | [protocol-playbook.md](./protocol-playbook.md) — ≥20 placeholder roster, lighting L1–L4, attempts + 3s cooldown, consent checklist + template |
| E9-T2 | **DONE** | [protocol-positive-trials.md](./protocol-positive-trials.md) — enrolled Subjects 01–12, ≥48 visits, SPECS **≥85%** correct-welcomes intent |
| E9-T3 | **DONE** | [protocol-negative-trials.md](./protocol-negative-trials.md) — cohorts A–D, SPECS **≤5%** wrong-welcomes intent |
| E9-T4 | **DONE** | [protocol-specs-mapping.md](./protocol-specs-mapping.md) — table → SPECS #4–#6 |
| E9-T5 | **SKIPPED** | **skipped—awaiting approval / no safe fixture.** No explicit supervisor OK for a 5-face Epic 6 smoke; Lorem Picsum assets are still third-party real faces ([epic-06 assets README](../epic-06-e2e-toy-pipeline/assets/README.md)). |
| E9-T6 | **BLOCKED — pending** | **STOP:** No real face collection, live human trials, or campus recruiting until supervisor approval recorded below. |
| E9-T7 | **DONE** | This file + PRE-PRD index row + [spikes/index.md](../index.md) |

## Artifact paths (evidence)

| Artifact | Path |
| --- | --- |
| Index | [README.md](./README.md) |
| Playbook (F9.1, E9-T1) | [protocol-playbook.md](./protocol-playbook.md) |
| Positive trials (E9-T2) | [protocol-positive-trials.md](./protocol-positive-trials.md) |
| Negative trials (E9-T3) | [protocol-negative-trials.md](./protocol-negative-trials.md) |
| SPECS #4–#6 mapping (E9-T4) | [protocol-specs-mapping.md](./protocol-specs-mapping.md) |
| Metrics + bands (F9.2, F9.4) | [protocol-metrics.md](./protocol-metrics.md) |

## Optional smoke (E9-T5) — template if ever approved

_If supervisor approves_, record here:

1. **Environment:** e.g. opened `spikes/epic-06-e2e-toy-pipeline/index.html` via …
2. **Steps:** buttons clicked, images loaded, matching run …
3. **Outcome:** pass/fail in ordinary words per scenario (stranger denied, two-face message, etc.)

_Current:_ not run.

## E9-T6 — Supervisor approval (ethics / campus rules)

**Do not start** collection of real face photos, live human trials, or campus subject recruiting until this section is filled.

| Field | Value |
| --- | --- |
| Approved by | _(pending)_ |
| Date | _(pending)_ |
| Scope approved | e.g. “protocol only” / “protocol + Epic 6 fixture smoke” / “live kiosk with enrolled volunteers” |
| Quote or pointer | e.g. “Approved in thread 2026-…: …” |

## Threshold calibration needed?

**TBD after first real run.** Paper protocol does not change numeric bands; implementation may tune UI copy and optional margin rule per [docs/PRE-SEARCH.md](../../docs/PRE-SEARCH.md).

## Spike 9a / 9b (PRE-PRD summary table)

| Spike | Result |
| --- | --- |
| **9a** Protocol only | **PASS** — written protocol linked above |
| **9b** 5-face smoke | **N/A** — skipped pending approval / fixture ethics |
