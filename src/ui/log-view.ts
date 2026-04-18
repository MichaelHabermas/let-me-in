import { resolveGateRuntime } from '../app/runtime-settings';
import { mountOrgBrandedStaticPage } from './org-static-pages';

export function mountLogView(): void {
  mountOrgBrandedStaticPage('log', resolveGateRuntime());
}
