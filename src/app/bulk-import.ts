import { embedFace } from './enroll-detection-bridge';
import type { BulkImportRow } from './bulk-import-parse';
import { parseBulkImportJson } from './bulk-import-parse';
import { imageDataToJpegBlob } from './enroll-image';
import { persistEnrolledUser } from './enroll-save';
import { squareCropWithMargin, type Bbox } from './crop';
import { createE2eEnrollmentDetector, createE2eEnrollmentEmbedder } from './enroll-e2e-doubles';
import { config, getDetectorRuntimeSettings, getEmbedderRuntimeSettings } from '../config';
import type { Detection } from '../infra/detector-core';
import { createFaceEmbedder } from '../infra/embedder-ort';
import { createYoloDetector } from '../infra/detector-ort';
import type { DexiePersistence } from '../infra/persistence';
import type { FaceEmbedder } from '../infra/embedder-ort';

export type { BulkImportRow, ParseBulkImportJsonResult } from './bulk-import-parse';
export { parseBulkImportJson } from './bulk-import-parse';

type ImportDetector = {
  load(): Promise<void>;
  infer(imageData: ImageData): Promise<Detection[]>;
  dispose(): Promise<void>;
};

function greyStubImportFrame(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 120;
    data[i + 1] = 120;
    data[i + 2] = 120;
    data[i + 3] = 255;
  }
  return new ImageData(data, width, height);
}

async function base64ToImageData(base64: string): Promise<ImageData> {
  let binary: Uint8Array;
  try {
    const bin = atob(base64);
    binary = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) binary[i] = bin.charCodeAt(i);
  } catch {
    throw new Error('Could not decode base64');
  }
  const mime = binary[0] === 0xff && binary[1] === 0xd8 ? 'image/jpeg' : 'image/png';
  const blob = new Blob([new Uint8Array(binary)], { type: mime });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    const decoded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image decode failed'));
    });
    img.src = url;
    await decoded;
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w < 1 || h < 1) throw new Error('Invalid image dimensions');
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, w, h);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function makeImportPipeline(): { detector: ImportDetector; embedder: FaceEmbedder } {
  if (config.e2eStubEnrollment) {
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

export type RunBulkImportOptions = {
  onProgress: (current: number, total: number) => void;
  confirmDuplicateNames: () => Promise<boolean>;
};

export type RunBulkImportResult = {
  duplicateNameIndices: number[];
  proceededAfterDuplicateConfirm: boolean;
  rowResults: { sourceIndex: number; ok: boolean; error?: string }[];
};

async function importOneRow(
  row: BulkImportRow,
  persistence: DexiePersistence,
  detector: ImportDetector,
  embedder: FaceEmbedder,
): Promise<{ sourceIndex: number; ok: boolean; error?: string }> {
  try {
    const frame = config.e2eStubEnrollment
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

/** Parses JSON, optionally confirms duplicate names, then embeds and saves each valid row. */
export async function runBulkImport(
  persistence: DexiePersistence,
  jsonText: string,
  opts: RunBulkImportOptions,
): Promise<RunBulkImportResult> {
  const parsed = parseBulkImportJson(jsonText);
  const rowResults: RunBulkImportResult['rowResults'] = [];

  if (parsed.duplicateWarningsWithinValid.length > 0) {
    const ok = await opts.confirmDuplicateNames();
    if (!ok) {
      return {
        duplicateNameIndices: parsed.duplicateWarningsWithinValid,
        proceededAfterDuplicateConfirm: false,
        rowResults,
      };
    }
  }

  const { detector, embedder } = makeImportPipeline();
  await detector.load();
  await embedder.load();

  const total = parsed.valid.length;
  try {
    for (let i = 0; i < parsed.valid.length; i += 1) {
      const row = parsed.valid[i]!;
      opts.onProgress(i + 1, total);
      rowResults.push(await importOneRow(row, persistence, detector, embedder));
    }
  } finally {
    await detector.dispose().catch(() => {});
    await embedder.dispose().catch(() => {});
  }

  return {
    duplicateNameIndices: parsed.duplicateWarningsWithinValid,
    proceededAfterDuplicateConfirm: true,
    rowResults,
  };
}
