# PRE-WORK — Canonical pre-PRD handoff (Gatekeeper)

**Purpose:** This file is the **canonical AI-agent handoff** for drafting `docs/PRD.md`. It normalizes immutable assignment law, locked project defaults, evidence-backed baselines from completed pre-implementation probes, explicit open decisions, and PRD carry-forwards.

**Compiled:** 2026-04-17.

**Repo note:** `docs/PRE-SEARCH.md`, `docs/PRE-PRD.md`, and the `spikes/` tree were **removed from the working tree** after this synthesis. **Durable conclusions live here**; raw tables, repro commands, and the Epic 9 playbook live in **git history** if you need to recover them.

**Override rule:** If anything here conflicts with `docs/SPECS.txt`, **`SPECS.txt` wins**. Treat conflicts as documentation bugs in this file, not as relaxable requirements.

---

## Source hierarchy

| Priority | Source | Role |
| ---: | --- | --- |
| 1 | `docs/SPECS.txt` | Immutable authority: MVP, pipeline, enrollment/logging, tests 1–8, performance floors, stretch list, AI cost categories, submission hooks. |
| 2 | `docs/PRE-WORK.md` (this file) | Normalized project brief: `[HARD FLOOR]` / `[LOCKED]` / `[PROVEN]` / `[OPEN]` / `[PRD MUST COVER]`. |
| 3 | Git history (optional) | Former `PRE-SEARCH`, `PRE-PRD`, and `spikes/**` only if you need verbatim logs, repro steps, or the archived accuracy playbook. |

**Conflict rule:** **`SPECS.txt`** overrides this file. For anything ambiguous here, prefer the **most recent intentional edit** to `PRE-WORK.md` over stale git snapshots.

---

## As-built repository pointers (keep in sync with code)

Use this when mapping prose in older notes to the **current** tree (supersedes pre-refactor filenames in archived spikes or mental models that put the gate only under `src/ui/`).

| Concern | Where it lives |
| --- | --- |
| HTML entrypoints calling bootstrap | `src/main.ts`, `src/admin.ts`, `src/log.ts` — each uses `void bootstrapApp({ mount, persistence? })` from `src/app/bootstrap-app.ts`. |
| HTTPS check + IndexedDB init + mount | `src/app/bootstrap-app.ts` (inject `persistence` in tests via `createDexiePersistence` from `src/infra/persistence.ts`). |
| Gate page DOM + camera preview + YOLO overlay | `src/app/mount-gate.ts` + `src/app/gate-session.ts` (`wireGatePreviewSession`, optional `yoloDetector` + `#detector-overlay`) + `src/app/pipeline.ts` + `src/app/bbox-overlay.ts`. |
| Face crop + InsightFace embedder ONNX | `src/app/crop.ts` (square margin crop, 112² resize) + `src/infra/embedder-ort.ts` (`createFaceEmbedder`, `toEmbedderTensor`) + `src/app/match.ts` (`l2normalize`) composed by `embedFace` in `src/app/pipeline.ts`. |
| Org titles, camera copy, preview canvas size, DB seed snapshot, dev FPS flag | `src/app/runtime-settings.ts` (`resolveGateRuntime()`). |
| Default IndexedDB port | `src/infra/persistence.ts` (`getDefaultPersistence`, repo facades, `createDexiePersistence` for isolation). |
| `onnxruntime-web` import boundary | `src/infra/ort-session-factory.ts` (+ re-exports in `onnx-runtime.ts`); ESLint `no-restricted-imports` for `app/*` and `ui/*` only (`eslint.config.ts`). |
| Pure threshold → decision helper | `src/domain/access-policy.ts` (`decideFromMatch`); app façade `src/app/policy.ts` (`decide`). |
| Shared row / match types | `src/domain/types.ts`. |
| Vite multi-page inputs, dev pretty URLs, Netlify redirect TOML canonical string | `multi-page.ts`; keep `netlify.toml` aligned with `pnpm sync:netlify` or `pnpm verify:netlify` (see `README.md`). |
| Thin admin/log HTML shells | `src/ui/admin-view.ts`, `src/ui/log-view.ts`, `src/ui/page-shell.ts`. |

