/**
 * Single app boundary for org/runtime values derived from config and env.
 * UI and bootstrap read `resolveGateRuntime()`; do not use `import.meta.env` in UI for flags.
 */

import { config } from '../config';
import type { DatabaseSeedSettings } from '../domain/database-seed';
import type { GatePreviewSessionDeps } from './gate-session';
import { createGateUiRuntimeSlice, type GateUiRuntimeSlice } from './gate-ui-runtime';
import { getDatabaseSeedSettingsFromConfig } from './gate-seed-settings';

export type GatePreviewSessionCoreDeps = Pick<
  GatePreviewSessionDeps,
  | 'getDefaultVideoConstraintsForCamera'
  | 'getCameraUserFacingMessage'
  | 'logEmbeddingTimings'
  | 'detectorLoadingMessage'
  | 'detectorLoadFailedMessage'
  | 'noFaceMessage'
  | 'multiFaceMessage'
  | 'cooldownMs'
>;

export type GateRuntime = GateUiRuntimeSlice & {
  databaseSeedSettings?: DatabaseSeedSettings;
  gatePreviewSessionCoreDeps?: GatePreviewSessionCoreDeps;
  getDatabaseSeedSettings(): DatabaseSeedSettings;
  getGatePreviewSessionCoreDeps(): GatePreviewSessionCoreDeps;
};

/** Single merge of UI slice + DB seed accessor — used by prod resolver and test harness. */
export function composeGateRuntime(
  ui: GateUiRuntimeSlice,
  getDatabaseSeedSettings: () => DatabaseSeedSettings,
): GateRuntime {
  const databaseSeedSettings = getDatabaseSeedSettings();
  const gatePreviewSessionCoreDeps: GatePreviewSessionCoreDeps = {
    getDefaultVideoConstraintsForCamera: () => ui.getDefaultVideoConstraintsForCamera(),
    getCameraUserFacingMessage: (code) => ui.getCameraUserFacingMessage(code),
    logEmbeddingTimings: ui.devLogEmbeddingTimings,
    detectorLoadingMessage: ui.getDetectorLoadingMessage(),
    detectorLoadFailedMessage: ui.getDetectorLoadFailedMessage(),
    noFaceMessage: ui.getNoFaceMessage(),
    multiFaceMessage: ui.getMultiFaceMessage(),
    cooldownMs: databaseSeedSettings.cooldownMs,
  };

  return {
    ...ui,
    databaseSeedSettings,
    gatePreviewSessionCoreDeps,
    getDatabaseSeedSettings: () => databaseSeedSettings,
    getGatePreviewSessionCoreDeps: () => gatePreviewSessionCoreDeps,
  };
}

/**
 * @param isDev - When omitted, uses `import.meta.env.DEV`. Tests should pass an explicit boolean.
 */
export function resolveGateRuntime(isDev: boolean = import.meta.env.DEV): GateRuntime {
  const ui = createGateUiRuntimeSlice(config, Boolean(isDev));
  return composeGateRuntime(ui, () => getDatabaseSeedSettingsFromConfig(config));
}
