# SPECS scenarios 1–8 — evidence log (Epic E10.S1)

## Automated (Playwright, stub gate + stub enroll)

| # | Scenario | Spec expectation | Command / artifact | Result |
| --- | --- | --- | --- | --- |
| 1 | Webcam &lt;2 s | Stub: click → first `lastDetectorInferMs` | `tests/scenarios/01-webcam-under-2s.spec.ts` | Pass (stub pipeline) |
| 2 | Admin enroll | Happy path save | `tests/scenarios/02-admin-enroll.spec.ts` | Pass |
| 3 | Enrolled GRANTED &lt;3 s | Banner + timing | `tests/scenarios/03-enrolled-granted.spec.ts` | Pass |
| 4 | Unknown DENIED | DENIED + Unknown | `tests/scenarios/04-unknown-denied.spec.ts` | Pass |
| 5 | Printed photo | Honest outcome / limitation | `tests/scenarios/05-printed-photo.spec.ts` | Pass (no dedicated liveness) |
| 6 | Two people | Multi-face prompt | `tests/scenarios/06-two-people.spec.ts` | Pass |
| 7 | Persistence | Two users after reload | `tests/scenarios/07-refresh-persist.spec.ts` | Pass |
| 8 | Log | GRANTED + DENIED rows | `tests/scenarios/08-log-prior-attempts.spec.ts` | Pass |

Run: `pnpm test:e2e` (includes `VITE_E2E_STUB_GATE` + `VITE_E2E_STUB_ENROLL` via `playwright.config.ts`).

## Manual (real camera, MBP + Chrome) — DoD-1

| # | Check | Operator notes | Pass / date |
| --- | --- | --- | --- |
| 1 | Live `getUserMedia` feed within 2 s of permission | Grant camera; stopwatch click → first visible preview frame | _Fill after run_ |

_Stubbed automation does not replace real-camera SPECS evidence on target hardware._
