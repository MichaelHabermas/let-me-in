import { getDetectorRuntimeSettings, getEmbedderRuntimeSettings } from '../config';
import { createYoloDetector } from '../infra/detector-ort';
import { createFaceEmbedder } from '../infra/embedder-ort';
import {
  createDetectorEmbedderRuntime,
  type DetectorEmbedderRuntime,
} from '../infra/inference-runtime';
import type { ModelLoadProgress } from '../infra/model-load-types';

/**
 * Default production YOLO + face-embedder pair, with byte load progress to a model-load UI
 * (shared by admin enrollment and any path that needs both models with a single `onLoadProgress` sink).
 */
export function createOrtDetectorEmbedderWithLoadProgress(
  onLoadProgress: (p: ModelLoadProgress) => void,
): DetectorEmbedderRuntime {
  return createDetectorEmbedderRuntime({
    createDetector: () =>
      createYoloDetector(getDetectorRuntimeSettings(), { onLoadProgress: onLoadProgress }),
    createEmbedder: () =>
      createFaceEmbedder(getEmbedderRuntimeSettings(), { onLoadProgress: onLoadProgress }),
  });
}

/** Production stack without load byte progress (e.g. bulk import headless). */
export function createOrtDetectorEmbedderFromConfig(): DetectorEmbedderRuntime {
  return createDetectorEmbedderRuntime({
    createDetector: () => createYoloDetector(getDetectorRuntimeSettings()),
    createEmbedder: () => createFaceEmbedder(getEmbedderRuntimeSettings()),
  });
}
