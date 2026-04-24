/** Shared progress shape for detector / embedder download + session init (E11). */

export type ModelLoadStage = 'detector' | 'embedder';

export type ModelLoadProgress = {
  stage: ModelLoadStage;
  loaded?: number;
  total?: number;
};
