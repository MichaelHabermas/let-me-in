# Gatekeeper — Pre-Search Document

**Purpose:** Complete Appendix A of `docs/SPECS.txt` before writing code. This file is the written record of constraints, decisions, and rationale. It is scoped to **Pre-Search only** (no implementation work in this phase).

**Last updated:** 2026-04-17 (parity locks, performance tiers + pass-gate philosophy; Appendix A complete)

---

## Hard requirements (assignment — non-negotiable)

These consolidate `SPECS.txt` § MVP Requirements, § User Enrollment & Data Management, § Access Control & Logging, § Performance Targets, and § Deep Dive pipeline expectations. Architecture and spikes must satisfy all of them for a complete Gatekeeper submission.

| Requirement | Spec detail |
| ------------- | ------------- |
| Webcam | Live feed; `MediaDevices.getUserMedia()`; front/rear on mobile |
| Detection model | **YOLOv9** (primary); ordered fallbacks below if export/ORT-web blocks **in-browser** via **ONNX Runtime Web** or TensorFlow.js |
| Detection UX | Bounding box on detected face in live feed |
| Enrollment | ≥ **3** users locally; **MVP line:** name, role, reference face image — **full enrollment spec:** stable **user ID** in storage, role/department field, embedding after capture |
| Matching | Similarity score (**cosine** on **L2-normalized** embeddings; spec allows Euclidean — not chosen) |
| Decision | Threshold-driven GRANTED/DENIED; **this project adopts the evaluation bands** (see below), not the standalone “≥ 0.75 default” line in isolation |
| UI (basic) | Live camera, detection overlay, match result, user info on match |
| UI (access control) | **Side-by-side** enrolled reference photo vs live capture on match (human verification) |
| Entry log | **Every** attempt: timestamp, matched user or `Unknown`, similarity score, decision |
| Log viewer | Admin page: **sortable, filterable** table of attempts |
| Cooldown | **≥ 3 s** between verification attempts (anti hammering) |
| Inference | **Zero server calls for ML inference** |
| Deploy | Public URL; **spec:** GitHub Pages, Netlify, or Vercel — **this project locks Netlify** |
| Loading | Progress bar; graceful handling of model download failure |
| Pipeline | Detection → crop → embed → match; **each stage independently testable** |
| Preview perf | Webcam preview **≥ 15 FPS** while detection runs in background (spec performance table) |

**Performance targets — two tiers (`SPECS.txt` has both; do not conflate them):**

| Tier | When it applies | Targets |
| ---- | ----------------- | -------- |
| **MVP / grading** | 24h MVP + written test scenarios | Face detection **&lt; 500 ms**/frame (modern laptop, Chrome); capture → decision **&lt; 3 s**; cold model load **&lt; 8 s**; **≥ 85%** TPR at **≤ 5%** FPR on **≥ 20** faces; **≥ 50** enrolled without degraded matching; preview **≥ 15 FPS** with detection running |
| **Deep-dive / optimization** | Pipeline section + architecture PDF | ONNX file **≤ 25 MB** (INT8 preferred); detection **&lt; 200 ms** (WebGL laptop), **&lt; 800 ms** (WASM CPU-only); embedding **&lt; 150 ms**/face; **total** detect+embed+match **&lt; 2 s**; tab memory **&lt; 500 MB** while scanning |

Treat **deep-dive** numbers as the **stretch budget** once MVP passes; spike and document where you land on MBP first.

**Performance philosophy:** Figures in `SPECS.txt` are **minimum pass thresholds** (grading, demos), not the optimization target. Within sprint and model constraints, **optimize for margin**: lower latency, better quality, and robust behavior across lighting and hardware—not tweaks that barely clear a number on a narrow case. The latter usually fails under real use.

**Submission alignment:** Pre-Search artifact; later architecture PDF; **AI cost analysis** required (`SPECS.txt`).

---

## SPECS feature parity (full assignment, not only the MVP bullet list)

Use this during implementation so product/UI work is not under-scoped next to ML spikes.

