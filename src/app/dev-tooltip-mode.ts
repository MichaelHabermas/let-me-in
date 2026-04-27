/**
 * Dev-only tooltip mode state. Persists to localStorage; subscribers fire on change.
 * In production every entry short-circuits to the default value, so this module
 * tree-shakes to nothing meaningful.
 */

export type DevTooltipMode = 'advanced' | 'simple';

const STORAGE_KEY = 'gatekeeper:dev-tooltip-mode';
const DEFAULT_MODE: DevTooltipMode = 'advanced';

const listeners = new Set<(mode: DevTooltipMode) => void>();
let cached: DevTooltipMode | null = null;

export function getDevTooltipMode(): DevTooltipMode {
  if (!import.meta.env.DEV) return DEFAULT_MODE;
  if (cached) return cached;
  cached = readFromStorage();
  return cached;
}

export function setDevTooltipMode(mode: DevTooltipMode): void {
  if (!import.meta.env.DEV) return;
  if (cached === mode) return;
  cached = mode;
  writeToStorage(mode);
  for (const cb of listeners) cb(mode);
}

export function toggleDevTooltipMode(): DevTooltipMode {
  const next: DevTooltipMode = getDevTooltipMode() === 'simple' ? 'advanced' : 'simple';
  setDevTooltipMode(next);
  return next;
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
    return raw === 'simple' ? 'simple' : DEFAULT_MODE;
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