**Authoritative layout:** `docs/PRD.md` §2.7 repository tree + `README.md` **Source layout (current)**.

---

## [HARD FLOOR] Spec requirements (from `SPECS.txt` only)

Normalized checklist—**not** a full reprint of `SPECS.txt`.

**MVP (24h gate — all required)**

- Webcam: live feed; `getUserMedia`; front/rear on mobile called out in spec stack section.
- **YOLOv9** loaded and running **in-browser** via **ONNX Runtime Web** or **TensorFlow.js** (per spec stack section).
- Face detection: bounding box on detected face in live feed.
- **≥ 3** enrolled users locally with **name, role, reference face image** (full enrollment section also requires **ID**, role/department, **embedding**).
- Single face-to-face comparison returning a **similarity score** (spec: cosine similarity **or** Euclidean distance).
- **GRANTED / DENIED** (and spec evaluation rows add **UNCERTAIN**-class behavior) with threshold logic; basic UI: live feed, detection overlay, match result, user info on match.
- **Entire ML inference client-side** — **zero server calls for ML inference**.
- **Deployed** public HTTPS URL (GitHub Pages, Netlify, or Vercel per spec).

**Pipeline (three independently testable stages)**

1. **Detection:** raw frame → bbox + confidence — YOLOv9 ONNX (per deep dive).
2. **Extraction:** cropped face → embedding **128-d or 512-d** (spec range).
3. **Matching:** live embedding vs enrolled DB → best match ID + similarity — **cosine** in JS (spec deep dive).

**Enrollment / data**

- DB fields: name, ID, role/department, reference face image, embedding.
- Enrollment: admin capture → embedding → save; **CRUD** for users.
- **IndexedDB** persistence; optional JSON export/import for backup (spec).
- Images as Base64/Blob in IDB.
- **Bulk JSON import** with multiple records + face images (spec feature list).

**Access / logging**

- Decision UI: **GRANTED** (green) / **DENIED** (red) with matched name + confidence.
- **Entry log:** every attempt — timestamp, matched user or **`Unknown`**, similarity score, decision.
- **Log viewer:** admin page — **sortable, filterable** table.
- **Side-by-side** enrolled reference vs captured frame on match (human verification).
- **Cooldown:** **≥ 3 seconds** between verification attempts.
- **Multi-face:** highlight each; require single-person verification (no GRANTED until resolved).

**Testing scenarios 1–8 (scripted)**

1. Chrome: webcam within **2 s** of granting permission.
2. Admin enroll: capture face, name/role, save OK.
3. Enrolled user: **GRANTED** + correct name within **3 s**.
4. Unenrolled: **DENIED** + **`Unknown`**.
5. Printed photo of enrolled user: ideally detect/flag (anti-spoof **stretch** elsewhere).
6. Two people in frame: handle gracefully — reject or prompt single-person.
7. Refresh: enrolled users persist (IDB).
8. Entry log shows prior attempts with correct timestamps/decisions.

**MVP / grading performance targets**

- Detection: **&lt; 500 ms**/frame (modern laptop, Chrome).
- End-to-end verification: **&lt; 3 s** frame capture → access decision.
- Cold model load: **&lt; 8 s** initial page load.
- Similarity accuracy: **≥ 85%** TPR at **≤ 5%** FPR on **≥ 20** faces.
- Capacity: **≥ 50** enrolled users without degraded matching.
- Preview: **≥ 15 FPS** while detection runs in background.

**Deep-dive pipeline targets (optimization tier — do not conflate with MVP floors)**

- ONNX file **≤ 25 MB** (INT8 preferred).
- Detection: **&lt; 200 ms** (WebGL laptop), **&lt; 800 ms** (WASM CPU-only).
- Embedding: **&lt; 150 ms**/cropped face.
- Total pipeline detect+embed+match: **&lt; 2 s**.
- Tab memory: **&lt; 500 MB** during active scanning.

**Stretch**

- Implement **≥ 3** of the seven listed stretch features (spec list: liveness, confidence meter, multi-angle enrollment, scheduling, audio, landmark overlay, audit export).

**AI cost analysis (required deliverable categories)**

