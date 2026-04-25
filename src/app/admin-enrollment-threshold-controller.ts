import { applySpec075StrongPreset, readAccessThresholds } from './admin-threshold-preset';
import { readThresholdCalibrationMeta } from './access-threshold-calibration';
import type { AccessThresholds } from '../domain/access-policy';
import type { DexiePersistence } from '../infra/persistence';
import type { GateRuntime } from './gate-runtime';

type ThresholdDom = {
  thresholdStatusEl: HTMLElement;
  thresholdCalibrationStatusEl: HTMLElement;
  thresholdApplySpec075Btn: HTMLButtonElement;
};

function formatThresholdStatus(t: AccessThresholds, template: string): string {
  return template
    .replaceAll('{strong}', String(t.strong))
    .replaceAll('{weak}', String(t.weak))
    .replaceAll('{margin}', String(t.margin));
}

function formatCalibrationStatus(
  meta: Awaited<ReturnType<typeof readThresholdCalibrationMeta>>,
  nowMs: number,
): string {
  if (!meta) return 'Auto-calibration: no runs yet.';
  const elapsedSec = Math.max(0, Math.floor((nowMs - meta.lastRunAtMs) / 1000));
  if (meta.reason === 'applied' && meta.next) {
    return `Auto-calibration: applied ${elapsedSec}s ago (n=${meta.sampleCount}, drift=${meta.maxDriftApplied}).`;
  }
  return `Auto-calibration: ${meta.reason.replaceAll('_', ' ')} ${elapsedSec}s ago (n=${meta.sampleCount}).`;
}

export function bindAdminEnrollmentThresholdController(
  dom: ThresholdDom,
  persistence: DexiePersistence,
  rt: GateRuntime,
  signal: AbortSignal,
): void {
  const template = rt.runtimeSlices.admin.ui.adminAccessThresholdsStatus;

  const refresh = async (): Promise<void> => {
    const [t, meta] = await Promise.all([
      readAccessThresholds(persistence, rt.databaseSeedSettings),
      readThresholdCalibrationMeta(persistence.settingsRepo),
    ]);
    dom.thresholdStatusEl.textContent = formatThresholdStatus(t, template);
    dom.thresholdCalibrationStatusEl.textContent = formatCalibrationStatus(meta, Date.now());
  };

  dom.thresholdApplySpec075Btn.addEventListener(
    'click',
    () => {
      void (async () => {
        await applySpec075StrongPreset(persistence, rt.databaseSeedSettings);
        await refresh();
      })();
    },
    { signal },
  );

  void refresh();
}
