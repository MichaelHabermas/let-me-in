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
      baseEval({
        decision: 'GRANTED',
        userId: 'u1',
        label: 'Matched user',
        reasons: ['strong-and-margin'],
        bestScore: 0.9,
        marginDelta: 0.1,
      }),
    );
    expect(appendAccessLog).toHaveBeenCalledOnce();

    appendAccessLog.mockClear();
    await appendAccessLogIfNeeded(
      opts as FramePipelineOpts,
      baseEval({
        decision: 'DENIED',
        userId: null,
        label: 'Unknown',
        reasons: ['below-weak-band'],
        bestScore: 0.2,
        marginDelta: 0.1,
      }),
    );
    expect(appendAccessLog).toHaveBeenCalledOnce();

    appendAccessLog.mockClear();
    await appendAccessLogIfNeeded(
      opts as FramePipelineOpts,
      baseEval({
        decision: 'UNCERTAIN',
        userId: 'u1',
        label: 'Matched user',
        reasons: ['weak-or-mid-band'],
        bestScore: 0.6,
        marginDelta: 0.01,
      }),
    );
    expect(appendAccessLog).not.toHaveBeenCalled();
  });
});
