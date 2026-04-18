import { resolveGateRuntime } from '../app/runtime-settings';
import { mountStaticPage } from './page-shell';

export function mountLogView(): void {
  const rt = resolveGateRuntime();
  mountStaticPage({
    documentTitle: rt.logPageTitle,
    pageClass: 'page page--log',
    headingText: `${rt.orgName} — Entry log`,
    ledeText: 'Access history UI will appear in Epic E7. Data store is ready.',
  });
}
