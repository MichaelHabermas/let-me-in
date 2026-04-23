/**
 * Decision cooldown gate.
 * - `tryEnter`: true when an attempt is allowed now.
 * - `markAttempt`: starts cooldown window.
 */
export type CooldownGate = {
  tryEnter(nowMs?: number): boolean;
  markAttempt(nowMs?: number): void;
  remainingMs(nowMs?: number): number;
};

export function createCooldown(ms: number, now: () => number = Date.now): CooldownGate {
  let lastAttemptAt: number | null = null;
  const cooldownMs = Math.max(0, ms);

  function resolveNow(nowMs?: number): number {
    return typeof nowMs === 'number' ? nowMs : now();
  }

  function remainingMs(nowMs?: number): number {
    if (lastAttemptAt === null) return 0;
    const elapsed = resolveNow(nowMs) - lastAttemptAt;
    return Math.max(0, cooldownMs - elapsed);
  }

  return {
    tryEnter(nowMs?: number): boolean {
      return remainingMs(nowMs) <= 0;
    },
    markAttempt(nowMs?: number): void {
      lastAttemptAt = resolveNow(nowMs);
    },
    remainingMs,
  };
}
