import { mountLogPageIntoApp } from '../app/mount-log-page';
import { resolveGateRuntime } from '../app/runtime-settings';
import { getDefaultPersistence } from '../infra/persistence';

export function mountLogView(): void {
  const app = document.getElementById('app');
  if (!app) return;
  const rt = resolveGateRuntime();
  document.title = rt.logPageTitle;
  void mountLogPageIntoApp(app, { persistence: getDefaultPersistence(), rt });
}