- LLM API costs (ChatGPT/Claude/Copilot, etc.).
- Approximate token usage (in/out) across AI-assisted sessions.
- Model conversion costs (time/compute PyTorch → ONNX → quantized ONNX).
- Training/fine-tuning costs if any (GPU hours/cost).
- Testing compute (profiling, benchmarks, any cloud test resources).
- **Production cost projections** table (hosting, ~25 MB model transfer, IDB $0, optional backup/analytics rows) with stated assumptions—per `SPECS.txt` table and bullets.

**Also hard-floor from spec narrative**

- Model load **progress** + **graceful failure** on download errors.
- ONNX integration pattern: `webgl` + `wasm` EP order, graph optimization, example preprocess/tensor shapes in spec snippet (implementation must align with chosen checkpoint I/O—see `[PROVEN]`).

---

## [LOCKED] Project decisions (non-contradictory with `SPECS.txt`)

- **Frontend:** Vanilla HTML / CSS / JS (no React/Vue for this repo).
- **Hosting:** **Netlify** (spec allows GH Pages / Netlify / Vercel).
- **ML runtime default:** **ONNX Runtime Web** (`onnxruntime-web`); TF.js only as spec-permitted last resort on fallback list.
- **Detector narrative:** **YOLOv9 primary** with **ordered fallback path** (smaller v9 / lower input / INT8 → YOLOv8-face-class → BlazeFace-class → TF.js last)—escalate only on logged gate failure; **exact shipped checkpoint for product** remains `[OPEN]` vs proven COCO-tiny artifact below.
- **IndexedDB in production app:** **Dexie.js** wrapper.
- **Matching geometry:** **Cosine** on **L2-normalized** embeddings.
- **Displayed / thresholded score:** `similarity01 = (1 + cosine) / 2` ∈ [0,1] so band constants match the adopted evaluation table.
- **Bands:** **strong** `similarity01 ≥ 0.85`; **weak** `[0.65, 0.85)`; **reject** `similarity01 < 0.65`; **Unknown** label applies to reject-band decisions.
- **Weak band:** **`UNCERTAIN` — not access** (no “GRANTED with warning”).
- **Strong GRANTED:** requires **margin `Δ ≥ 0.05`** vs runner-up **when** a runner-up exists (`secondScore` not null).
- **Cooldown:** **3 seconds** between verification attempts (spec: enforce ≥ 3 s).
- **UI:** **Side-by-side** reference vs live capture on match for human verification.
- **Bulk JSON import:** **Required** for assignment parity—build after single-user enroll is stable.
- **Admin credentials:** dev-only **`admin` / `admin`** acceptable **locally only**; **must not ship** on public demos; rotate for any public URL.
- **Demo/legal copy framing:** **Austin, Texas** educational demo posture (not Illinois BIPA primary); still disclose biometric sensitivity locally.
- **Tooling spend default:** **`$0`** cap unless an exception is **explicitly logged** (e.g. `docs/AI_COST_LOG.md`) with reason.

---

## [PROVEN] Evidence-backed technical baseline (pre-implementation probes, 2026-04-17)

**Environment label (non-canonical for interview-grade performance):** Measurements used **Cursor embedded Chromium** (Chrome/142 class, Electron) and/or **Playwright** on deploy smoke—not a substitute for **real MacBook Pro + desktop Chrome** until reruns land in implementation docs.

**Detector / ORT gate zero — `[PROVEN]` (non-canonical EP/latency environment)**

- **Artifact path:** Hugging Face **Kalray/yolov9** **`yolov9t.onnx`** — **COCO general-object** YOLOv9-tiny (~**8.33 MiB**, **FP32**), **not** a face-specialized head. Loads and runs under `onnxruntime-web@1.24.3` with `executionProviders: ['webgl','wasm']`, `graphOptimizationLevel: 'all'`. **Implementation rule:** `onnxruntime-web` is imported in `src/infra/ort-session-factory.ts` (and future embedder infra); `src/infra/onnx-runtime.ts` re-exports session helpers for a single discoverable seam; ESLint blocks `app/*` and `ui/*` from importing `onnxruntime-web` directly.
- **Reality check:** In probe environment, ORT **dropped WebGL** (`backend not found`); successful runs on **WASM**. **Do not claim WebGL detection** without MBP Chrome evidence.
- **I/O tensors (this checkpoint):** input **`images`** `float32` **`[1,3,640,640]`** NCHW **[0,1]**; output **`predictions`** `float32` **`[1,84,8400]`**; toy pipeline later ran decode+NMS on this head.
- **Latency (probe env):** single static `session.run` ~**190 ms**; live-frame median preprocess+infer **~182.9 ms** over **N=12** (warmup excluded).

