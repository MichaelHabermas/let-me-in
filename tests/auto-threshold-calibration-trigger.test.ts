import { describe, expect, it, vi } from 'vitest';

import { createAutoThresholdCalibrationTrigger } from '../src/app/auto-threshold-calibration-trigger';

describe('createAutoThresholdCalibrationTrigger', () => {
  it('runs only after enough appended attempts and respects interval', async () => {
    let nowMs = 10_000;
    const runCalibration = vi.fn().mockResolvedValue(undefined);
    const trigger = createAutoThresholdCalibrationTrigger({
      minNewAttempts: 3,
      minIntervalMs: 1000,
      getNowMs: () => nowMs,
      runCalibration,
    });

    trigger.onDecisionAppended();
    trigger.onDecisionAppended();
    expect(runCalibration).not.toHaveBeenCalled();
    trigger.onDecisionAppended();
    await Promise.resolve();
    expect(runCalibration).toHaveBeenCalledTimes(1);

    trigger.onDecisionAppended();
    trigger.onDecisionAppended();
    trigger.onDecisionAppended();
    await Promise.resolve();
    expect(runCalibration).toHaveBeenCalledTimes(1);

    nowMs += 1001;
    trigger.onDecisionAppended();
    trigger.onDecisionAppended();
    trigger.onDecisionAppended();
    await Promise.resolve();
    expect(runCalibration).toHaveBeenCalledTimes(2);
  });
});
