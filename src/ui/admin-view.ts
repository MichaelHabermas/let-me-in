import { resolveGateRuntime } from '../app/runtime-settings';
import { mountOrgBrandedStaticPage } from './org-static-pages';

export function mountAdminView(): void {
  mountOrgBrandedStaticPage('admin', resolveGateRuntime());
}
