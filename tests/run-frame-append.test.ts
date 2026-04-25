import { describe, expect, it, vi } from 'vitest';

import { appendAccessLogIfNeeded, type FramePipelineOpts } from '../src/app/detection-pipeline/run-frame';
import type { GateAccessEvaluation } from '../src/app/gate-access-evaluation';

function baseEval(
  policy: GateAccessEvaluation['policy'],
  captured: Blob = new Blob(),
): GateAccessEvaluation {
  return {
    policy,
    displayName: null,
    referenceImageBlob: null,
    capturedFrameBlob: captured,
    bandThresholds: { strong: 0.85, weak: 0.65 },
  };
}

describe('appendAccessLogIfNeeded', () => {
  it('appends for GRANTED and DENIED only', async () => {
    const appendAccessLog = vi.fn().mockResolvedValue(undefined);
    const opts = { appendAccessLog } as Pick<FramePipelineOpts, 'appendAccessLog'>;

    await appendAccessLogIfNeeded(
      opts as FramePipelineOpts,
      baseEval({ decision: 'GRANTED', userId: 'u1', score: 0.9 }),
    );
    expect(appendAccessLog).toHaveBeenCalledOnce();

    appendAccessLog.mockClear();
    await appendAccessLogIfNeeded(
      opts as FramePipelineOpts,
      baseEval({ decision: 'DENIED', userId: null, score: 0.2, label: 'Unknown' }),
    );
    expect(appendAccessLog).toHaveBeenCalledOnce();

    appendAccessLog.mockClear();
    await appendAccessLogIfNeeded(
      opts as FramePipelineOpts,
      baseEval({ decision: 'UNCERTAIN', userId: 'u1', score: 0.6 }),
    );
    expect(appendAccessLog).not.toHaveBeenCalled();
  });
});
