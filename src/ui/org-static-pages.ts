import type { GateRuntime } from '../app/runtime-settings';
import { mountStaticPage } from './page-shell';

export type OrgStaticPageVariant = 'admin' | 'log';

const variantMeta: Record<
  OrgStaticPageVariant,
  {
    documentTitle: (rt: GateRuntime) => string;
    headingText: (rt: GateRuntime) => string;
    pageClass: string;
    ledeText: string;
  }
> = {
  admin: {
    documentTitle: (rt) => rt.adminPageTitle,
    headingText: (rt) => `${rt.orgName} — Admin`,
    pageClass: 'page page--admin',
    ledeText:
      'This static shell is unused when the app boots /admin via bootstrap. Enrollment lives in the admin bundle.',
  },
  log: {
    documentTitle: (rt) => rt.logPageTitle,
    headingText: (rt) => `${rt.orgName} — Entry log`,
    pageClass: 'page page--log',
    ledeText: 'The live table is mounted by the log bundle (`mountLogView`). This shell is for static previews only.',
  },
};

export function mountOrgBrandedStaticPage(variant: OrgStaticPageVariant, rt: GateRuntime): void {
  const meta = variantMeta[variant];
  mountStaticPage({
    documentTitle: meta.documentTitle(rt),
    pageClass: meta.pageClass,
    headingText: meta.headingText(rt),
    ledeText: meta.ledeText,
  });
}
