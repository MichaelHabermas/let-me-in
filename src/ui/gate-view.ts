import { getGatePageTitle, getOrgName } from '../app/config-bridge';
import { mountStaticPage } from './page-shell';

export function mountGateView(): void {
  mountStaticPage({
    documentTitle: getGatePageTitle(),
    pageClass: 'page page--gate',
    headingText: getOrgName(),
    ledeText:
      'Foundation scaffold: camera and detection arrive in later epics. IndexedDB is ready.',
  });
}
