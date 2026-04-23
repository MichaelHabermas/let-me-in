import { describe, expect, it } from 'vitest';

import { createCooldown } from '../src/app/cooldown';

describe('createCooldown', () => {
  it('blocks re-entry until cooldown elapses', () => {
    let now = 1_000;
    const cd = createCooldown(3_000, () => now);
    expect(cd.tryEnter()).toBe(true);

    cd.markAttempt();
    expect(cd.tryEnter()).toBe(false);
    expect(cd.remainingMs()).toBe(3_000);

    now += 2_500;
    expect(cd.tryEnter()).toBe(false);
    expect(cd.remainingMs()).toBe(500);

    now += 500;
    expect(cd.tryEnter()).toBe(true);
    expect(cd.remainingMs()).toBe(0);
  });
});
