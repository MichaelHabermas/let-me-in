import { getAdminPageTitle, getOrgName } from '../app/config-bridge';
import { mountStaticPage } from './page-shell';

export function mountAdminView(): void {
  mountStaticPage({
    documentTitle: getAdminPageTitle(),
    pageClass: 'page page--admin',
    headingText: `${getOrgName()} — Admin`,
    ledeText: 'Enrollment and authentication will be wired in Epic E6.',
  });
}
