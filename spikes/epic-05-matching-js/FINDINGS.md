# Findings — Epic 5 (1:N matching sanity, JS-only)

**Artifact:** `spikes/epic-05-matching-js/`  
**Date:** 2026-04-17

## Math (locked for handoff to Epic 6)

| Item | Choice |
|------|--------|
| Normalize | `l2Normalize(v)`; zero vector → `RangeError` |
| Raw similarity | Dot product on L2-normalized `a`, `b` = cosine ∈ **[-1, 1]** |
| §3 decision score | `similarity01 = (1 + cosineRaw) / 2` ∈ **[0, 1]** |
| `bestMatch` returns | `score` / `secondScore` as **similarity01**; also `cosineRaw` / `secondCosineRaw` for debugging |

## Band table (PRE-SEARCH §3, on similarity01)

| Label | Rule |
|-------|------|
| **strong** | similarity01 ≥ **0.80** |
| **weak** | **0.65** ≤ similarity01 **< 0.80** |
| **reject** | similarity01 **< 0.65** |

§3 also references **< 0.60** for “unknown” / unenrolled narrative alignment. This spike treats **reject** as `< 0.65`; product copy for “Unknown” vs generic DENIED can still key off **< 0.60** as a stricter story without changing the weak/strong cut.

## Margin rule (E5-T5) — **implemented**

- Helper: `strongGrantedWithMargin(score, secondScore, { margin: 0.05 })`.
- **On:** “Strong GRANTED” requires band **strong** **and** `score - secondScore ≥ 0.05` when a runner-up exists; single-gallery entry skips margin (returns true if score ≥ 0.8).
- **Tradeoffs:**
  - **Pros:** Reduces wrong-ID when a second enrolled user is almost as close as the top match.
  - **Cons (false reject):** Legitimate user may score high but nearly tied with a sibling/collision — gate denies “strong” until margin widens or UX falls back to UNCERTAIN.

## Tie-breaking

- Candidates sorted by **cosine descending**, then **index ascending**.
- Equal top cosine → **lowest index** wins; runner-up is the **second row** in that order (ties ⇒ margin **0** vs next slot).

## Task acceptance

| Task | Result | Evidence |
|------|--------|----------|
| **E5-T1** `l2Normalize` | **Pass** | Test: ‖u‖ ≈ 1; zero vector throws |
| **E5-T2** `cosine` | **Pass** | Hand cases: 1, 0, 0 (orth / opposite pairs) |
| **E5-T3** `bestMatch` | **Pass** | Toy gallery; tie → index 0; `secondScore` null if \|gallery\|===1 |
| **E5-T4** bands | **Pass** | Table in `matching.mjs` header + `README.md` |
| **E5-T5** margin | **Pass** | Implemented + tests; tradeoffs above |
| **E5-T6** findings | **Pass** | This file; **supervisor gate below not closed** |

## Supervisor gate (STOP — needs human confirmation)

**Question:** For the **weak** band (0.65–0.80 on similarity01), should the product use **UNCERTAIN** (re-prompt / caution UI) or **GRANTED-with-warning** (still open door with friction)?

| Option | Summary |
|--------|--------|
| **A — UNCERTAIN** | Do not treat weak as full success; bias to re-prompt / second capture. Aligns with PRE-SEARCH §3 note (“bias to UNCERTAIN + re-prompt reduces false entry”). |
| **B — GRANTED-with-warning** | Allow entry but UI clearly not “full green”; faster path for demos but higher false-entry risk. |
| **C — Hybrid** | e.g. UNCERTAIN below 0.72, warning-only GRANTED in [0.72, 0.80) — extra thresholds to tune. |

**Recommendation:** **Option A (UNCERTAIN)** for graded reliability and alignment with §3, unless interview/demo script explicitly needs weak-band entry.

**Status:** **Needs supervisor confirmation** before locking PRD / Epic 6 behavior.

## How to run tests

```bash
node --test spikes/epic-05-matching-js/matching.test.mjs
```

(10 tests, all passing as of this write-up.)