| Spec area | Requirement (`SPECS.txt`) | Pre-search disposition |
| --------- | ------------------------- | ---------------------- |
| Enrollment | Admin flow: capture → embedding → save; CRUD for users | **Required** — `users` store + admin UI |
| Enrollment | Optional **JSON export/import** for backup | **Defer** after CRUD stable; same schema as bulk import |
| Enrollment | **Bulk import:** upload JSON with multiple records + face images | **Required** for spec parity (not optional at submission); **build order:** after single-user enroll is stable |
| Access | GRANTED/DENIED + name + confidence | **Required** — see § Matching |
| Access | Side-by-side photos on match | **Required** |
| Access | Entry log + **sortable, filterable** viewer | **Required** |
| Access | **3 s cooldown** between verifications | **Required** |
| Multi-face | Detect multiple → prompt single person; no GRANTED until one face | **Required** — § Matching |
| Anti-spoof | Printed photo → DENIED or flag | **Stretch** — § Phase 3 |
| Stretch picks | **Implement ≥ 3** of seven listed enhancements | **Choose after MVP:** e.g. confidence meter + audio feedback + audit CSV export align with logging/UI already planned |
| Docs / submit | Architecture PDF, demo video scenarios, AI cost table | **Out of scope** for this file; tracked by assignment |

---

## Locked project decisions (this pre-search)

| Area | Choice | Notes |
| ------ | -------- | -------- |
| Frontend | **HTML5 + CSS3 + Vanilla JS** | No React/Vue for this codebase |
| Hosting | **Netlify** | Day-one deploy target; HTTPS for camera |
| Benchmark hardware | **MacBook Pro (Apple Silicon, “M5 Pro” per your plan)** | Primary profiling machine; document exact chip/OS/Chrome version when you measure |
| Admin access | **Password-protected** | **Dev-only:** username `admin`, password `admin` until replaced; **do not** ship public demos with these credentials |
| Demo / legal context | **Austin, Texas** | Not Illinois; still document biometric data sensitivity for README/interviews |
| Similarity policy | **Evaluation bands** | See § Matching & decision logic |
| ML runtime (default) | **ONNX Runtime Web** | Matches spec sample; TF.js remains alternate if a chosen weight **only** ships there |
| Face detector (primary) | **YOLOv9** | Interview and spec alignment; fallbacks are **contingency only** |

---

## Ordered detector fallback list (contingency)

**Primary (locked):** **YOLOv9** → ONNX → `onnxruntime-web` (WebGL, WASM fallback).

Switch to the next step only when the current step **fails after a timeboxed effort** (export errors, unsupported operators, unusable latency on your MacBook, or unstable boxes on webcam crops).

| Order | Model / path | When to adopt | Why it’s next |
| ------- | ---------------- | --------------- | ---------------- |
| **1** | **YOLOv9** (your chosen face-det checkpoint) | Default | Meets spec headline; best interview story |
| **2** | **YOLOv9** same family, **smaller width/depth** or **lower input** (e.g. 640→512/320) + INT8 if needed | v9 loads but **&gt;500 ms/frame** or tab **&gt;500 MB** | Keeps “YOLOv9” narrative while hitting perf budget |
| **3** | **YOLOv8-face** (or Ultralytics-exported YOLOv8 **face** ONNX) | v9 **export or ORT-web op** path is blocked | Spec-permitted; fastest “YOLO-class” recovery |
| **4** | **BlazeFace**-class or similar **lightweight** face detector ONNX | Still blocked or need **&lt;200 ms** detection budget on GPU laptop | Proves pipeline; weaker on hard faces — document tradeoff |
| **5** | Revisit **TensorFlow.js** only if a **required** weight **cannot** be served as ORT-compatible ONNX | Rare | Last resort; breaks stack uniformity |

**Interview line:** “We committed to **YOLOv9** first; we escalated fallback **only** when [specific failure], per our pre-search order.”

---

## 1. Detector choice: cost benefits and tradeoffs

“Cost” here means **calendar time**, **risk**, and **operational** cost (bandwidth/hosting are similar ~25 MB class models on static hosting).

| Option | Benefits | Tradeoffs |
| -------- | ---------- | ----------- |
| **YOLOv9 face (spec headline)** | Aligns with assignment wording and interview prompts; strongest story if conversion succeeds | Highest **conversion + ORT-web operator** risk; may need longest **debug loop** (export, NMS, I/O shapes, EP quirks) |
| **YOLOv8-face (or similar YOLO-family face detector)** | Usually **faster path** to a working ONNX; tutorials/checkpoints abundant; still “YOLO-class” detection story | Slightly off literal “v9” name — document honestly as spec-permitted alternative |
| **BlazeFace (or comparable lightweight detector)** | Often **smallest / fastest** in browser; great **Day-1 spike** to prove `getUserMedia` → tensor → ORT-web → boxes | Weaker on tiny/hard faces vs heavier YOLO; different architecture — still valid as **fallback** or comparison |

**Pre-search execution order (no implementation in this doc):**

1. **YOLOv9** export + ORT-web load is **gate zero** (spec build strategy).
2. If gate zero fails, follow **Ordered detector fallback list** — do not ad-hoc swap models without logging the reason.
3. **Interview framing:** “We committed to **YOLOv9**; we fell back only when [failure mode] per our ordered list.”

