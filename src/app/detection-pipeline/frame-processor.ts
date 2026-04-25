import { runDetectionPipelineFrame, type FramePipelineOpts } from './run-frame';
import type { NoFaceDebouncer } from './internals';

export type FrameProcessor = {
  processFrame(): Promise<void>;
};

/** Boundary for frame->decision->append orchestration, independent from RAF wiring. */
export function createFrameProcessor(
  frameOpts: FramePipelineOpts,
  noFaceState: NoFaceDebouncer,
): FrameProcessor {
  return {
    async processFrame() {
      await runDetectionPipelineFrame(frameOpts, noFaceState);
    },
  };
}
