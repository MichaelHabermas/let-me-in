import type { Camera } from '../camera';
import { drawDetections, embedFace, handleDetectionCardinality } from './enroll-detection-bridge';
import { imageDataToJpegBlob } from './enroll-image';
import { persistEnrolledUser } from './enroll-save';
import { squareCropWithMargin, type Bbox } from '../crop';
import type { YoloDetector } from '../../infra/detector-core';
import type { FaceEmbedder } from '../../infra/embedder-ort';
import type { DexiePersistence } from '../../infra/persistence';
import { drawVideoToCanvas } from '../../infra/camera';

export type EnrollmentFrameDeps = {
  camera: Camera;
  detector: YoloDetector;
  embedder: FaceEmbedder;
  video: HTMLVideoElement;
  frameCanvas: HTMLCanvasElement;
  overlayCanvas: HTMLCanvasElement;
  frameCtx: CanvasRenderingContext2D;
  overlayCtx: CanvasRenderingContext2D;
  statusEl: HTMLElement;
  noFaceMessage: string;
  multiFaceMessage: string;
  persistence: DexiePersistence;
};

export function paintEnrollmentPreview(d: EnrollmentFrameDeps): void {
  if (!d.camera.isRunning()) return;
  drawVideoToCanvas(d.video, d.frameCtx, d.frameCanvas);
}

export async function runEnrollmentOverlayFrame(d: EnrollmentFrameDeps): Promise<void> {
  paintEnrollmentPreview(d);
  const frame = d.camera.getFrame();
  const dets = await d.detector.infer(frame);
  d.overlayCtx.clearRect(0, 0, d.overlayCanvas.width, d.overlayCanvas.height);
  drawDetections(d.overlayCtx, dets);
  handleDetectionCardinality(
    {
      statusEl: d.statusEl,
      noFaceMessage: d.noFaceMessage,
      multiFaceMessage: d.multiFaceMessage,
    },
    dets.length,
  );
}

export async function captureEnrollmentFace(
  d: EnrollmentFrameDeps,
): Promise<{ embedding: Float32Array; referenceImageBlob: Blob } | null> {
  paintEnrollmentPreview(d);
  const frame = d.camera.getFrame();
  const dets = await d.detector.infer(frame);
  const onlyDet = dets.length === 1 ? dets[0] : undefined;
  if (onlyDet === undefined) {
    handleDetectionCardinality(
      {
        statusEl: d.statusEl,
        noFaceMessage: d.noFaceMessage,
        multiFaceMessage: d.multiFaceMessage,
      },
      dets.length,
    );
    return null;
  }
  const bbox: Bbox = onlyDet.bbox;
  const embedding = await embedFace(frame, bbox, d.embedder);
  const crop = squareCropWithMargin(frame, bbox);
  const referenceImageBlob = await imageDataToJpegBlob(crop, 0.85);
  return { embedding, referenceImageBlob };
}

export async function saveEnrollmentUser(
  persistence: DexiePersistence,
  name: string,
  role: string,
  embedding: Float32Array,
  referenceImageBlob: Blob,
  opts?: { existingUserId?: string },
): Promise<void> {
  await persistEnrolledUser(persistence, {
    name,
    role,
    embedding,
    referenceImageBlob,
    existingUserId: opts?.existingUserId,
  });
}