**Hosting note (Netlify):** static asset delivery and HTTPS are suitable for ~25 MB models; watch **build/deploy size limits** on free tier and use **long-cache headers** for versioned model filenames so repeat visits avoid re-download.

---

## 2. Embedding model — spike plan (timeboxed)

**Goal:** Before building enrollment UI, prove a **pre-converted** face-embedding ONNX runs in **onnxruntime-web**, returns a **fixed-length** vector, and pairs behave sensibly under **cosine similarity** after **L2 normalization**.

**Spike duration (suggested):** 2–4 focused hours first touch, plus a short follow-up after detector crop is stable.

| Step | What to prove | Pass criteria |
| ------ | ---------------- | --------------- |
| S1 — Shortlist | Pick **2–3** candidate models (e.g. **MobileFaceNet**, **ArcFace**/InsightFace-family ONNX, **FaceNet**-style if license OK) | Each: license OK for your use, **ONNX** available or you own export, **input size** and **output dim** documented |
| S2 — Load | `InferenceSession.create` with `webgl` then `wasm` fallback | Session creates without operator errors; load time noted |
| S3 — Tensor contract | One **synthetic** crop (fixed image) → preprocess exactly as model expects | Output tensor shape matches doc (e.g. 128-d or 512-d) |
| S4 — Similarity sanity | Same person two crops vs two different people | Same-person cosine **higher** than different-person on average (small informal set) |
| S5 — Latency | Repeat N runs | Embedding stage &lt; **150 ms** target on your MacBook where possible; record WebGL vs WASM |

**Artifacts to capture for the architecture doc later:** exact model name, input resolution, normalization (mean/std or [0,1]), output dimension, EP used, milliseconds per embed.

---

## 3. Matching & decision logic (evaluation bands)

Adopted from `SPECS.txt` **Evaluation Criteria** table and test scenarios. **Cosine similarity** on **L2-normalized** embeddings.

| Scenario (spec) | Expected behavior | Similarity interpretation |
| ----------------- | ------------------- | --------------------------- |
| Enrolled, good lighting | GRANTED + correct name + score **≥ 0.80** | **Strong accept** band |
| Enrolled, low light / partial occlusion | **GRANTED or UNCERTAIN** + score **≥ 0.65** | **Weak accept** band — UI should not look “full green” at 0.66 |
| Unenrolled | DENIED + **Unknown** + score **&lt; 0.60** (best match still below bar for “known”) | **Reject** band |
| No face | No detection — show **No face detected** | No embedding |
| Two faces | Message: multiple faces; require single person | No GRANTED until single face |

**Implementation mapping (pre-search agreement):**

- Compute **best** enrolled match = highest cosine vs all gallery embeddings (after normalization).
- **GRANTED (strong):** best ≥ **0.80** and second-best is not tied within a dangerous margin (optional **margin rule** to add during implementation: e.g. require **Δ ≥ 0.05** vs runner-up to reduce wrong-ID).
- **UNCERTAIN / weak accept:** best in **[0.65, 0.80)** — show **UNCERTAIN** or GRANTED-with-warning per product choice; spec allows either; **bias to UNCERTAIN + re-prompt** reduces false entry.
- **DENIED:** best **&lt; 0.65**, or **&lt; 0.60** for “unknown” narrative alignment with spec’s unenrolled row.

*Note:* The feature list mentions default threshold **≥ 0.75**; **this project standardizes on the eval bands** above for clarity with graded tests.

---

## Phase 1: Constraints (filled + remaining)

### Scale & load

| Question | Resolution |
| ---------- | ------------ |
| MVP users | ≥ **3** enrolled |
| Spec scale | **≥ 50** without degraded matching |
| Latency | **&lt; 3 s** capture → decision (MVP); **&lt; 2 s** pipeline stretch from deep dive |
| Throughput | Treat as **single kiosk** unless you later specify burst |

### Budget & resources

| Question | Resolution |
| ---------- | ------------ |
| AI/ML tool spend (this week) | **$0 cap — free tiers / included tooling only.** If unavoidable paid use arises (e.g. required API), log exception in `docs/AI_COST_LOG.md` with reason. |
| Hosting | **Netlify**; static-first; model as CDN-served asset |
| Conversion GPU | **Apple Silicon** (MacBook) first; **free-tier Colab** (or equivalent) as **one-session backup** if local PyTorch→ONNX fails — stays within $0 unless you explicitly break the cap |

### Privacy & compliance (Austin, TX)

