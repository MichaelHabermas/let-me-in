type CalibrationTriggerOptions = {
  minNewAttempts: number;
  minIntervalMs: number;
  getNowMs?: () => number;
  runCalibration: () => Promise<void>;
};

export function createAutoThresholdCalibrationTrigger(options: CalibrationTriggerOptions): {
  onDecisionAppended: () => void;
} {
  const getNowMs = options.getNowMs ?? Date.now;
  let attemptsSinceRun = 0;
  let lastRunAt = 0;
  let inFlight = false;

  const maybeRun = () => {
    if (inFlight) return;
    if (attemptsSinceRun < options.minNewAttempts) return;
    const now = getNowMs();
    if (lastRunAt > 0 && now - lastRunAt < options.minIntervalMs) return;
    attemptsSinceRun = 0;
    lastRunAt = now;
    inFlight = true;
    void options
      .runCalibration()
      .catch(() => {
        /* swallow errors to avoid blocking live access flow */
      })
      .finally(() => {
        inFlight = false;
      });
  };

  return {
    onDecisionAppended() {
      attemptsSinceRun += 1;
      maybeRun();
    },
  };
}
