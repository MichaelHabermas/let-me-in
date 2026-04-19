import { describe, expect, it } from 'vitest';

import { isYoloWorkerToHostMessage, YOLO_WORKER_MSG } from '../src/infra/yolo-detector-worker-protocol';

describe('isYoloWorkerToHostMessage', () => {
  it('accepts init-ok', () => {
    expect(isYoloWorkerToHostMessage({ type: YOLO_WORKER_MSG.initOk, id: 1 })).toBe(true);
  });

  it('accepts init-err with string error', () => {
    expect(isYoloWorkerToHostMessage({ type: YOLO_WORKER_MSG.initErr, id: 2, error: 'x' })).toBe(true);
  });

  it('accepts infer-ok with dets array', () => {
    expect(
      isYoloWorkerToHostMessage({
        type: YOLO_WORKER_MSG.inferOk,
        id: 3,
        dets: [],
      }),
    ).toBe(true);
  });

  it('rejects infer-ok without dets array', () => {
    expect(isYoloWorkerToHostMessage({ type: YOLO_WORKER_MSG.inferOk, id: 3 })).toBe(false);
  });

  it('rejects non-objects and unknown types', () => {
    expect(isYoloWorkerToHostMessage(null)).toBe(false);
    expect(isYoloWorkerToHostMessage({ type: 'nope', id: 1 })).toBe(false);
    expect(isYoloWorkerToHostMessage({ type: YOLO_WORKER_MSG.initOk })).toBe(false);
  });
});
