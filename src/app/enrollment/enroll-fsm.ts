/**
 * Enrollment UI state (PRD E6.S2.F1.T1).
 * idle → camera → detecting → captured → editing → saving → saved
 */

export type EnrollState =
  | 'idle'
  | 'camera'
  | 'detecting'
  | 'captured'
  | 'editing'
  | 'saving'
  | 'saved';

export type EnrollFsmEvent =
  | { type: 'start_camera' }
  | { type: 'ready_detecting' }
  | { type: 'capture' }
  | { type: 'begin_edit' }
  | { type: 'begin_edit_from_user' }
  | { type: 'retake' }
  | { type: 'save' }
  | { type: 'save_ok' }
  | { type: 'save_err' }
  | { type: 'continue_enrolling' }
  | { type: 'reset_after_saved' }
  | { type: 'stop' };

export function transitionEnrollState(state: EnrollState, e: EnrollFsmEvent): EnrollState {
  switch (e.type) {
    case 'start_camera':
      return state === 'idle' || state === 'editing' ? 'camera' : state;
    case 'ready_detecting':
      return state === 'camera' ? 'detecting' : state;
    case 'capture':
      return state === 'detecting' ? 'captured' : state;
    case 'begin_edit':
      return state === 'captured' ? 'editing' : state;
    case 'begin_edit_from_user':
      return state === 'idle' ? 'editing' : state;
    case 'retake':
      return state === 'captured' || state === 'editing' ? 'detecting' : state;
    case 'save':
      return state === 'editing' ? 'saving' : state;
    case 'save_ok':
      return state === 'saving' ? 'saved' : state;
    case 'save_err':
      return state === 'saving' ? 'editing' : state;
    case 'continue_enrolling':
      return state === 'saved' ? 'detecting' : state;
    case 'reset_after_saved':
      return state === 'saved' ? 'idle' : state;
    case 'stop':
      if (state === 'saving') return state;
      return state !== 'idle' ? 'idle' : state;
    default: {
      const _x: never = e;
      return _x;
    }
  }
}
