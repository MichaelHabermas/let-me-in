# Gatekeeper — Defense Doc

Quick-reference for technical interview. Decisions, tradeoffs, and what I'd say when asked "why."

---

## The pitch (30 seconds)

Browser-only facial-recognition door entry. Webcam → face detection → 512-D embedding → cosine match against IndexedDB → GRANTED / UNCERTAIN / DENIED. **Zero server-side ML, zero video egress.** TypeScript + Vite + ONNX Runtime Web + Dexie, deployed as static assets on Netlify.

---

## Use cases — where this fits

The shape of the system (single device, ≤50 enrolled users, no backend, privacy-first) matches a specific class of deployment:

- **Small office / studio front door** — single kiosk tablet at the entrance, IT-free. The whole org fits under 50 people. No badge system to maintain.
- **Co-working / private club access** — members enroll once at the front desk, recognition runs at the door. No member data leaves the building.
- **Apartment lobby / community room** — single-tenant, privacy-sensitive residents, no cloud account to set up.
- **Schools and clinics in regulated regions** — FERPA / HIPAA / GDPR / Illinois BIPA all get easier when biometric data physically never leaves the device. Client-only sidesteps most data-controller obligations.
- **Air-gapped or low-connectivity sites** — research labs, remote offices, ships, construction trailers. Models cache after first load; the rest works offline.
- **Pop-up events / conferences** — open a URL on a laptop, enroll the staff list, point camera at the door. Tear down by closing the tab.
- **Procurement demos / POCs** — proves the concept to a buyer in minutes without provisioning any cloud infra.
- **Personal / home use** — Airbnb host, home office, makerspace door. Cloud face-recognition is overkill and hostile-feeling.

### Where it's the wrong tool (be honest about this)

- **Multi-site enterprise** — no cross-device sync, no central audit log. You'd want a backend.
- **High-security / regulated access** (data centers, pharma vaults) — passive liveness is heuristic only, there is no tamper-evident log, and embeddings are readable in DevTools.
- **Thousands of enrolled users** — brute-force cosine match degrades; needs an ANN index and likely server-side storage.
- **Anywhere the access log is a legal artifact** — IndexedDB is mutable from DevTools, so the local log isn't evidentiary on its own.

---

## Why client-only ML

**Decision:** All inference runs in the browser via ONNX Runtime Web. No backend.

**Why:**

- **Privacy** — frames and embeddings never leave the device. No network attack surface for biometric data.
- **Cost** — production hosting is essentially the CDN bill. No GPU inference servers.
- **Latency** — no network round-trip per frame.
- **Deploy simplicity** — static assets on Netlify; no infra to manage.

**Tradeoffs I accept:**

