import { embedFace } from './enroll-detection-bridge';
import type { BulkImportRow } from './bulk-import-parse';
import { imageDataToJpegBlob } from './enroll-image';
import { persistEnrolledUser } from './enroll-save';
import { squareCropWithMargin, type Bbox } from './crop';
import { createE2eEnrollmentDetector, createE2eEnrollmentEmbedder } from './enroll-e2e-doubles';
import { getDetectorRuntimeSettings, getEmbedderRuntimeSettings } from '../config';
import type { Detection } from '../infra/detector-core';
import { createFaceEmbedder, type FaceEmbedder } from '../infra/embedder-ort';
import { createYoloDetector } from '../infra/detector-ort';
import type { DexiePersistence } from '../infra/persistence';
import { base64ToImageData, greyStubImportFrame } from './bulk-import-image';
import type { BulkImportRowResult } from './bulk-import-progress';

type ImportDetector = {
  load(): Promise<void>;
  infer(imageData: ImageData): Promise<Detection[]>;
  dispose(): Promise<void>;
};

function makeImportPipeline(useStubEnrollment: boolean): {
  detector: ImportDetector;
  embedder: FaceEmbedder;
} {
  if (useStubEnrollment) {
    return {
      detector: createE2eEnrollmentDetector(),
      embedder: createE2eEnrollmentEmbedder(),
    };
  }
  return {
    detector: createYoloDetector(getDetectorRuntimeSettings()),
    embedder: createFaceEmbedder(getEmbedderRuntimeSettings()),
  };
}

async function importOneRow(
  row: BulkImportRow,
  persistence: DexiePersistence,
  detector: ImportDetector,
  embedder: FaceEmbedder,
  useStubEnrollment: boolean,
): Promise<BulkImportRowResult> {
  try {
    const frame = useStubEnrollment
      ? greyStubImportFrame(320, 240)
      : await base64ToImageData(row.imageBase64);
    const dets = await detector.infer(frame);
    if (dets.length !== 1) {
      return {
        sourceIndex: row.sourceIndex,
        ok: false,
        error: dets.length === 0 ? 'No face detected' : 'Multiple faces in image',
      };
    }
    const bbox = dets[0]!.bbox as Bbox;
    const embedding = await embedFace(frame, bbox, embedder);
    const crop = squareCropWithMargin(frame, bbox);
    const referenceImageBlob = await imageDataToJpegBlob(crop, 0.85);
    await persistEnrolledUser(persistence, {
      name: row.name,
      role: row.role,
      embedding,
      referenceImageBlob,
    });
    return { sourceIndex: row.sourceIndex, ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { sourceIndex: row.sourceIndex, ok: false, error: msg };
  }
}

export async function runBulkImportRows(params: {
  rows: BulkImportRow[];
  persistence: DexiePersistence;
  useStubEnrollment: boolean;
  onProgress: (current: number, total: number) => void;
}): Promise<BulkImportRowResult[]> {
  const { rows, persistence, useStubEnrollment, onProgress } = params;
  const { detector, embedder } = makeImportPipeline(useStubEnrollment);
  await detector.load();
  await embedder.load();
  const rowResults: BulkImportRowResult[] = [];
  try {
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]!;
      onProgress(i + 1, rows.length);
      rowResults.push(await importOneRow(row, persistence, detector, embedder, useStubEnrollment));
    }
  } finally {
    await detector.dispose().catch(() => {});
    await embedder.dispose().catch(() => {});
  }
  return rowResults;
}