| Topic | Pre-search note |
| ------- | ----------------- |
| Storage | **IndexedDB** only for MVP; images + embeddings |
| Texas | **No Illinois BIPA** in your demo jurisdiction; still **disclose** face biometrics, local-only processing, and deletion via admin CRUD |
| README one-liner (draft intent) | Educational demo; biometric templates stored locally in the browser; not a production access-control product |

### Admin authentication

| Topic | Pre-search note |
| ------- | ----------------- |
| MVP | Password gate on enrollment/admin routes |
| Development | **`admin` / `admin`** acceptable **locally** only |
| Before any public URL | Rotate credentials; prefer **env-based** or Netlify **build env** for a non-default password; **never** commit real secrets |

---

## Phase 2: Architecture discovery (summary)

| Area | Direction |
| ------ | ----------- |
| Detector | **YOLOv9** primary; **Ordered detector fallback list** for contingency |
| Embedder | **Spike** 2–3 ONNX options; pick smallest that meets accuracy/latency |
| Runtime | **onnxruntime-web**, `webgl` + `wasm` fallback |
| Storage | Users + embeddings + logs + settings in **IndexedDB** via **Dexie.js** (locked for vanilla JS ergonomics) |
| Webcam | Match capture resolution to model pipeline; **letterbox** to square if detector expects 640×640 |
| Workers | Defer: profile on main thread first, then consider Worker for detection or embedding |

---

## Phase 3: Security, testing, deploy (summary)

| Topic | Direction |
| ------- | ----------- |
| Spoofing | **Stretch** per spec; test case expects DENIED or flag for **printed photo** |
| Model load failure | User-visible error + retry |
| Testing | Build **20+** identity informal set; target **≥ 85%** TPR at **≤ 5%** FPR per spec; run through **all eight** scripted test scenarios in `SPECS.txt` (webcam latency, enroll, match, unknown, photo spoof, two-face, **persistence after refresh**, **log viewer**) |
| Product / UX | **Cooldown 3 s**; **side-by-side** match view; **log viewer** (sort + filter); **bulk JSON import** (parity-required) after single enroll path |
| Browsers | **Chrome** primary on MacBook; Safari/WebKit second for camera + WASM |
| Netlify | Verify **CORS** for same-origin model fetch; **HTTPS** for `getUserMedia` |

---

## AI development cost tracking — automate as much as possible

**Requirement (`SPECS.txt`):** track LLM spend, **approximate token usage**, conversion/compute time, and testing compute for the **AI Cost Analysis** deliverable.

**Principle:** **Instrument and schedule automation on day zero of implementation** (the first day you touch code after Pre-Search). Anything that *can* be automated without blocking shipping **should** be; the remainder gets a **low-friction** manual fallback so the submission table stays honest.

### Do as early as possible (setup once)

| Action | Automation level | When |
| -------- | ------------------ | ------ |
| Turn on **billing alerts** + email receipts on every paid provider (OpenAI, Anthropic, etc.) | Provider-native | Before first paid API call |
| Bookmark **usage dashboards** (each vendor); calendar **weekly 10-min** “export or screenshot usage” | Semi-automated (scheduled human) | First day of the sprint |
| Cursor: note where **plan usage / invoices** live; same weekly slot | Semi-automated | First day |
| Create **`docs/AI_COST_LOG.md`** with a one-row template (date, tool, task, est. tokens in/out, est. $, notes) | Template = instant; rows still appended | First day (empty file + headers only is fine) |
| Decide **single source of truth** for “total spend”: sum of **provider invoices** where available, plus **Cursor** line item if separate | Process | First day |

### Automate where APIs / exports exist (do when you start coding)

| Source | What to automate | Limit |
| -------- | ------------------ | -------- |
| **OpenAI / Anthropic** (if you use HTTP APIs) | Scheduled **usage export** or weekly download; optional small script if you use **official usage/billing APIs** (account permissions required) | Cursor-included models may **not** appear in API usage |
| **Git** | `git log --since` for “ML-related” commits doesn’t give tokens — use only as a **timeline** cross-check | Not a cost proxy |
| **Conversion jobs** | Log **wall-clock** + environment (local vs Colab) in `AI_COST_LOG` or a `conversion-notes.md` — can be a **one-line script** that appends timestamp + command | You still type GPU SKU |

### Hard-to-automate (minimize pain)

| Gap | Mitigation |
| ----- | ------------ |
| IDE chat **without** per-message token export | After **heavy** sessions, one log row: “Cursor session — rough scale medium/large” + optional screenshot of usage page |
| **Estimated** tokens | Mark column **est.**; spec allows approximation |

### Recommended default stack

