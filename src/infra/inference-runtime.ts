import type { YoloDetector } from './detector-core';
import type { FaceEmbedder } from './embedder-ort';
import { disposeSafely } from './safe-dispose';

/**
 * Shared detector + embedder lifecycle for gate, enrollment, and bulk import.
 */
export type DetectorEmbedderRuntime = {
  detector: YoloDetector;
  embedder: FaceEmbedder;
  loadAll(): Promise<void>;
  disposeAll(): Promise<void>;
};

export function createDetectorEmbedderRuntime(params: {
  createDetector: () => YoloDetector;
  createEmbedder: () => FaceEmbedder;
}): DetectorEmbedderRuntime {
  const detector = params.createDetector();
  const embedder = params.createEmbedder();
  return {
    detector,
    embedder,
    async loadAll() {
      await Promise.all([detector.load(), embedder.load()]);
    },
    async disposeAll() {
      await Promise.all([
        disposeSafely('detector-runtime', () => detector.dispose()),
        disposeSafely('embedder-runtime', () => embedder.dispose()),
      ]);
    },
  };
}