**Webcam / preview — `[PROVEN]` (non-canonical)**

- Grant → first frame **~359 ms** (SPECS test #1 gate **≤ 2000 ms**).
- Canvas-only preview loop **~120 FPS** (ML off); supports **≥ 15 FPS** with detection margin—detection cadence still to be validated on target HW.

**Crop / tensor contract — `[PROVEN]` (canonical math; revalidate if embedder/detector contract drifts)**

- Bbox space: **canvas pixels**, origin top-left; clamp negatives; **square crop** from `max(w,h)` with symmetric **10% margin** on `max(w,h)` before clamp.
- To embedder: **112×112** uniform scale; tensor **Float32 CHW RGB** `/255` → **[0,1]** at crop boundary; **embedder block below** overrides normalization for model input.

**Embedder — `[PROVEN]` (model artifact canonical; latency non-canonical)**

- **Chosen ONNX:** **`w600k_mbf.onnx`** (InsightFace MobileFaceNet family, buffalo_s / w600k), ~**12.99 MiB**.
- **I/O:** input name **`input.1`**, shape **`[1,3,112,112]`** NCHW RGB `float32`; preprocess **`(pixel - 127.5) / 127.5`**; output name **`516`**, shape **`[1,512]`**; **L2-normalize in JS** before cosine.
- **Sanity (probe):** same-identity vs cross-identity cosine ordering passed informal check (numeric table was in archived spike notes / git history).
- **Latency (probe env, WASM-only path):** embed p50 ~**18.9 ms**, p90 ~**19.2 ms** over **n=22** (meets **&lt; 150 ms** deep-dive embed target in that environment).

**Matching / policy — `[PROVEN]` (reference behavior)**

- L2 normalize → cosine → `similarity01`; best + optional second; **margin Δ ≥ 0.05** for strong grant when runner-up exists; weak → **UNCERTAIN**. Reimplement in the app from this spec (unit tests were in removed spike tree).

**Toy end-to-end pipeline — `[PROVEN]` (non-canonical wall times; architecture shortcut honest)**

- Chain: detect (YOLO decode+NMS + **head-band heuristic on COCO person box**) → crop contract above → `w600k_mbf` → match bands.
- **Scores (toy):** same-person `similarity01` ~**0.9228** (strong); stranger ~**0.4965** (reject).
- **Timing (measured probe):** cold ORT sessions ~**375 ms**; steady-state total **~462 ms** (&lt;&lt; **3 s** MVP budget). Dominant cost: detection path.

**50-user IndexedDB headroom — `[PROVEN]` (non-canonical browser)**

- 50 synthetic users (512-d + small thumbs): **no quota errors**; `storage.estimate` order-of-magnitude headroom on verify host; brute-force cosine scan microbenchmark ~**0.017 ms**/50-dot inner timing (order-of-magnitude only).

**Netlify / deploy — `[PROVEN]` + canonical naming**

- **HTTPS** deploy smoke OK; **`getUserMedia`** smoke verified on deployed origin (human + automated notes in archived epic 8 artifacts).
- **Canonical Netlify site name:** **`let-me-in-gatekeeper`** → **`https://let-me-in-gatekeeper.netlify.app`** when created/renamed.
- **Historical / interim deploy URL** existed as **`https://let-me-in-epic8-e2e-1776463762.netlify.app`** — replace bookmarks after rename (not a product interface).
- **Cold load (Playwright sample):** ONNX resource durations ~**330 ms** each (parallel wall smaller); logged **cold session create ~920 ms**; wall click→pipeline done ~**1592 ms** — **under 8 s** MVP cold budget in measured run.
- **`_headers`:** `/models/*` **`Cache-Control: public, max-age=3600`** on the published static root used for the smoke deploy.
- **ORT scripts/WASM hosting default:** **jsDelivr** for MVP (documented owner decision in archived findings).

**Epic 9 accuracy protocol — `[PROVEN]` process, `[OPEN]` measurement**

- Written protocol + SPECS mapping were completed and **E9-T6 signed off** 2026-04-17 (playbook lived under removed `spikes/epic-09-accuracy-protocol/` — **recover from git** or **re-embed the procedure in `PRD.md`** before trials).
- **Formal measured ≥20-face TPR/FPR** per spec: **implementation-phase** obligation.

**Observability / AI cost — `[PROVEN]` scaffolding only**

- `docs/AI_COST_LOG.md` exists with template + rules. Detailed billing-portal bookmark lists were intentionally **not** duplicated here and lived in removed spike notes—rebuild from provider sites as needed.

---

## [OPEN] Decisions `PRD.md` must resolve

- **Final detector story for shipped product:** ship **honest COCO/person-box shortcut** vs swap to **face-specific ONNX** (YOLOv8-face-class / face-YOLO export) vs **two-stage** ROI detector—include interview/defense narrative and revalidation scope if changing artifact.
- **ORT asset hosting:** keep **jsDelivr** for `onnxruntime-web` vs **vendor same-origin** (policy / CSP / third-party risk).
- **User deletion vs logs:** on **admin delete user**, whether **`accessLog` rows** are deleted, anonymized, or orphaned with raw IDs—pick one documented behavior.
- **Exact UX strings:** finalized copy for **`Unknown`**, **`No face detected`**, **multi-face prompt** (spec gives intent; PRD owns wording).
- **Which 3 stretch features** are committed (spec requires ≥ 3); default suggestion was confidence meter + audio + multi-angle enrollment—**confirm or replace** in PRD.
- **Epic 9 execution:** formal **≥20-face** trial schedule, data handling/consent, and **threshold retune policy** (only with before/after confusion matrix—no silent edits); **import or rewrite playbook** after `spikes/` removal.
- **Public admin credential rotation mechanism:** env-based / Netlify build-time secret / per-deploy password distribution—**must** be defined before public demos.
- **Canonical benchmarks:** rerun latency + EP truth on **real MBP Chrome** for submission/architecture PDF numbers; probe numbers remain **non-canonical** until then.

---

## [PRD MUST COVER] Build priorities (recommended implementation order)

1. **Schema / storage** — Dexie versioned stores (`users`, `accessLog`, `settings`), migrations, `lastVerificationAt`/cooldown fields.
2. **Admin CRUD** — single-photo enroll first; embedding + reference image persistence.
3. **Live gate UI** — camera, overlay, decision bands, cooldown UX.
4. **Entry log** — append every attempt; then **sortable/filterable** admin table.
5. **Bulk JSON import** — schema validation, duplicates, parity with single-user record shape.
6. **Side-by-side + audit export polish** — human verify view; CSV/PDF export as stretch alignment.
7. **Scripted testing scenarios 1–8** — QA checklist and/or automation pass before demo record.

---

## Appendix: Source map (durable takeaways only)

| Former source (removed) | Now |
| --- | --- |
| `docs/SPECS.txt` | Still authoritative; summarized under `[HARD FLOOR]`. |
| `docs/PRE-SEARCH.md` | Distilled into `[LOCKED]` + `[OPEN]` + rationale implicit in `[PROVEN]` caveats. |
| `docs/PRE-PRD.md` | Epic tables and handoff text distilled into this file; full text in git history. |
| `spikes/**` | Evidence numbers and repro context merged into `[PROVEN]`; **Epic 9 playbook** and **verbose FINDINGS** — git history only unless copied into `PRD.md`. |
| `docs/AI_COST_LOG.md` | **Still in repo**; append rows during implementation—referenced from `[LOCKED]` / `[HARD FLOOR]`. |

**Intentionally excluded from this handoff (see original brief):** agent prompt templates, supervisor STOP gates, per-task spike checklists, long billing-portal walkthroughs, duplicate Appendix A questionnaire text, low-signal procedural spike instructions.
