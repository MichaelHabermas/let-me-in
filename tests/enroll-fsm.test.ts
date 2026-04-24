import { describe, expect, it } from 'vitest';

import { transitionEnrollState, type EnrollState } from '../src/app/enrollment/enroll-fsm';

function walk(events: Parameters<typeof transitionEnrollState>[1][]): EnrollState {
  let s: EnrollState = 'idle';
  for (const e of events) {
    s = transitionEnrollState(s, e);
  }
  return s;
}

describe('transitionEnrollState', () => {
  it('covers every state on a golden path', () => {
    const s = walk([
      { type: 'start_camera' },
      { type: 'ready_detecting' },
      { type: 'capture' },
      { type: 'begin_edit' },
      { type: 'save' },
      { type: 'save_ok' },
      { type: 'continue_enrolling' },
    ]);
    expect(s).toBe('detecting');
  });

  it('retake returns to detecting from editing', () => {
    const s = walk([
      { type: 'start_camera' },
      { type: 'ready_detecting' },
      { type: 'capture' },
      { type: 'begin_edit' },
      { type: 'retake' },
    ]);
    expect(s).toBe('detecting');
  });

  it('stop clears active session', () => {
    const s = walk([{ type: 'start_camera' }, { type: 'ready_detecting' }, { type: 'stop' }]);
    expect(s).toBe('idle');
  });

  it('save_err returns to editing', () => {
    const s = walk([
      { type: 'start_camera' },
      { type: 'ready_detecting' },
      { type: 'capture' },
      { type: 'begin_edit' },
      { type: 'save' },
      { type: 'save_err' },
    ]);
    expect(s).toBe('editing');
  });

  it('reset_after_saved goes idle from saved', () => {
    const s = walk([
      { type: 'start_camera' },
      { type: 'ready_detecting' },
      { type: 'capture' },
      { type: 'begin_edit' },
      { type: 'save' },
      { type: 'save_ok' },
      { type: 'reset_after_saved' },
    ]);
    expect(s).toBe('idle');
  });

  it('begin_edit_from_user reaches editing from idle', () => {
    const s = walk([{ type: 'begin_edit_from_user' }]);
    expect(s).toBe('editing');
  });

  it('allows start_camera from editing', () => {
    const s = walk([{ type: 'begin_edit_from_user' }, { type: 'start_camera' }]);
    expect(s).toBe('camera');
  });

  it('begin_edit_from_user can save then reset to idle', () => {
    const s = walk([
      { type: 'begin_edit_from_user' },
      { type: 'save' },
      { type: 'save_ok' },
      { type: 'reset_after_saved' },
    ]);
    expect(s).toBe('idle');
  });
});
