# Epic 5 — 1:N matching sanity (JS-only spike)

Throwaway code: L2 normalize → cosine → best match → PRE-SEARCH §3 bands. Toy `Float32Array` vectors only.

## Cosine definition

- Embeddings are **L2-normalized** before comparison.
- **Raw cosine** (this module’s `cosine(a,b)`): dot product = \(\cos\theta\) ∈ **[-1, 1]**.
- **Decision score** for thresholds in [docs/PRE-SEARCH.md](../../docs/PRE-SEARCH.md) §3:

\[
\text{similarity01} = \frac{1 + \text{cosineRaw}}{2} \in [0, 1]
\]

`bestMatch` returns **`score` / `secondScore` as similarity01** so §3 literals (0.80, 0.65, …) apply directly.

## Band mapping (§3, on similarity01)

| Band | Condition (similarity01) | Notes |
|------|-------------------------|--------|
| **strong** | ≥ 0.80 | Optional margin Δ ≥ 0.05 vs runner-up for “strong GRANTED” (see `strongGrantedWithMargin`) |
| **weak** | [0.65, 0.80) | Product: UNCERTAIN vs GRANTED-with-warning — **supervisor decision** (see FINDINGS.md) |
| **reject** | < 0.65 | Aligns with DENIED; §3 also cites **&lt; 0.60** for “unknown” narrative — document in FINDINGS |

## Run tests

From repo root:

```bash
node --test spikes/epic-05-matching-js/matching.test.mjs
```

## Files

- `matching.mjs` — implementation
- `matching.test.mjs` — `node:test` suite
- `FINDINGS.md` — epic outcomes + supervisor gate
