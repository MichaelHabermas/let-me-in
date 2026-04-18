import { resolveGateRuntime } from '../app/runtime-settings';
import { mountStaticPage } from './page-shell';

export function mountAdminView(): void {
  const rt = resolveGateRuntime();
  mountStaticPage({
    documentTitle: rt.adminPageTitle,
    pageClass: 'page page--admin',
    headingText: `${rt.orgName} — Admin`,
    ledeText: 'Enrollment and authentication will be wired in Epic E6.',
  });
}
