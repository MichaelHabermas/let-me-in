# Gatekeeper — PRD-2 (SPECS closure)

**Status:** Draft — execution backlog derived from [`docs/SPECS.txt`](SPECS.txt) (canon).

**Relationship to existing docs**

- [`docs/PRD.md`](PRD.md) remains the agent execution PRD for shipped epics.
- **PRD-2** exists solely to **close every gap** between the running product + repo artifacts and **literal** `SPECS.txt` requirements, and to define **“exceed”** work where the canon invites stretch or rigor.
- On conflict: **`SPECS.txt` wins**; PRD-2 tasks may supersede older PRD wording where PRD intentionally deferred a SPEC item.

---

## 1. Objectives

1. **Literal compliance** where feasible without rewriting the whole stack (camera UX, model-load UX, detector semantics, documentation evidence).
2. **Measured compliance** for all **performance** and **accuracy** floors in SPECS (tables filled with MBP+Chrome evidence, scenario automation where possible).
3. **Submission completeness** for course-style deliverables (demo, Pre-Search export, architecture PDF, cost categories, social post policy).
4. **Exceed** (optional PRD-2 “plus” track): additional stretch items beyond the minimum three already shipped (liveness, PDF audit export, multi-angle enrollment, scheduling, landmarks).

---

## 2. Gap register (SPEC → current state → target)

