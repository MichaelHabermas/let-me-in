# Epic: E21 Passive Liveness And Spoof-Risk Handling

**Generated:** 2026-05-02 14:56:01 EDT
**Scope:** full-stack browser app
**Status:** Complete

---

## Overview

Epic 21 adds browser-only passive liveness evidence so the gate does not grant access from a single still image. The implementation keeps the door UX passive, blocks `GRANTED` when liveness evidence fails, records liveness outcome/reason/score in audit logs, upgrades Scenario 5 to a spoof-risk assertion, and documents limitations honestly.

Active challenge fallback is deferred.

---

## Tasks

### Task 1.1: Define liveness model and defaults
**Status:** [x] Complete
**Description:** Add typed liveness evidence/verdict/reason APIs and deterministic config defaults.
**Acceptance Map:** E21.S1.F1.T1; E21 DoD liveness evidence can be carried through decisions.
**Proof Required:** `pnpm run typecheck`; `pnpm test -- tests/liveness.test.ts`

**Subtasks:**
- [x] Add liveness types and config defaults.
- [x] Prove reason codes are exhaustive in unit tests.
- [x] Update this epic file with completed proof or an explicit gap.

**Suggested Commit:** `feat(liveness): define passive liveness model`

### Task 1.2: Track same-face temporal windows
**Status:** [x] Complete
**Description:** Add a rolling collector that resets on invalid face continuity.
**Acceptance Map:** E21.S1.F1.T2; E21 DoD rolling same-face frame window.
**Proof Required:** `pnpm test -- tests/liveness.test.ts`

**Subtasks:**
- [x] Add append/reset/snapshot collector API.
- [x] Reset on stale frames and large bbox jumps.
- [x] Reset from the pipeline on no-face, multi-face, and cooldown.
- [x] Update this epic file with completed proof or an explicit gap.

**Suggested Commit:** `feat(liveness): track same-face frame windows`

### Task 1.3: Compute passive liveness metrics
**Status:** [x] Complete
**Description:** Score browser-local frame difference, texture variation, sharpness, and glare risk.
**Acceptance Map:** E21.S1.F1.T3; E21.S4.F1.T2.
**Proof Required:** `pnpm test -- tests/liveness.test.ts`

**Subtasks:**
- [x] Add deterministic synthetic flat, jittered-flat, live-like, blur, and glare fixtures.
- [x] Prove flat scores below live-like.
- [x] Prove jitter alone does not pass.
- [x] Update this epic file with completed proof or an explicit gap.

**Suggested Commit:** `feat(liveness): score passive spoof signals`

### Task 1.4: Gate access decisions on liveness
**Status:** [x] Complete
**Description:** Require strong identity plus passing liveness before `GRANTED`.
**Acceptance Map:** E21.S2.F1.T1; E21.S2.F1.T3.
**Proof Required:** `pnpm test -- tests/gate-decision.test.ts tests/access-decision-engine.test.ts tests/run-frame-append.test.ts`

**Subtasks:**
- [x] Pass liveness evidence into access evaluation.
- [x] Demote strong identity with failed liveness to non-grant.
- [x] Surface `PRESENTATION_ATTACK_RISK`.
- [x] Update this epic file with completed proof or an explicit gap.

**Suggested Commit:** `feat(gate): require liveness before grant`

### Task 1.5: Update decision UI
**Status:** [x] Complete
**Description:** Show checking/hold-still state while the window fills and presentation-risk copy on failure.
**Acceptance Map:** E21.S2.F1.T2; E21.S2.F1.T3.
**Proof Required:** `pnpm test -- tests/mount-gate.test.ts`; scenario proof for printed-photo copy.

**Subtasks:**
- [x] Add liveness UI strings.
- [x] Use pipeline status while collecting samples.
- [x] Render presentation-risk copy in the decision banner.
- [x] Update this epic file with completed proof or an explicit gap.

**Suggested Commit:** `feat(ui): show liveness verification states`

### Task 1.6: Persist and review liveness evidence
**Status:** [x] Complete
**Description:** Store liveness audit data and expose it in log review and CSV export.
**Acceptance Map:** E21.S3.F1.T1; E21.S3.F1.T2.
**Proof Required:** `pnpm test -- tests/db-dexie.test.ts tests/csv-export.test.ts tests/mount-log-page.test.ts`

**Subtasks:**
- [x] Add optional liveness fields to access log rows and Dexie append payloads.
- [x] Add Dexie v3 indexes while preserving old row compatibility.
- [x] Add liveness columns to `/log` and CSV.
- [x] Update this epic file with completed proof or an explicit gap.

**Suggested Commit:** `feat(logs): record liveness audit evidence`

### Task 1.7: Upgrade scenario and documentation proof
**Status:** [x] Complete
**Description:** Make Scenario 5 a runnable spoof-risk assertion and update documentation.
**Acceptance Map:** E21.S4.F1.T1; E21.S4.F1.T3; E21 DoD scenario/docs limits.
**Proof Required:** `pnpm run test:scenarios -- tests/scenarios/05-printed-photo.spec.ts`; docs scan for obsolete no-liveness claims.

**Subtasks:**
- [x] Update Scenario 5 to assert presentation-risk non-grant behavior.
- [x] Update defense, architecture, demo, and scenario coverage docs.
- [x] Run scenario proof and full verification.
- [x] Update this epic file with completed proof or an explicit gap.

**Suggested Commit:** `test(scenarios): assert printed-photo spoof risk`

---

## Review Checkpoint

- [x] Every source acceptance criterion has code, test, human proof, or a named gap.
- [x] Every required proof item has an executable path before implementation starts.
- [x] Boundary/orchestration behavior is tested when a boundary changed.
- [x] Security/logging/error-handling requirements were implemented or explicitly reported as gaps.
- [x] Human verification items are checked only after they were actually performed.
- [x] Known fixture/data/user prerequisites for manual proof are created or explicitly assigned as tasks.

---

## Change Log

- 2026-05-02 14:56 EDT: Implemented liveness model, rolling collector, scoring fixtures, decision integration, UI copy, liveness audit fields, log/CSV surfaces, Scenario 5 update, and documentation updates. Focused typecheck and liveness tests have run; full scenario/build verification is pending.
- 2026-05-02 14:58 EDT: Verified `pnpm run typecheck`, focused Vitest suite, `pnpm run lint`, `pnpm test`, `pnpm run test:scenarios -- tests/scenarios/05-printed-photo.spec.ts`, `pnpm run test:scenarios`, `pnpm run format:check`, and `pnpm run build`. Epic acceptance is complete with no proof gaps.
