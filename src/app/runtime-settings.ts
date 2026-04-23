/**
 * Single app boundary for org/runtime values derived from config and env.
 * UI and bootstrap read `resolveGateRuntime()`; do not use `import.meta.env` in UI for flags.
 */

import { config } from '../config';
import type { DatabaseSeedSettings } from '../domain/database-seed';
import { createGateUiRuntimeSlice, type GateUiRuntimeSlice } from './gate-ui-runtime';
import { getDatabaseSeedSettingsFromConfig } from './gate-seed-settings';

export type GateRuntime = GateUiRuntimeSlice & {
  getDatabaseSeedSettings(): DatabaseSeedSettings;
};

/** Single merge of UI slice + DB seed accessor — used by prod resolver and test harness. */
export function composeGateRuntime(
  ui: GateUiRuntimeSlice,
  getDatabaseSeedSettings: () => DatabaseSeedSettings,
): GateRuntime {
  return {
    ...ui,
    getDatabaseSeedSettings,
  };
}

/**
 * @param isDev - When omitted, uses `import.meta.env.DEV`. Tests should pass an explicit boolean.
 */
export function resolveGateRuntime(isDev: boolean = import.meta.env.DEV): GateRuntime {
  const ui = createGateUiRuntimeSlice(config, Boolean(isDev));
  return composeGateRuntime(ui, () => getDatabaseSeedSettingsFromConfig(config));
}