| Area | SPECS reference | Gap | Target / acceptance |
| ------ | ------------------ | ----- | --------------------- |
| Detector semantics | Face Detection: “YOLOv9… detect **faces** with bounding box”; Deep dive `yolov9-face.onnx` narrative | Shipped [`public/models/yolov9t.onnx`](../public/models/README.md) is **COCO person** + **head-band** heuristic ([`src/infra/detector-yolo-decode.ts`](../src/infra/detector-yolo-decode.ts)) | **Path A (preferred for literal SPEC):** Integrate a **face-class or face-specialized** ONNX (e.g. YOLOv8-face export or documented face-YOLO) + decode/NMS aligned to that model; keep ORT pipeline. **Path B (defense-only):** Keep COCO+tight crop but update **all user-facing copy** and **ARCHITECTURE** to say “upper-body / head ROI detector” and add **independent face validation** (e.g. BlazeFace) before embed — still not literal “YOLOv9 face” unless YOLO is face-specific. Pick Path A or B in Epic P2.D1; no silent ambiguity. |
| Model load UX | “Display a **loading progress bar**”; graceful failure | Text status only ([`src/app/gate-session-detector-load.ts`](../src/app/gate-session-detector-load.ts)) | **Progress UI:** For each of detector + embedder `fetch`/load, show **determinate bar** (bytes loaded / content-length when available, or indeterminate + stage labels). Reuse single status region on gate (and admin if models load there). **Failure:** retain friendly error + retry affordance (SPEC: graceful). |
| Mobile cameras | “Support **front and rear** cameras on mobile” | `facingMode` from config only ([`src/infra/camera.ts`](../src/infra/camera.ts)); no user-facing switch | **Gate + Admin:** `enumerateDevices` + labeled picker (“Front” / “Back” / list) or explicit flip control; persist last choice in `settings` store. |
| Preview latency | “Webcam feed within **2 seconds**” of permission (Test 1) | Not asserted in CI / docs | Add **manual + optional automated** check: document in [`docs/BENCHMARKS.md`](BENCHMARKS.md) or scenario; if missed, tune consent → `getUserMedia` → first frame path ([`src/app/gate-session.ts`](../src/app/gate-session.ts) / consent bootstrap). |
| Access decision colors | “GRANTED (green) or **DENIED (red)**” with name + score | `UNCERTAIN` is a third state (valid per evaluation table elsewhere in SPECS) | Ensure banner styling: **green / red / distinct amber** for UNCERTAIN; copy must always show **similarity score** for granted/denied paths ([`src/ui/components/decision-banner.ts`](../src/ui/components/decision-banner.ts)). |
| Default threshold wording | “Configurable… default ≥ **0.75**” | Banded thresholds (`strong` / `weak` / `unknown` / `margin`) in [`src/config.ts`](../src/config.ts) | Document mapping: e.g. `strong ≥ 0.75` as default **or** add admin-visible “single-threshold mode” preset that sets bands from 0.75; update [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) “threshold rationale” to quote SPEC default. |
| Printed photo / spoof | Test scenario 5; stretch liveness | No liveness signals in repo | **Minimum:** explicit **SPOOF_UNCERTAIN** or “possible presentation attack” banner when heuristics fire (frame variance, sharpness, or blink proxy). **Stretch:** motion / texture liveness module spec’d in §6. |
| JSON backup | “Optional JSON **export**/import” | **Bulk import** exists; **no roster JSON export** located | Admin **Export roster JSON** (users + metadata; embeddings as base64 or separate binary strategy per [`docs/IMPORT_SCHEMA.md`](IMPORT_SCHEMA.md)); symmetric to import. |
| Audit export format | Stretch: “CSV/**PDF**” | CSV only ([`src/app/csv-export.ts`](../src/app/csv-export.ts)) | **Exceed track:** PDF generation (print stylesheet + `window.print` MVP, or small PDF lib) for date-filtered log. |
| Performance evidence | `<500ms` detect, `<3s` E2E, `<8s` cold, `≥85%` TPR @ `≤5%` FPR on `≥20` faces, `≥15` FPS preview, `≥50` users no degrade, deep dive `<2s` pipeline + `<500MB` memory | [`docs/BENCHMARKS.md`](BENCHMARKS.md) / [`docs/ACCURACY_RESULTS.md`](ACCURACY_RESULTS.md) still **PENDING** in places; stub benches ≠ SPEC hardware | Fill canonical rows; add **50-user synthetic match bench** (JS loop over embeddings); **memory** sample from Performance tab protocol; add **FPS** row under real detector (not stub). |
| AI cost analysis | Required categories: LLM $, **tokens**, **model conversion** time/cost, **training** GPU, **testing** compute | [`docs/AI_COST_LOG.md`](AI_COST_LOG.md) strong on IDE tokens; weak on conversion/training/testing rows | Add subsection or table rows for **conversion** (HF download vs train: none), **testing compute** (Playwright, bench runs), explicit **$0** assumptions. |
| Production cost projection | Table 100 / 1K / 10K / 100K users | Not consolidated in one doc | Add **`docs/PRODUCTION_COSTS.md`** (or section in ARCHITECTURE) with SPEC table + assumptions bullets (SPECS lines 287–290). |
| Multi-face “highlight each” | “Highlight **each**” | Verify overlay draws **all** boxes before policy blocks grant | Audit [`src/app/bbox-overlay.ts`](../src/app/bbox-overlay.ts) + pipeline; add regression test if only largest box drawn. |
| Stretch inventory | “Implement **at least 3**” from list | Shipped: confidence meter, audio, CSV audit | **PRD-2 exceed:** pick **+1** from remaining: liveness, multi-angle enroll, scheduling, landmarks, PDF — each as own small epic with DoD. |
| Submission | Demo video, Pre-Search PDF/MD, architecture PDF, social | [`docs/SUBMISSION.md`](SUBMISSION.md) placeholders | Operator checklist unchanged; PRD-2 adds **task owners** and **definition of done** per file. |

---

## 3. Phased roadmap

### Phase P0 — SPEC literal / UX (highest interview risk)

- P0.1 Model load **progress** + failed-load UX (detector + embedder).
- P0.2 **Camera device / facing** picker (gate + admin); persist setting.
- P0.3 **Detector decision:** execute **Path A or B** from gap table (face ONNX **or** documented two-stage + copy).
- P0.4 Threshold **defaults / documentation** aligned to SPEC “0.75” language.

### Phase P1 — Evidence and tests

- P1.1 Complete **MBP + Chrome** benchmark rows + environment string.
- P1.2 **Accuracy trial** ≥20 faces → fill [`docs/ACCURACY_RESULTS.md`](ACCURACY_RESULTS.md); tune thresholds only with before/after matrix (per PRE-WORK discipline).
- P1.3 **Scenario coverage** for SPECS tests 1–8: map each to Playwright scenario or manual script in [`docs/DEMO.md`](DEMO.md).
- P1.4 **50-user** match latency smoke + **15 FPS** preview measurement protocol.
- P1.5 **2s** permission-to-preview and **<2s** pipeline (deep dive) — document or optimize frame skipping in [`src/app/detection-pipeline`](../src/app/detection-pipeline).

### Phase P2 — Data parity and submission

- P2.1 **Roster JSON export** (+ schema doc cross-link).
- P2.2 **AI cost log** completeness + **production cost** doc.
- P2.3 Close **SUBMISSION.md** pending items (demo link, Pre-Search artifact, architecture PDF path).

### Phase P3 — Exceed (optional)

- P3.1 Liveness / presentation-attack heuristic (printed photo test).
- P3.2 Multi-angle enrollment **or** access scheduling **or** landmark debug overlay.
- P3.3 PDF audit export.

---

## 4. Epic sketches (for PRD.md merge later)

Each epic: **Goal**, **Files likely touched**, **Acceptance**, **SPEC cite**.

- **E-P2.D1** Detector literalism (see gap table).
- **E-P2.U1** Model load progress + retry.
- **E-P2.C1** Camera enumeration + settings persistence.
- **E-P2.J1** Roster JSON export.
- **E-P2.S1** Spoof / liveness MVP.
- **E-P2.E1** Evidence + submission docs.

---

## 5. Acceptance: SPECS “We will test” mapping

| # | SPEC scenario | PRD-2 closure |
| --- | --------------- | --------------- |
| 1 | Feed <2s | P1.5 + documented measurement |
| 2 | Enroll | Already covered; keep E2E |
| 3 | GRANTED <3s | Benchmarks + pipeline |
| 4 | Stranger DENIED / Unknown | Policy + E2E |
| 5 | Printed photo | P3.1 or explicit “best effort” doc if descoped |
| 6 | Two people | Multi-face UI + tests |
| 7 | IndexedDB persist | Existing; scenario refresh |
| 8 | Log complete | Log page + CSV; optional PDF |

---

## 6. Out of scope (explicit)

- Server-side inference or cloud face APIs (violates canon).
- Training YOLOv9 from scratch (SPEC forbids).

---

## 7. Success criteria for “PRD-2 complete”

- [ ] Gap register: every row **closed** (done) or **WAIVED** with signed rationale in this file.
- [ ] `SPECS.txt` deep-dive **progress bar** and **mobile cameras** implemented or waived **only** with course staff–approved waiver text.
- [ ] Benchmark + accuracy tables: no `_PENDING_` for canonical MBP+Chrome rows.
- [ ] `SUBMISSION.md`: no `_PENDING_` for graded artifacts the operator intends to submit.

---

## 8. Revision history

| Date | Author | Notes |
| ------ | -------- | ------- |
| 2026-04-24 | PRD-2 draft | Initial gap synthesis from SPECS + repo audit. |
