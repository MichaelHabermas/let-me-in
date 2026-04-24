/** Model-space bbox [x1,y1,x2,y2] on letterboxed input, then mapped to source pixels. */
export type Detection = {
  bbox: [number, number, number, number];
  confidence: number;
  classId: number;
};

/** ONNX-backed face/person detector (main thread or worker). */
export type YoloDetector = {
  load(): Promise<void>;
  infer(imageData: ImageData): Promise<Detection[]>;
  dispose(): Promise<void>;
};

export const DETECTOR_INPUT_SIZE = 640;

export type LetterboxMeta = {
  ratio: number;
  padX: number;
  padY: number;
  srcW: number;
  srcH: number;
};
