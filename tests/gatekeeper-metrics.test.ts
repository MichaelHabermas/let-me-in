import { describe, expect, it } from 'vitest';
import {
  gatekeeperMetricsState,
  maybeRecordNavigationToDetectorReady,
  recordLastDetectorInferMs,
  resetGatekeeperMetricsForTests,
} from '../src/app/gatekeeper-metrics';

describe('gatekeeper-metrics', () => {
  it('records detector infer duration', () => {
    resetGatekeeperMetricsForTests();
    recordLastDetectorInferMs(42);
    expect(gatekeeperMetricsState.lastDetectorInferMs).toBe(42);
  });

  it('records navigation-to-detector-ready once', () => {
    resetGatekeeperMetricsForTests();
    maybeRecordNavigationToDetectorReady();
    const first = gatekeeperMetricsState.navigationToDetectorReadyMs;
    maybeRecordNavigationToDetectorReady();
    expect(gatekeeperMetricsState.navigationToDetectorReadyMs).toBe(first);
  });

});