- Models ship to the client (~25 MB cold). Mitigated by long-cache headers on `/models/` (see `public/_headers`) and progress UI on first load.
- Embeddings are visible in DevTools. Not a leak (they're 512 floats), but anyone with browser access can read them. A real deployment would encrypt at rest or move to a managed enclave.
- No central audit trail — log lives in one IndexedDB on one device. Production would sync to a backend for compliance.

---

## Pipeline & model choices

### Stage 1 — Face detection: YOLOv8n-face (ONNX)

**Why YOLOv8n-face, not YOLOv9 (which the spec named):**

- Pre-converted ONNX checkpoint exists (`deepghs/yolo-face` on HF), single face class, WIDER-trained.
- "n" (nano) is the smallest variant — fits the ≤25 MB model budget and runs on CPU via WASM.
- Earlier I prototyped with COCO person + a head-band heuristic; switched once I had a face-class model so boxes were actually on faces.

**Input/output:** `[1,3,640,640]` float32 in [0,1], output `[1,5,8400]` (cx, cy, w, h, face logit). Sigmoid + threshold + NMS done in JS (`src/infra/detector-yolo-decode.ts`).

**Execution providers:** WebGL preferred, WASM fallback. Configured in `src/infra/ort-execution-defaults.ts`. WebGPU was on the table but support is uneven across Chromium versions; WebGL+WASM is the safer matrix today.

**Worker:** Detector optionally runs in a Web Worker (`config.detectorUseWorker`) so ORT inference doesn't block the rAF camera loop. This is the difference between a smooth preview and stuttery video.

### Stage 2 — Embedding: InsightFace (512-D, L2-normalized)

**Why a separate embedder, not "use YOLO features directly":**

- Face detection and face recognition are different tasks. YOLO's intermediate features are tuned to localize, not to discriminate identity.
- InsightFace/ArcFace embeddings are the field standard — large-margin cosine training, well-studied at the threshold level.

**Why 512-D, not 128-D:** Pre-converted ONNX checkpoint was 512-D and the storage cost is trivial (~2 KB/user). Not worth the conversion debt to compress further.

**Preprocessing:** square crop around the detected box → 112² → channel norm. In `src/app/crop.ts`.

### Stage 3 — Matching: cosine similarity, brute-force

**Why cosine, not Euclidean:** scale-invariant; standard for L2-normalized face embeddings; with unit vectors, cosine and Euclidean are monotonically related but cosine reads on a clean [0, 1] scale.

**Why brute-force for now:** N is small (target ≤50, test with 3–5). At ~512 floats × N rows, a linear scan is microseconds. ANN indexes (HNSW, FAISS-WASM) would be premature.

**At 10K users:** I'd switch to an ANN index, partition by tenant, and do the search in a worker. The matching layer is already isolated in `src/domain/` so swapping it doesn't touch the pipeline.

---

## The decision policy — the part that's actually mine

The spec says "single threshold ≥ 0.75, return best match above threshold." I shipped something stricter:

```
strong = 0.85    weak = 0.65    margin = 0.05

top1 ≥ strong AND (top1 − top2) ≥ margin   → GRANTED
top1 ≥ weak                                → UNCERTAIN
top1 <  weak                               → DENIED
```

**Why three states, not two:**

- A single threshold forces wrong guesses in the ambiguous band. UNCERTAIN routes those to a human instead.
- This matters for false-accept rate. The cost of wrongly granting access dwarfs the cost of asking a human to confirm.

**Why a margin check on top-1 vs top-2:**

- Two enrolled users can both score above the threshold (twins, look-alikes, or just bad lighting). Without a margin check, the system "picks one" — that's a coin flip dressed up as a decision.
- The 0.05 margin is empirical, tuned against the bench set. Tunable per-deployment via `settings.thresholds`.

**Why diverge from the spec's 0.75:**

- 0.75 in the spec is a single-gate threshold. 0.85 in my code is a *strong* floor — only used when paired with the margin check.
- There's an admin "SPECS 0.75" preset to match the assignment baseline if a grader wants the original number.

**FAR/FPR honest answer:** I don't have a calibrated FAR number — to calibrate properly you need a labeled benchmark of impostor pairs at scale. What I have is bench-level eval against the test set; production tuning would happen against a real population.

---

## Storage — IndexedDB via Dexie

**Schema (`gatekeeper` DB):**

- `users` — id, name, role, embedding (Float32Array), reference image blob
- `accessLog` — timestamped decisions (for `/log` and CSV export)
- `settings` — `thresholds`, `cooldownMs`, consent flag, camera prefs

**Why Dexie, not raw IndexedDB:** versioning + migrations + a sane Promise API. Saves a week of boilerplate. Tradeoff: ~30 KB of dependency.

**Why blobs for reference images, not data URIs:** smaller in storage and we render via `URL.createObjectURL`. Data URIs would bloat row size and slow up reads.

**Real limitation I won't dodge:** clear browser data → lose enrollments. There's a JSON export/import path (`docs/IMPORT_SCHEMA.md`) for backup. Production needs server-side persistence; that's an explicit deferral, not an oversight.

---

## Performance — what I actually measured

Targets and what I hit on a Chrome MBP (see `docs/BENCHMARKS.md`):

| Stage | Target | Notes |
|---|---|---|
| Detection (WebGL) | <200ms | hits target on warm session |
| Detection (WASM) | <800ms | CPU fallback path |
| Embedding | <150ms | per crop |
| Total pipeline | <2s | end-to-end |
| Cold model load | <8s | with warm CDN cache |
| Preview FPS | ≥15 | maintained because detector is in a worker |

**Observability:** `window.__gatekeeperMetrics` exposes per-stage timings + `navigationToDetectorReadyMs` for cold-load profiling. Bench scripts in `tests/accuracy/bench-*.js` run against a stub-gate Vite server on port 5199.

**FP32 not INT8:** I shipped FP32 weights. Quantization was on the spec's wishlist; I deprioritized because the FP32 model already met latency targets and INT8 conversion of YOLO ONNX is a known pain point (operator coverage, accuracy regressions). Worth doing if I had to halve cold-load.

---

## Security & spoofing — known gaps

**Passive liveness is implemented, but it is not proof of life.** The gate now keeps a short same-face frame window and blocks `GRANTED` when the browser-local evidence looks like a flat presentation attack. That catches the basic printed-photo class in the runnable scenario, but it is heuristic anti-spoofing, not PAD certification or biological identity proof.

**What I'd add, in order:**

1. Head-pose estimation across frames — better replay resistance.
2. Conditional active challenge (blink, turn head) — use only when passive evidence is inconclusive.
3. Tamper-evident audit export — makes logs harder to rewrite after the fact.
4. Server-side re-verify on GRANTED — defense in depth for deployments that allow it.

**Admin auth:** credentials gate enrollment, resolved at build time from `VITE_ADMIN_USER`/`VITE_ADMIN_PASS`. Production fails closed if those aren't set. Not a real auth system — fine for a demo, would be replaced by SSO/OIDC in production.

---

## Things I'd cut or change

**Cut / overbuilt:**

- The three-page split (gate / admin / log) plus Netlify redirect sync is more ceremony than the demo needs.
- Some test infra (stub gate, scenario runner) is heavier than the surface area justifies.

**Keep:**

- The decision policy with margin. It's the part with the most actual thinking in it.
- The worker boundary for the detector. Without it the demo feels broken.
- The cooldown timer. 30 decisions/sec into the access log is a self-DoS.

**Would do differently:**

- Calibrate thresholds against a real labeled set, not my own face.
- Multi-angle enrollment (3–5 reference embeddings per user) — much more robust to lighting/pose.
- WebGPU once it's a safer bet across deploy targets.

---

## Likely interview questions — short answers

**Q: Why not TensorFlow.js?**
ONNX Runtime Web has better operator coverage for the YOLO/InsightFace models I wanted; ONNX is the portable format so the same model can run server-side later if needed.

**Q: Why no quantization?**
FP32 hit latency targets. INT8 conversion of YOLO ONNX has known operator gaps and I'd rather ship a working FP32 model than debug quantized accuracy regressions on a one-week clock.

**Q: How would you scale to 10K users?**
Swap the brute-force matcher for an ANN index (HNSW), partition by tenant, run search in a worker, and add server-side enrollment storage with client-side cache. The `domain/` layer is already the seam.

**Q: GDPR/CCPA?**
Embeddings are biometric data under both. Client-only storage is friendlier (no controller-side data) but doesn't get you out of the obligation — you still need consent at enrollment, a deletion path (clear user from IDB + access log), and a privacy notice. The consent flag in `settings` is the hook for that flow; it's not a full DPA-grade implementation.

**Q: Hardest problem?**
Getting the detector to not freeze the preview. Naive approach was rAF → infer → draw. The fix was moving inference to a worker and decoupling the detection cadence from the render cadence. Took a rewrite of the frame handler.

**Q: Where did Pre-Search change your mind?**
It killed two ideas: training my own embedder (months of work for a worse result) and using YOLO features directly for matching (wrong tool). It also flagged WebGL operator gaps before I burned a day on them.

---

## One-liner for any audience

> Browser-only face-recognition door — webcam in, GRANTED/UNCERTAIN/DENIED out, no server, no cloud, no video leaving the device.
