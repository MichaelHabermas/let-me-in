# SPECS Scenario Coverage Matrix (Epic E16.S3)

This document maps SPECS scenarios 1-8 to runnable checks and evidence artifacts.

## Mapping table

| Scenario | SPECS expectation | Automated check | Command | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Feed within 2s of permission | `tests/scenarios/01-webcam-under-2s.spec.ts` | `pnpm run test:scenarios` | Pass (stub) | Real-camera canonical timing still needs operator stopwatch run on desktop Chrome |
| 2 | Enroll new user | `tests/scenarios/02-admin-enroll.spec.ts` | `pnpm run test:scenarios` | Pass | Stub enroll path |
| 3 | GRANTED <3s | `tests/scenarios/03-enrolled-granted.spec.ts` | `pnpm run test:scenarios` | Pass | Stub timing asserts under 3000 ms |
| 4 | Stranger DENIED / Unknown | `tests/scenarios/04-unknown-denied.spec.ts` | `pnpm run test:scenarios` | Pass | Unknown denial path covered |
| 5 | Printed photo flagged | `tests/scenarios/05-printed-photo.spec.ts` | `pnpm run test:scenarios` | Pass (honest MVP) | Current behavior: denied without dedicated liveness |
| 6 | Two people handled | `tests/scenarios/06-two-people.spec.ts` | `pnpm run test:scenarios` | Pass | Multi-face guidance coverage |
| 7 | IndexedDB persist after refresh | `tests/scenarios/07-refresh-persist.spec.ts` | `pnpm run test:scenarios` | Pass | Persistence round-trip covered |
| 8 | Log complete with prior attempts | `tests/scenarios/08-log-prior-attempts.spec.ts` | `pnpm run test:scenarios` | Pass | Log contains granted and denied rows |

## Latest run evidence

- Date: `2026-04-25`
- Command: `pnpm run test:scenarios`
- Result: `8 passed`

## Manual/canonical follow-ups

- Scenario 1 canonical run (real `getUserMedia`, desktop Chrome, MBP) remains required for interview-grade evidence.
- Deep-dive and benchmark canonical numbers are tracked in `docs/BENCHMARKS.md`.
