/**
 * Single app boundary for org/runtime values derived from config and env.
 * UI and bootstrap read `resolveGateRuntime()`; do not use `import.meta.env` in UI for flags.
 */

import { config } from '../config';
import type { DatabaseSeedSettings } from '../domain/database-seed';
import type {
  GateSessionCameraFactoryDeps,
  GateSessionDetectorModelDeps,
  GateSessionPipelineMessageDeps,
} from './gate-session';
import type { GateAccessUiStrings } from './gate-access-ui-controller';
import {
  createGateUiRuntimeSlice,
  type AdminUiStrings,
  type GateUiRuntimeSlice,
  type LogPageStrings,
} from './gate-ui-runtime';
import { getDatabaseSeedSettingsFromConfig } from './gate-seed-settings';
import type { ConsentModalStrings } from '../ui/components/consent';

/**
 * Shipped in `rt.gatePreviewSessionCoreDeps` — model-load + pipeline + camera list copy, without
 * cameras/detector instances or access ports (those come from mount / extras).
 */
export type GatePreviewSessionCoreDeps = GateSessionPipelineMessageDeps &
  Pick<
    GateSessionCameraFactoryDeps,
    'getDefaultVideoConstraintsForCamera' | 'getCameraUserFacingMessage'
  > &
  Pick<GateSessionDetectorModelDeps, 'logEmbeddingTimings'>;

/** Grouped string surfaces (same object refs as on `GateUiRuntimeSlice` — for narrow dependency passing). */
export type GateRuntimeSurfaceSlices = {
  admin: { pageTitle: string; ui: AdminUiStrings };
  gate: {
    pageTitle: string;
    accessUi: GateAccessUiStrings;
    consent: ConsentModalStrings;
  };
  log: { pageTitle: string; strings: LogPageStrings };
};

export type GateRuntime = GateUiRuntimeSlice & {
  databaseSeedSettings: DatabaseSeedSettings;
  gatePreviewSessionCoreDeps: GatePreviewSessionCoreDeps;
  runtimeSlices: GateRuntimeSurfaceSlices;
};

/** Single merge of UI slice + DB seed accessor — used by prod resolver and test harness. */
export function composeGateRuntime(
  ui: GateUiRuntimeSlice,
  getDatabaseSeedSettings: () => DatabaseSeedSettings,
): GateRuntime {
  const databaseSeedSettings = getDatabaseSeedSettings();
  const gatePreviewSessionCoreDeps: GatePreviewSessionCoreDeps = {
    getDefaultVideoConstraintsForCamera: () => ui.defaultVideoConstraintsForCamera,
    getCameraUserFacingMessage: (code) => ui.getCameraUserFacingMessage(code),
    logEmbeddingTimings: ui.devLogEmbeddingTimings,
    detectorLoadingMessage: ui.detectorLoadingMessage,
    detectorLoadFailedMessage: ui.detectorLoadFailedMessage,
    modelLoadStageDetectorLabel: ui.modelLoadStageDetectorLabel,
    modelLoadStageEmbedderLabel: ui.modelLoadStageEmbedderLabel,
    modelLoadRetryLabel: ui.modelLoadRetryLabel,
    noFaceMessage: ui.noFaceMessage,
    multiFaceMessage: ui.multiFaceMessage,
    cooldownMs: databaseSeedSettings.cooldownMs,
    cameraDefaultDeviceOption: ui.cameraDefaultDeviceOption,
    cameraSelectAriaLabel: ui.cameraSelectAriaLabel,
    formatUnnamedCamera: (i) => ui.formatUnnamedCamera(i),
  };

  const runtimeSlices: GateRuntimeSurfaceSlices = {
    admin: { pageTitle: ui.adminPageTitle, ui: ui.adminUiStrings },
    gate: {
      pageTitle: ui.gatePageTitle,
      accessUi: ui.gateAccessUiStrings,
      consent: ui.consentModalStrings,
    },
    log: { pageTitle: ui.logPageTitle, strings: ui.logPageStrings },
  };

  return {
    ...ui,
    databaseSeedSettings,
    gatePreviewSessionCoreDeps,
    runtimeSlices,
  };
}

/**
 * @param isDev - When omitted, uses `import.meta.env.DEV`. Tests should pass an explicit boolean.
 */
export function resolveGateRuntime(isDev: boolean = import.meta.env.DEV): GateRuntime {
  const ui = createGateUiRuntimeSlice(config, Boolean(isDev));
  return composeGateRuntime(ui, () => getDatabaseSeedSettingsFromConfig(config));
}
