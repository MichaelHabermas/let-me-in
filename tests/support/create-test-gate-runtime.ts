import { createGateUiRuntimeSlice } from '../../src/app/gate-ui-runtime';
import { getDatabaseSeedSettingsFromConfig } from '../../src/app/gate-seed-settings';
import type { GateRuntime } from '../../src/app/runtime-settings';
import type { Config } from '../../src/config';

const testGateUiConfig: Pick<Config, 'org' | 'camera' | 'ui' | 'devLogEmbeddingTimings'> = {
  org: { name: 'TestOrg', logoUrl: '' },
  camera: {
    idealWidth: 320,
    idealHeight: 240,
    defaultFacingMode: 'user',
  },
  ui: {
    strings: {
      unknown: 'Unknown',
      noFace: 'No face',
      multiFace: 'Multi',
      cameraPermissionDenied: 'perm',
      cameraNoDevice: 'nodev',
      cameraUnknownError: 'unk',
      cameraStart: 'Start',
      cameraStop: 'Stop',
      detectorLoading: 'Loading detector…',
      detectorLoadFailed: 'Detector failed.',
    },
  },
  devLogEmbeddingTimings: false,
};

/** `GateRuntime` for DOM tests — aligned with `createGateUiRuntimeSlice` + seed settings. */
export function createTestGateRuntime(): GateRuntime {
  const ui = createGateUiRuntimeSlice(testGateUiConfig, false);
  const seedCfg = {
    thresholds: { strong: 0.85, weak: 0.65, unknown: 0.65, margin: 0.05 },
    cooldownMs: 3000,
  };
  return {
    ...ui,
    getDatabaseSeedSettings: () => getDatabaseSeedSettingsFromConfig(seedCfg),
  };
}