1. **Provider dashboards + billing email** = authoritative **$** for API usage.  
2. **`docs/AI_COST_LOG.md`** = narrative + estimates + conversion time (append after big sessions, or daily 2-min habit).  
3. **Weekly calendar event** = reconcile log vs dashboard so the final submission table isn’t a last-night scramble.

**Token estimates:** when exact counts are unknown, record **assumptions** and mark **est.** — spec asks for approximate totals, not forensic precision.

---

## Decisions log

| ID | Decision | Rationale | Date |
| ---- | ---------- | ----------- | ------ |
| D1 | Client-side only for ML inference | MVP hard requirement | 2026-04-17 |
| D2 | Cosine similarity on L2-normalized embeddings | Spec critical guidance | 2026-04-17 |
| D3 | HTML5/CSS3/Vanilla JS | Project lock | 2026-04-17 |
| D4 | Netlify | Project lock | 2026-04-17 |
| D5 | Primary benchmark: MacBook Pro Apple Silicon | Your hardware | 2026-04-17 |
| D6 | Admin password gate; dev credentials `admin`/`admin` | Ease of dev; must rotate for public | 2026-04-17 |
| D7 | Jurisdiction for copy: Austin, TX | Your answer | 2026-04-17 |
| D8 | Decision bands from **Evaluation Criteria** table | Your lock; aligns with grading tests | 2026-04-17 |
| D9 | Default runtime: onnxruntime-web | Spec sample + stack fit | 2026-04-17 |
| D10 | Primary face detector: **YOLOv9** | Project lock; fallbacks ordered | 2026-04-17 |
| D11 | AI cost tracking: **automate early** (alerts, dashboards, scheduled export) + **`docs/AI_COST_LOG.md`** + weekly reconcile | Submission + minimal manual drift | 2026-04-17 |
| D12 | Weekly AI spend cap | **$0** — free tier only; exceptions logged | 2026-04-17 |
| D13 | Sprint time split | **~50%** model pipeline / **~50%** application | 2026-04-17 |
| D14 | Skills baseline | Strong **JavaScript**; **limited** browser ML + face models — see § Owner-recorded answers | 2026-04-17 |
| D15 | IndexedDB wrapper | **Dexie.js**, Vanilla JS velocity | 2026-04-17 |
| D16 | Detector input default | **640×640** letterboxed; **320** only if profiling forces, `SPECS.txt` + perf | 2026-04-17 |
| D17 | Quantization | **INT8** first; **FP16** fallback if recall collapses, Spec preference | 2026-04-17 |
| D18 | getUserMedia | `ideal` **1280×720** `facingMode: 'user'`; accept down to **640×480**, Pipeline table + letterbox | 2026-04-17 |
| D19 | Verification cooldown | **3 s** minimum between access attempts (`SPECS.txt` access control) | 2026-04-17 |
| D20 | Entry log UX | Admin **sortable + filterable** table over `accessLog` | 2026-04-17 |
| D21 | Match presentation | **Side-by-side** enrolled reference vs live frame on positive match | 2026-04-17 |
| D22 | Bulk enrollment | **JSON bulk import** — **required** for spec parity; implement after single-user enroll path is stable | 2026-04-17 |

---

## Owner-recorded answers (Appendix A gaps)

Collaborative session — values below are **fixed for this pre-search** unless you explicitly revise them.

| Checklist ref | Question | Recorded answer |
| --------------- | ---------- | ----------------- |
| §2.1 | Budget for AI/ML tools this week | **$0.** Free tiers and included tools (Cursor plan, Colab free, etc.) only. |
| §3.4 | Time: model conversion/spikes vs application | **~50% / ~50%.** Model work includes YOLOv9 export, ORT-web proof, embedding spike; app work includes UI, IDB, Netlify, logging. |
| §5.1–5.3 | Team & skills | **Your words:** strong in **JavaScript**, weaker on the rest. **Interpreted for planning:** **Canvas / 2D image pipelines ~2** (comfort likely high with JS; WebGL/tensor paths still verify in spike); **ONNX Runtime Web / TensorFlow.js ~1** (expect learning curve); **face detection or recognition models ~1** (first deep pass this sprint). **Refine** these numbers honestly after the first spike — they are for risk planning, not résumé claims. |

---

## Technical resolutions (former Partial / Deferred items)

These close Appendix A items that did not need personal preference — **spike or measurement** still proves them in code, but the **decision** is no longer open.

