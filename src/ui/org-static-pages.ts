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
    ledeText: 'Enrollment and authentication will be wired in Epic E6.',
  },
  log: {
    documentTitle: (rt) => rt.logPageTitle,
    headingText: (rt) => `${rt.orgName} — Entry log`,
    pageClass: 'page page--log',
    ledeText: 'Access history UI will appear in Epic E7. Data store is ready.',
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
