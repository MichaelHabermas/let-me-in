import { describe, expect, it } from 'vitest';

import { YOLO_WORKER_MSG, isYoloWorkerToHostMessage } from '../src/infra/yolo-detector-worker-protocol';

describe('yolo-detector-worker protocol guard', () => {
  it('accepts known ok/error worker replies', () => {
    expect(isYoloWorkerToHostMessage({ type: YOLO_WORKER_MSG.initOk, id: 1 })).toBe(true);
    expect(
      isYoloWorkerToHostMessage({ type: YOLO_WORKER_MSG.initErr, id: 2, error: 'boom' }),
    ).toBe(true);
    expect(isYoloWorkerToHostMessage({ type: YOLO_WORKER_MSG.inferOk, id: 3, dets: [] })).toBe(
      true,
    );
    expect(
      isYoloWorkerToHostMessage({ type: YOLO_WORKER_MSG.inferErr, id: 4, error: 'boom' }),
    ).toBe(true);
  });

  it('rejects unknown or malformed messages', () => {
    expect(isYoloWorkerToHostMessage(null)).toBe(false);
    expect(isYoloWorkerToHostMessage({ type: 'unknown', id: 1 })).toBe(false);
    expect(isYoloWorkerToHostMessage({ type: YOLO_WORKER_MSG.initOk, id: '1' })).toBe(false);
    expect(isYoloWorkerToHostMessage({ type: YOLO_WORKER_MSG.inferOk, id: 1, dets: null })).toBe(
      false,
    );
    expect(
      isYoloWorkerToHostMessage({ type: YOLO_WORKER_MSG.initErr, id: 1, error: 123 }),
    ).toBe(false);
  });
});