| Topic | Recorded decision |
| -------- | ------------------- |
| **YOLOv9 variant** | Use the **smallest face-det checkpoint that still passes** informal webcam recall at ~1 m. Escalate **small → medium** (or widen input) only if false negatives dominate. **Exact weight file** named in architecture doc after spike. |
| **Conversion path** | PyTorch weights → ONNX (`ultralytics export` and/or `torch.onnx.export`) → `onnx.checker` + optional **onnxsim** → **INT8** quantization path per ORT/onnx tooling → versioned artifact e.g. `yolov9-face-{size}-int8-{date}.onnx`. |
| **ORT-web proof** | **First implementation spike:** load session with `webgl`, fall back `wasm`; log operator failures. Outcome (pass/fail + EP) recorded in spike notes and architecture PDF. |
| **Embedding dimension** | **Spike order:** prefer **512-d** if a **license-clean** ArcFace/InsightFace-style ONNX fits size/latency; else **128-d** MobileFaceNet-class; accept **256-d** if that is the best available export. |
| **Execution providers** | **Chrome on MBP:** `webgl` first, `wasm` fallback; **turn on WebGPU** in ORT-web when your pinned version supports it — verify against release notes. |
| **Slow model download** | Progress UI + **retry/backoff**; long-cache **versioned** URLs on Netlify. **No** custom chunked model loader in MVP unless blocked by host limits. |
| **Web Workers** | **Main thread first** until MVP path works; then **optional Worker for embedding**, then detector, if UI frame time suffers. |
| **Memory ceiling** | Measure with Chrome’s tools during active scan; enforce **&lt;500 MB** spec by **fallback list step 2** (smaller input / INT8 / lighter model). |
| **IndexedDB schema** | **Dexie** stores: **`users`** (id, name, role/department, reference image, embedding vector, timestamps), **`accessLog`** (timestamp, decision, matchedUserId or null, score, optional crop ref), **`settings`** (e.g. hashed admin password, threshold overrides, **lastVerificationAt** for cooldown). |
| **Cooldown** | Enforce **≥ 3 s** between verification attempts using `settings.lastVerificationAt` or equivalent; show user-visible “wait” state if triggered early. |
| **Log viewer** | Admin table bound to `accessLog`: **sort** by column (at least timestamp, decision); **filter** by decision and/or matched user. |
| **Match UI** | On GRANTED/UNCERTAIN with a candidate: show **side-by-side** stored reference image and current frame (or last crop). |
| **Bulk import** | **Required** for assignment parity. Accept JSON (schema in README) mapping to `users` records + image payloads; validate before write; implement **after** manual enroll path works. |
| **IndexedDB max size** | **Expect** browser quota well above MVP; **empirical test** with **50 enrolled** + thumbnails — if quota errors, shrink reference images. Document measured headroom in architecture doc. |
| **Data deletion** | **Admin delete user** removes **user** row; **accessLog** rows either **deleted**, **anonymized**, or **left** with orphaned id — pick one behavior and document. **Formal DSAR** beyond demo scope; README states educational use. |
| **Embedding drift** | **Re-enrollment** via admin only for MVP. |
| **Inference logging “in production”** | Static demo: expose **stage timings** behind **`?debug=1`** and/or **localStorage** flag so graders can profile without a separate build. |
| **False pos/neg diagnosis** | **Dev-only:** optional **download JSON** or **IDB debug bucket** with last N scores + crop metadata; **off** by default; never exfiltrate without explicit local action. |
| **Low-end devices** | **Class benchmark:** MBP primary; **WASM** path documents CPU-only behavior; optional **one** older machine smoke test if time permits. |

---

## Resolved collaborative questions (reference)

1. **Tradeoffs:** See § Detector choice.  
2. **Embedding:** See § Spike plan.  
3. **Stack:** Vanilla JS.  
4. **Hosting:** Netlify.  
5. **Hardware:** MacBook Pro (Apple Silicon).  
6. **Admin:** Password-protected; `admin`/`admin` for local dev only.  
7. **Region:** Austin, Texas.  
8. **Thresholds:** Evaluation bands (0.80 / 0.65 / 0.60 narrative).  
9. **AI costs:** See § AI development cost tracking — **automate early**; default stack = dashboards + `AI_COST_LOG.md` + weekly reconcile.  
10. **Access-control UX (spec):** Cooldown, entry log + viewer, side-by-side match, bulk import — § **SPECS feature parity**; **D19–D22**.

---

## Appendix A checklist coverage (`SPECS.txt`)

Status meanings: **Recorded** = answered here; **Spike** = procedure decided; **prove in spike** = pass/fail and numbers captured in implementation notes / architecture PDF (not unknown).

### Phase 1: Define your constraints

