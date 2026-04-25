import { applySpec075StrongPreset, readAccessThresholds } from './admin-threshold-preset';
import type { AccessThresholds } from '../domain/access-policy';
import type { DexiePersistence } from '../infra/persistence';
import type { GateRuntime } from './gate-runtime';

type ThresholdDom = {
  thresholdStatusEl: HTMLElement;
  thresholdApplySpec075Btn: HTMLButtonElement;
};

function formatThresholdStatus(t: AccessThresholds, template: string): string {
  return template
    .replaceAll('{strong}', String(t.strong))
    .replaceAll('{weak}', String(t.weak))
    .replaceAll('{margin}', String(t.margin));
}

export function bindAdminEnrollmentThresholdController(
  dom: ThresholdDom,
  persistence: DexiePersistence,
  rt: GateRuntime,
  signal: AbortSignal,
): void {
  const template = rt.runtimeSlices.admin.ui.adminAccessThresholdsStatus;

  const refresh = async (): Promise<void> => {
    const t = await readAccessThresholds(persistence, rt.databaseSeedSettings);
    dom.thresholdStatusEl.textContent = formatThresholdStatus(t, template);
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
