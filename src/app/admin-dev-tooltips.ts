/**
 * Dev-only content registry + wiring for Gatekeeper admin section headers.
 *
 * Content lives in two sibling files keyed by {@link AdminTooltipKey}:
 *   - {@link ./admin-dev-tooltips-advanced} — jargon-OK technical narration
 *   - {@link ./admin-dev-tooltips-simple}   — plain-language variant + glossary
 *
 * Adding a tooltip = add a key here, an entry in each sibling, and one row in
 * {@link TARGETS}. Selectors target existing class names so DOM factories stay
 * untouched.
 */

import { attachDevTooltip, type DevTooltipContent } from './dev-tooltips';
import { ADVANCED } from './admin-dev-tooltips-advanced';
import { SIMPLE } from './admin-dev-tooltips-simple';

export type AdminTooltipKey =
  | 'pageHeader'
  | 'enrolledUsers'
  | 'matchThresholds'
  | 'reviewInbox'
  | 'calibrationDetail'
  | 'enrollPanel'
  | 'enrollModelLoadRetry'
  | 'shadowPreview'
  | 'shadowApply'
  | 'shadowDismiss'
  | 'applySpec075';

const TARGETS: ReadonlyArray<readonly [selector: string, key: AdminTooltipKey]> = [
  ['.admin-header__title', 'pageHeader'],
  ['.admin-user-roster__title', 'enrolledUsers'],
  ['.admin-thresholds__title', 'matchThresholds'],
  ['.admin-review-queue__title', 'reviewInbox'],
  ['.admin-calibration-explain__title', 'calibrationDetail'],
  ['.admin-enroll__heading', 'enrollPanel'],
  ['[data-testid="enroll-model-load-retry"]', 'enrollModelLoadRetry'],
  ['[data-testid="admin-calibration-shadow-preview"]', 'shadowPreview'],
  ['[data-testid="admin-calibration-shadow-apply"]', 'shadowApply'],
  ['[data-testid="admin-calibration-shadow-dismiss"]', 'shadowDismiss'],
  ['[data-testid="admin-threshold-apply-spec075"]', 'applySpec075'],
];

function buildContent(key: AdminTooltipKey): DevTooltipContent {
  return { ...ADVANCED[key], simple: SIMPLE[key] };
}

export function attachAdminDevTooltips(root: ParentNode): void {
  if (!import.meta.env.DEV) return;
  for (const [selector, key] of TARGETS) {
    const el = root.querySelector<HTMLElement>(selector);
    if (el) attachDevTooltip(el, buildContent(key));
  }
}
