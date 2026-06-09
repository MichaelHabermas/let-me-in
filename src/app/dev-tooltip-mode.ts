/** Tooltip mode state. Persists to localStorage; subscribers fire on change. */

export type DevTooltipMode = 'advanced' | 'simple' | 'off';

const STORAGE_KEY = 'gatekeeper:dev-tooltip-mode';
const DEFAULT_MODE: DevTooltipMode = 'advanced';

const CYCLE: readonly DevTooltipMode[] = ['advanced', 'simple', 'off'];

const listeners = new Set<(mode: DevTooltipMode) => void>();
let cached: DevTooltipMode | null = null;

export function getDevTooltipMode(): DevTooltipMode {
  if (cached) return cached;
  cached = readFromStorage();
  return cached;
}

export function setDevTooltipMode(mode: DevTooltipMode): void {
  if (cached === mode) return;
  cached = mode;
  writeToStorage(mode);
  for (const cb of listeners) cb(mode);
}

export function cycleDevTooltipMode(): DevTooltipMode {
  const idx = CYCLE.indexOf(getDevTooltipMode());
  const next = CYCLE[(idx + 1) % CYCLE.length] ?? DEFAULT_MODE;
  setDevTooltipMode(next);
  return next;
}

/** @deprecated Use {@link cycleDevTooltipMode}. */
export function toggleDevTooltipMode(): DevTooltipMode {
  return cycleDevTooltipMode();
}

export function subscribeDevTooltipMode(cb: (mode: DevTooltipMode) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function readFromStorage(): DevTooltipMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'simple' || raw === 'off') return raw;
    return DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

function writeToStorage(mode: DevTooltipMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* localStorage may be unavailable in private browsing — ignore */
  }
}
