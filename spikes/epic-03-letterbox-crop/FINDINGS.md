# Epic 3 — Letterbox / crop contract (FINDINGS)

Throwaway spike: [`index.html`](index.html), [`main.js`](main.js), baked asset [`test-image.png`](test-image.png) (deterministic **64×64** RGB gradient).

**Run:** `npx serve .` from this directory, open the URL (not `file://` — module URL for `test-image.png` must resolve).

---

## Embedder input size: placeholder vs final

| | Value |
| --- | --- |
| **Placeholder (this spike)** | **112×112** (`EMBED_HW` in `main.js`) — per [docs/PRE-PRD.md](../../docs/PRE-PRD.md) E3-T4 until Epic 4 picks a model. |
| **Final** | **Unknown** — set when Epic 4 freezes the embedder ONNX input shape. |
| **Re-run required** | **E3-T4** (and downstream **E3-T5–E3-T6** checks) after final **H×W** is known. Do **not** treat **112×112** as the production contract. |

---

## Frozen conventions (E3-T7)

| Topic | Decision |
| --- | --- |
| **Margin %** | **10%** of `max(w, h)` of the **clamped** bbox, applied **before** square expansion: expand width/height by `2 * margin * max(w,h)` and re-center on the same center point, then **clamp** to image bounds. Constant: `MARGIN_FRAC = 0.1`. |
| **Letterbox vs stretch** | **Placeholder path:** crop is **square** (E3-T3) and target is **112×112** → **uniform scale** (equivalent to “stretch” along both axes with the same factor — no bars). **Future non-square embedder H×W:** default policy will be **letterbox** (scale to fit inside target, pad with a constant — e.g. 0 or ImageNet mean — **provisional** until Epic 4 card). **Independent axis stretch** is not the default (avoids aspect distortion unless the model card requires it). |
| **Coordinate convention** | **Canvas 2D pixel space:** origin **top-left**, **+x** right, **+y** down. Bbox `(x, y, w, h)` uses **non-negative** `w`, `h`; **integer** pixels after rounding. **Detector → canvas:** detector output in the same pixel space as the source canvas used for cropping (Epic 1 overlay / Epic 2 frame); scale video frame to canvas first, then bbox applies in **canvas coordinates**. |

---

## Square crop math (E3-T3)

1. Start from **clamped** rectangle `(x, y, w, h)` (after optional margin).
2. Let `side = max(w, h)`.
3. **Cap** to image: `side = min(side, imgW, imgH)`.
4. Center on `(cx, cy) = (x + w/2, y + h/2)`.
5. `x0 = round(cx - side/2)`, `y0 = round(cy - side/2)`, then **clamp** `x0`, `y0` so `0 ≤ x0 ≤ imgW - side` and `0 ≤ y0 ≤ imgH - side`.

If the padded bbox is already square, `side = w = h` after clamping. **Shorter side is expanded** to match the longer side before the cap step (implicit in `max(w,h)`).

---

## Tensor contract (E3-T5) — provisional

| Field | Value |
| --- | --- |
| **Layout** | **CHW** — `Float32Array` length `3 * H * W`; planes **R**, **G**, **B** in that order (each plane row-major `y * W + x`). |
| **Color** | **RGB** (canvas `getImageData` is RGBA; we use R,G,B only). **Not** BGR unless Epic 4 model card says so — revisit then. |
| **Normalization (E3-T6)** | **`/255` → [0, 1]** per channel. `normalizeForEmbedder` is a **stub** (identity) for optional mean/std later. |

Shape today: **`[3, 112, 112]`** with placeholder **112**.

---

## Task checklist (acceptance)

| Task | Result | Evidence |
| --- | --- | --- |
| **E3-T1** | **Pass** | Baked **`test-image.png`** loaded via `new URL(..., import.meta.url)`; **64×64**; **FNV-1a**-style hash over RGB channels logged twice — must **MATCH** on repeat reads (reproducible pixels). |
| **E3-T2** | **Pass** | **`clampCropToImageBounds`**; hard-coded demo bbox `{ x:10, y:12, w:28, h:18 }`; edge cases logged (negative origin, oversized, off-image, zero size) — **no throw**. |
| **E3-T3** | **Pass** | **`squareCropFromRect`** + math above in this doc. |
| **E3-T4** | **Pass** | Offscreen draw to embed canvas **`112×112`** exact (`canvasEmbed.width/height` = `EMBED_HW`). Labeled **placeholder**; re-run after Epic 4. |
| **E3-T5** | **Pass** | **`imageDataToFloat32CHW`** → CHW RGB; documented above. |
| **E3-T6** | **Pass** | **`tensorStats`**: min, max, mean, std after `/255`; expect **[0, 1]** band for min/max with opaque RGBA source. |
| **E3-T7** | **Pass** | Margin **10%**, letterbox policy for future non-square target, coord convention — this section. |

---

## Pipeline (short)

**Synthetic bbox** → optional **margin** → **clamp** to image → **square** crop (centered, shorter→longer) → **resize** to **112×112** → **RGBA sample** → **CHW Float32** RGB **[0,1]** → **stats** (min/max/mean).

---

## Edge cases

| Case | Behavior |
| --- | --- |
| Bbox fully outside image | Clamped to **empty** `(0,0,0,0)`; downstream square crop yields **side 0** (degenerate — acceptable for spike; real pipeline should gate on positive area). |
| Negative x/y | Width/height reduced; origin pulled to 0. |
| Bbox larger than image | Clamped to image intersection. |
| Off-image center (100,100) on 64×64 | Clamped to empty rect. |

No uncaught exceptions in **`clampCropToImageBounds`** for the logged cases.

---

## Merge note

Summary merged into [docs/PRE-PRD.md](../../docs/PRE-PRD.md) **Findings — Epic 3** (2026-04-17). This file remains the detailed lab notebook; if either copy drifts, reconcile numbers here first.
