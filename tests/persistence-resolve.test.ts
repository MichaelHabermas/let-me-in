import { describe, expect, it } from 'vitest';

import { createDexiePersistence, resolvePersistence } from '../src/infra/persistence';

describe('resolvePersistence', () => {
  it('prefers explicit persistence over provider', () => {
    const a = {} as ReturnType<typeof createDexiePersistence>;
    const b = {} as ReturnType<typeof createDexiePersistence>;
    expect(resolvePersistence({ persistence: a, provider: { get: () => b } })).toBe(a);
  });

  it('uses provider when persistence omitted', () => {
    const b = {} as ReturnType<typeof createDexiePersistence>;
    expect(resolvePersistence({ provider: { get: () => b } })).toBe(b);
  });
});
