import { embedFace } from './enrollment/enroll-detection-bridge';
import type { BulkImportRow } from './bulk-import-parse';
import { imageDataToJpegBlob } from './enrollment/enroll-image';
import { persistEnrolledUser } from './enrollment/enroll-save';
import { squareCropWithMargin, type Bbox } from './crop';
import { createE2eDetectorEmbedderRuntime } from './enrollment/enroll-e2e-doubles';
import { createOrtDetectorEmbedderFromConfig } from './ort-detector-embedder-factory';
import type { YoloDetector } from '../infra/detector-core';
import { type FaceEmbedder } from '../infra/embedder-ort';
import type { DexiePersistence } from '../infra/persistence';
import { base64ToImageData, greyStubImportFrame } from './bulk-import-image';
import type { BulkImportRowResult } from './bulk-import-progress';

function makeImportPipeline(useStubEnrollment: boolean): {
  detector: YoloDetector;
  embedder: FaceEmbedder;
  loadAll(): Promise<void>;
  disposeAll(): Promise<void>;
} {
  if (useStubEnrollment) {
    return createE2eDetectorEmbedderRuntime();
  }
  return createOrtDetectorEmbedderFromConfig();
}

async function importOneRow(
  row: BulkImportRow,
  persistence: DexiePersistence,
  detector: YoloDetector,
  embedder: FaceEmbedder,
  useStubEnrollment: boolean,
): Promise<BulkImportRowResult> {
  try {
    const frame = useStubEnrollment
      ? greyStubImportFrame(320, 240)
      : await base64ToImageData(row.imageBase64);
    const dets = await detector.infer(frame);
    const onlyDet = dets.length === 1 ? dets[0] : undefined;
    if (onlyDet === undefined) {
      return {
        sourceIndex: row.sourceIndex,
        ok: false,
        error: dets.length === 0 ? 'No face detected' : 'Multiple faces in image',
      };
    }
    const bbox: Bbox = onlyDet.bbox;
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
  const runtime = makeImportPipeline(useStubEnrollment);
  const { detector, embedder } = runtime;
  await runtime.loadAll();
  const rowResults: BulkImportRowResult[] = [];
  try {
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      if (row === undefined) continue;
      onProgress(i + 1, rows.length);
      rowResults.push(await importOneRow(row, persistence, detector, embedder, useStubEnrollment));
    }
  } finally {
    await runtime.disposeAll();
  }
  return rowResults;
}
