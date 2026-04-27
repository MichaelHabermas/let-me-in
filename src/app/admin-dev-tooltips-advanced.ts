/**
 * Advanced (jargon-OK) dev tooltip content for the Gatekeeper admin surface.
 * Keyed by {@link AdminTooltipKey}; the wiring file in {@link ./admin-dev-tooltips}
 * combines this with {@link ./admin-dev-tooltips-simple} per key.
 */

import type { DevTooltipContent } from './dev-tooltips';
import type { AdminTooltipKey } from './admin-dev-tooltips';

type AdvancedEntry = Omit<DevTooltipContent, 'simple'>;

export const ADVANCED: Record<AdminTooltipKey, AdvancedEntry> = {
  pageHeader: {
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
  },
  enrolledUsers: {
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
  },
  matchThresholds: {
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
  },
  reviewInbox: {
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
  },
  calibrationDetail: {
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
  },
  enrollPanel: {
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
  },
  enrollModelLoadRetry: {
    title: 'Retry (model load)',
    what: 'Re-attempts loading the ONNX detector and embedder models when the initial download or initialization failed. Surfaced inside the model-load status panel only when an error has occurred.',
    why: 'The models are fetched on-demand and run client-side. Network blips, cache misses, or a partially-corrupt fetch will block enrollment entirely. A user-driven retry is faster and safer than auto-retry loops that hide failures or burn bandwidth.',
    decisions: [
      'Retry is operator-triggered, not automatic — failures should be visible, and the operator decides when conditions are right to try again.',
      'The button is hidden until a retry handler is registered (failure state), so the success path never shows a dead control.',
      'Same status surface is reused on the gate page with a different testid prefix; only the labels and IDs change (DRY).',
    ],
    tradeoffs: [
      'Manual retry adds one click on failure; the alternative — silent retry-with-backoff — masks systemic problems and produces flaky enrollment without an audit trail.',
    ],
  },
  shadowPreview: {
    title: 'Preview calibration (shadow)',
    what: 'Runs a calibration pass in shadow mode — computes proposed threshold values from recent match data without touching live thresholds. The result populates the shadow summary, sample count, deltas, and projection readouts.',
    why: 'Operators need to see what a re-calibration would do before committing. A blind apply changes gate behavior with no warning; a preview surfaces the impact so the operator can decide whether the new operating point is acceptable.',
    decisions: [
      'Shadow run is read-only — it writes to a shadow record in settings, never to the live thresholds.',
      'Preview is cheap and idempotent; running it again recomputes from the latest data.',
      'Proposal is persisted, so review can happen later — operators are not forced to decide in the moment.',
    ],
    tradeoffs: [
      'Two-step preview/apply adds friction vs auto-apply, but the cost of a bad threshold change (silent false-accepts) is far higher than one extra click.',
    ],
  },
  shadowApply: {
    title: 'Apply shadow proposal',
    what: 'Promotes the current shadow proposal into live thresholds — the gate uses the new values for all subsequent decisions. Clears the shadow record on success.',
    why: 'Calibration without a commit step means "preview" is just noise. This is the explicit, auditable point at which a proposed operating point becomes the production operating point.',
    decisions: [
      'Disabled unless a valid shadow proposal exists; the button is meaningless otherwise.',
      'One click, not a confirmation dialog — by this point the operator has already reviewed deltas and projection. An extra modal would be paternalistic friction.',
      'Calibration metadata (sample count, source, timestamp) is recorded with the apply so the threshold history is auditable.',
    ],
    tradeoffs: [
      'No undo. Recovery is via re-running calibration or applying the spec preset. Acceptable — the spec preset is a one-click safe fallback, and apply only fires after explicit review.',
    ],
  },
  shadowDismiss: {
    title: 'Dismiss shadow',
    what: 'Clears the current shadow proposal without applying it. Live thresholds are untouched and the shadow readouts blank out.',
    why: 'An operator who reviews a proposal and decides it is wrong needs a clean way to remove it. Without dismiss, the only options are apply (bad) or leave it cluttering the UI (worse).',
    decisions: [
      'Non-destructive to live thresholds — only the proposal is discarded.',
      'Does not lock the operator out: re-running Preview produces a fresh proposal from the latest data.',
    ],
    tradeoffs: [
      'Dismissed proposals are not preserved for audit. Acceptable — the audit trail captures applied threshold changes; rejected proposals would be noise.',
    ],
  },
  applySpec075: {
    title: 'Apply SPECS 0.75 strong floor',
    what: 'Resets the strong-match threshold to the spec-defined operating point of 0.75 cosine similarity. One-click revert to the documented, tested baseline.',
    why: 'Operator-tunable thresholds drift. After a few rounds of calibration or manual edits, it can be unclear whether the live values still match anything sane. A one-click "go back to the known-good number" is the cheapest way to recover from a bad tuning session without a redeploy.',
    decisions: [
      '0.75 is hard-coded as the strong floor because it is the value the system was specced and benchmarked against — anchoring it in the UI prevents lossy "what was it again?" lookups.',
      'Action is the floor only, not a full threshold reset, so operator-tuned upper bounds and weak thresholds survive. Reset blast radius is intentionally narrow.',
      'No confirmation dialog — this is a recovery action, and friction on the recovery path makes recovery less likely.',
    ],
    tradeoffs: [
      'Hard-coding 0.75 in the UI couples the admin surface to a model-specific number. Acceptable for a single-model deployment; would move to config if/when multiple embedders ship.',
      'Single-button reset can mask a deeper calibration problem if the operator just clicks it instead of investigating. Mitigated by the calibration readouts sitting next to it.',
    ],
  },
};