| # | Topic | Status | Where / what |
| --- | -------- | -------- | ---------------- |
| 1.1 | Users at launch / max | **Recorded** | MVP ≥3; spec ≥50 — § Phase 1 Scale |
| 1.2 | Verifications per minute | **Recorded** | Single-kiosk assumption — § Phase 1 Scale |
| 1.3 | Max latency capture → decision | **Recorded** | &lt;3 s MVP; &lt;2 s stretch — § Phase 1 Scale |
| 1.4 | Multiple entry points / one DB | **Recorded** | One browser / one camera unless you change scope — § Phase 1 Scale |
| 2.1 | Budget for AI/ML tools this week | **Recorded** | **$0** free tier — § Owner-recorded answers; **D12** |
| 2.2 | GPU for conversion vs CPU-only | **Recorded** | Apple Silicon first; **free Colab** backup — § Phase 1 Budget |
| 2.3 | Target deployment cost / month | **Recorded** | Static/Netlify; align with `SPECS.txt` table — § Phase 1 Budget |
| 2.4 | Free tier vs paid model hosting | **Recorded** | Netlify free tier + watch limits — § Detector / Netlify notes |
| 3.1 | Minimum 24h demo feature set | **Recorded** | § Hard requirements + § SPECS feature parity |
| 3.2 | Highest time-risk pipeline parts | **Recorded** | YOLOv9 ONNX + ORT-web first — `SPECS.txt` + § Ordered fallback |
| 3.3 | Fallback if YOLOv9 ONNX fails | **Recorded** | **Ordered detector fallback list** |
| 3.4 | Time split conversion vs app | **Recorded** | **~50% / ~50%** — § Owner-recorded answers; **D13** |
| 4.1 | Where images/embeddings stored; client privacy | **Recorded** | IndexedDB; local-only — § Privacy |
| 4.2 | Region regulations | **Recorded** | Austin, TX demo; BIPA/EU cited in spec as examples — § Privacy |
| 4.3 | Data deletion | **Recorded** | Admin delete + README scope — § Technical resolutions |
| 4.4 | Raw images vs embeddings; re-ID risk | **Recorded** | Both image + embedding per spec UI; embeddings still sensitive — § Privacy |
| 5.1 | ORT-web / TF.js experience | **Recorded** | Planning baseline **~1** — § Owner-recorded answers; **D14** |
| 5.2 | Canvas / WebGL comfort | **Recorded** | Planning baseline **~2** — § Owner-recorded answers; **D14** |
| 5.3 | Face model experience | **Recorded** | Planning baseline **~1** — § Owner-recorded answers; **D14** |

### Phase 2: Architecture discovery

| # | Topic | Status | Where / what |
| --- | -------- | -------- | ---------------- |
| 2.1 | YOLOv9 variant (tiny/small/medium) | **Recorded** | Smallest that passes recall; escalate if needed — § Technical resolutions |
| 2.2 | Conversion path + tools | **Recorded** | PyTorch → ONNX → check/simplify → INT8 — § Technical resolutions |
| 2.3 | Input resolution 320 vs 640 | **Recorded** | Default **640** letterbox; **320** only if profiling forces — **D16** |
| 2.4 | ORT-web verified; operator issues | **Spike** | First spike logs pass/fail + EP — § Technical resolutions |
| 2.5 | INT8 vs FP16 | **Recorded** | **INT8** first; **FP16** fallback — **D17** |
| 2.6 | Separate embedder vs YOLO features | **Recorded** | **Separate** embedding ONNX — § Embedding spike |
| 2.7 | Embedding dimension 128/256/512 | **Recorded** | Spike order 512 → 128 → accept 256 — § Technical resolutions |
| 2.8 | Pre-converted ONNX vs self-convert | **Recorded** | Prefer **pre-converted** embedder; convert only if needed |
| 2.9 | Normalize before compare | **Recorded** | **L2** then **cosine** — § Matching |
| 3.1 | ORT-web vs TF.js | **Recorded** | **ORT-web** default; TF.js last resort — § Ordered fallback |
| 3.2 | EPs: WebGL, WebGPU, WASM; browser support | **Recorded** | WebGL + WASM; WebGPU if ORT build supports — § Technical resolutions |
| 3.3 | Slow connections; Workers | **Recorded** | Progress + retry; Workers after main-thread MVP — § Technical resolutions |
| 3.4 | Memory ceiling tab | **Recorded** | Measure; enforce via fallback list — § Technical resolutions |
| 3.5 | Concurrent detection + embed in Workers | **Recorded** | Optional after MVP; embedding Worker first — § Technical resolutions |
| 4.1 | IDB object stores | **Recorded** | `users`, `accessLog`, `settings` — § Technical resolutions |
| 4.2 | IDB versioning / migrations | **Recorded** | Version from day one — § Phase 2 |
| 4.3 | Max practical IDB size | **Spike** | Empirical test at 50 users — § Technical resolutions |
| 4.4 | Dexie vs raw IDB | **Recorded** | **Dexie.js** — **D15** |
| 5.1 | getUserMedia resolution vs model | **Recorded** | **1280×720** ideal; **640×480** floor — **D18** |
| 5.2 | Permissions, denial, device switch | **Recorded** | HTTPS on Netlify; handle denial — § Phase 3 |
| 5.3 | Preprocess steps | **Recorded** | RGB, resize, normalize per model card — `SPECS.txt` pipeline + spike |
| 5.4 | Aspect ratio mismatch | **Recorded** | **Letterbox** (preferred) vs stretch — § Phase 2 |
| 6.1 | Cosine vs Euclidean | **Recorded** | **Cosine** on L2-normalized vectors |
| 6.2 | Optimal threshold; validation set | **Recorded** | **Eval bands** + **20+** face informal validation — § Matching + Phase 3 |
| 6.3 | Multiple users above threshold | **Recorded** | Best match + optional **margin** vs runner-up — § Matching |
| 6.4 | Updating embeddings over time | **Recorded** | **Re-enrollment** via admin — § Technical resolutions |

