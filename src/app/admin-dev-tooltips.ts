/**
 * Dev-only content registry + wiring for Gatekeeper admin section headers.
 *
 * Adds a new tooltip = add a `DevTooltipContent` constant + one row to {@link TARGETS}.
 * Selectors target existing class names so DOM factories stay untouched.
 */

import { attachDevTooltip, type DevTooltipContent } from './dev-tooltips';

const PAGE_HEADER: DevTooltipContent = {
  title: 'Gatekeeper — Admin',
  what: 'Operator console for the Gatekeeper face-recognition access system. One workspace for the user roster, decision thresholds, edge-case review, and model calibration.',
  why: 'Operators need a single surface to enroll users, tune the false-accept/false-reject trade-off, and adjudicate uncertain matches. Without it, those decisions get hard-coded and untestable.',
  decisions: [
    'All admin actions sit behind a single auth gate; the shell re-renders on login/logout to cleanly tear down sub-views.',
    'Stateful sections are isolated into independent DOM factories so a bug in one surface cannot corrupt others.',
    'Single-page layout instead of routed multi-page so the operator can keep all surfaces in view at once.',
  ],
  tradeoffs: [
    'Single-page is faster to ship but couples sections more tightly than a routed console; mitigated by per-section factories and a clean re-render boundary.',
  ],
};

const ENROLLED_USERS: DevTooltipContent = {
  title: 'Enrolled Users',
  what: 'Authoritative list of people allowed through the gate — photo, name, role, enrollment date, and per-row actions (edit, retake, remove).',
  why: 'The system can only recognize people it has been told about. The roster is the single source of truth for access; matching, review, and audit are all functions of it.',
  decisions: [
    'Stored in IndexedDB via a persistence port — UI never imports the DB driver directly (DIP).',
    'Bulk import/export lives in the toolbar, not per-row, so the row UI stays focused on individual edits.',
    'Retake is a separate action from edit because it carries different audit semantics — a new biometric template, not just metadata.',
  ],
  tradeoffs: [
    'Local-first storage means no cross-device sync, but it removes a server dependency and keeps biometric templates off the network.',
    'Acceptable for a single-tenant access-control demo; would be reconsidered for multi-site deployment.',
  ],
};

const MATCH_THRESHOLDS: DevTooltipContent = {
  title: 'Match Thresholds',
  what: 'Controls for the cosine-similarity cutoff that decides whether a face embedding counts as a match, plus a one-click preset that pins it to the documented operating point.',
  why: 'Face matching is a calibration problem, not a yes/no problem. Operators need to dial false-accept vs false-reject based on their risk tolerance and the deployed model.',
  decisions: [
    'Threshold is a first-class admin control, not a config-file setting, so it can be tuned without redeploys.',
    'A "spec 0.75" preset exists as intentional friction — the documented, tested operating point and the default re-baseline.',
    'Live calibration status renders next to the control so operators see the consequence of moving it.',
  ],
  tradeoffs: [
    'Operator-tunable thresholds risk worse performance if mis-tuned; mitigated by the spec preset and adjacent calibration readout.',
  ],
};

const REVIEW_INBOX: DevTooltipContent = {
  title: 'Review Inbox',
  what: 'Queue of borderline match attempts the system declined to auto-decide. Each row shows the captured frame, candidate identity, similarity score, and approve/reject actions.',
  why: 'A two-state classifier (pass/fail) at the gate forces operators to choose between false accepts and false rejects. A three-state design — pass / review / fail — moves uncertain cases to a human without blocking confident decisions.',
  decisions: [
    'Inbox is asynchronous and non-blocking — the gate keeps operating while items pile up.',
    'Pending count is surfaced in the section header to drive operator attention without nagging.',
    'Operator decisions feed back into calibration so the threshold can be re-tuned with real data over time.',
  ],
  tradeoffs: [
    'Adds operator workload that scales with traffic; offset by the calibration feedback loop, which should reduce review volume as the threshold settles.',
  ],
};

const CALIBRATION_DETAIL: DevTooltipContent = {
  title: 'Calibration Detail',
  what: 'Diagnostic view of the live calibration state — distribution of recent match scores, where the threshold sits in that distribution, and confidence in the current setting.',
  why: 'Operators need to know why the threshold is what it is. Without visibility, threshold tuning is superstition. This surface makes the trade-off visible.',
  decisions: [
    'Read-only by design — this section explains, it does not act. Mutations happen in Match Thresholds.',
    'Separating explanation from control keeps each section’s responsibility narrow (SRP).',
  ],
  tradeoffs: [
    'Two surfaces means operators must mentally connect them; acceptable cost for a clean separation of concerns. Could be merged later if usability data demands it.',
  ],
};

const ENROLL_PANEL: DevTooltipContent = {
  title: 'Enroll',
  what: 'Form to add a new person to the roster — capture or upload a face image, set name and role, save. Doubles as the edit surface when retaking a photo.',
  why: 'Enrollment is the most security-sensitive admin action: a bad enrollment lets the wrong person through forever. It deserves a focused, deliberate UI with explicit save and retake steps.',
  decisions: [
    'Camera capture and file upload share a single preview surface so the operator always sees what is about to be saved.',
    'Save is explicit (no auto-commit on capture) to prevent accidental enrollments.',
    'Embeddings are computed client-side at save time so raw images never leave the device.',
  ],
  tradeoffs: [
    'Client-side embedding is slower on low-end hardware, but eliminates a server-side image processing path and keeps biometric data local.',
  ],
};

const TARGETS: ReadonlyArray<readonly [selector: string, content: DevTooltipContent]> = [
  ['.admin-header__title', PAGE_HEADER],
  ['.admin-user-roster__title', ENROLLED_USERS],
  ['.admin-thresholds__title', MATCH_THRESHOLDS],
  ['.admin-review-queue__title', REVIEW_INBOX],
  ['.admin-calibration-explain__title', CALIBRATION_DETAIL],
  ['.admin-enroll__heading', ENROLL_PANEL],
];

export function attachAdminDevTooltips(root: ParentNode): void {
  if (!import.meta.env.DEV) return;
  for (const [selector, content] of TARGETS) {
    const el = root.querySelector<HTMLElement>(selector);
    if (el) attachDevTooltip(el, content);
  }
}
