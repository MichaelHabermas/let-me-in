import { getLogPageTitle, getOrgName } from '../app/config-bridge';
import { mountStaticPage } from './page-shell';

export function mountLogView(): void {
  mountStaticPage({
    documentTitle: getLogPageTitle(),
    pageClass: 'page page--log',
    headingText: `${getOrgName()} — Entry log`,
    ledeText: 'Access history UI will appear in Epic E7. Data store is ready.',
  });
}
