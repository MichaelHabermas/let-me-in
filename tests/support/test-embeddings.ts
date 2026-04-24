import { EMBEDDER_DIM } from '../../src/infra/embedder-ort';

export function embeddingVectorFilled(value: number): Float32Array {
  return new Float32Array(EMBEDDER_DIM).fill(value);
}

export function embeddingVectorZeros(): Float32Array {
  return new Float32Array(EMBEDDER_DIM);
}

/** First 8 dimensions are `(i+1)*0.1`; rest zero — deterministic for match / L2 tests. */
export function embeddingVectorLeadingNonZero(): Float32Array {
  const out = new Float32Array(EMBEDDER_DIM);
  for (let i = 0; i < 8; i += 1) out[i] = (i + 1) * 0.1;
  return out;
}
