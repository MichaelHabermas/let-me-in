/**
 * Per-frame YOLO + optional embedding + access evaluation + logging.
 * Import from `detection-pipeline`.
 */

export {
  createDetectionPipeline,
  type DetectionPipelineOptions,
  type AppendAccessLogFn,
} from './create-pipeline';
export { embedFace, drawDetections, handleDetectionCardinality } from './internals';