### Phase 3: Post-stack refinement

| # | Topic | Status | Where / what |
| --- | -------- | -------- | ---------------- |
| **§1** | **Security & failure modes** | | |
| 1.1 | Spoofing / liveness | **Recorded** | **Stretch**; printed photo test — § Phase 3 |
| 1.2 | ONNX load failure | **Recorded** | User-visible error + retry — § Phase 3 |
| 1.3 | Secure admin | **Recorded** | Password; dev `admin`/`admin` — § Admin |
| 1.4 | Embeddings in IDB / DevTools risk | **Recorded** | Treat as sensitive; document — § Phase 3 |
| **§2** | **Testing strategy** | | |
| 2.1 | Matching accuracy / benchmark pairs | **Recorded** | 20+ faces; TPR/FPR targets — § Phase 3 |
| 2.2 | Lighting, distance, angle | **Recorded** | Manual test matrix — § Phase 3 |
| 2.3 | Browser compatibility | **Recorded** | Chrome primary; Safari second — § Phase 3 |
| 2.4 | Perf regression tests | **Recorded** | Time per stage on changes — § Phase 3 / Observability |
| **§3** | **Deployment & hosting** | | |
| 3.1 | Serve ~25 MB ONNX efficiently | **Recorded** | Netlify CDN asset + cache headers — § Detector Netlify note |
| 3.2 | CORS for model load | **Recorded** | Same-origin typical; verify on deploy — § Phase 3 |
| 3.3 | HTTPS for `getUserMedia` | **Recorded** | Netlify default |
| 3.4 | Rollback if deploy breaks models | **Recorded** | Redeploy prior or git revert — § Phase 3 |
| **§4** | **Observability & debugging** | | |
| 4.1 | Log inference perf in production | **Recorded** | `?debug=1` / localStorage timings — § Technical resolutions |
| 4.2 | Visual debugging tools | **Recorded** | Bbox overlay + scores; optional landmarks stretch — § Phase 3 |
| 4.3 | Diagnose false pos/neg | **Recorded** | Dev-only local export / IDB debug — § Technical resolutions |
| **§5** | **Performance optimization** | | |
| 5.1 | Model downsizing if too slow | **Recorded** | Smaller YOLO step, lower input, INT8 — § Ordered fallback + `SPECS.txt` |
| 5.2 | Skip frames vs smooth preview | **Recorded** | Yes — § Phase 3 summary |
| 5.3 | Caching sessions / buffers | **Recorded** | Reuse ORT session; reuse tensors where safe — § Phase 3 |
| 5.4 | Profile memory / low-end | **Recorded** | MBP primary; WASM documents CPU path — § Technical resolutions |

### Summary

- **Every Appendix A bullet has a recorded plan** in this file (§ **Owner-recorded answers**, § **Technical resolutions**, or earlier sections).  
- **Assignment features** outside Appendix A (log viewer, cooldown, side-by-side, bulk import, dual performance tiers) are tracked in § **Hard requirements**, § **SPECS feature parity**, and § **Technical resolutions**.  
- **Spike-only outcomes** (ORT-web operator pass/fail, exact measured IDB headroom, final checkpoint name) are **prove in spike** and must appear in spike notes + the architecture PDF.

---

## Appendix

- **Specification:** `docs/SPECS.txt` (MVP, core requirements, testing scenarios, performance tables, Appendix A).  
- **After Pre-Search (out of scope for this file):** architecture PDF, implementation, deploy.
