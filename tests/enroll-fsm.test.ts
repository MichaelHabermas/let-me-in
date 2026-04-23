import { describe, expect, it } from 'vitest';

import { transitionEnrollState, type EnrollState } from '../src/app/enroll-fsm';

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
});
