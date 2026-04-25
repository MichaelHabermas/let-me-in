import type { User } from '../domain/types';
import type { DexiePersistence } from '../infra/persistence';

export const ROSTER_EXPORT_SCHEMA_VERSION = 1;

export type RosterExportRow = {
  name: string;
  role: string;
  imageBase64: string;
  backup: {
    schemaVersion: number;
    userId: string;
    createdAt: number;
    referenceImageBase64: string;
    embedding: {
      encoding: 'float32le-base64';
      dimensions: number;
      base64: string;
    };
  };
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function isArrayBufferLike(value: unknown): value is ArrayBuffer {
  return value instanceof ArrayBuffer;
}

function isUint8ArrayLike(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array;
}

function readEmbeddedBinaryPayload(value: unknown): Uint8Array | null {
  if (Array.isArray(value) && value.every((item) => typeof item === 'number')) {
    return Uint8Array.from(value);
  }
  if (typeof value !== 'object' || value === null) return null;
  if ('data' in value && isUint8ArrayLike(value.data)) return value.data;
  if (
    'data' in value &&
    Array.isArray(value.data) &&
    value.data.every((item) => typeof item === 'number')
  ) {
    return Uint8Array.from(value.data);
  }
  if ('buffer' in value && isArrayBufferLike(value.buffer)) return new Uint8Array(value.buffer);
  if (
    'buffer' in value &&
    Array.isArray(value.buffer) &&
    value.buffer.every((item) => typeof item === 'number')
  ) {
    return Uint8Array.from(value.buffer);
  }
  return null;
}

async function blobToBase64(blob: unknown): Promise<string> {
  if (isArrayBufferLike(blob)) {
    return bytesToBase64(new Uint8Array(blob));
  }
  if (isUint8ArrayLike(blob)) {
    return bytesToBase64(blob);
  }
  if (
    typeof blob === 'object' &&
    blob !== null &&
    'arrayBuffer' in blob &&
    typeof blob.arrayBuffer === 'function'
  ) {
    const buffer = await blob.arrayBuffer();
    return bytesToBase64(new Uint8Array(buffer));
  }
  const embeddedBinary = readEmbeddedBinaryPayload(blob);
  if (embeddedBinary) {
    return bytesToBase64(embeddedBinary);
  }
  try {
    const buffer = await new Response(blob as BodyInit).arrayBuffer();
    return bytesToBase64(new Uint8Array(buffer));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Blob read failed');
    throw err;
  }
}

function float32ToBase64(vector: Float32Array): string {
  const bytes = new Uint8Array(vector.buffer, vector.byteOffset, vector.byteLength);
  return bytesToBase64(bytes);
}

export async function serializeRosterExportRows(users: User[]): Promise<RosterExportRow[]> {
  const rows: RosterExportRow[] = [];
  for (const user of users) {
    const referenceImageBase64 = await blobToBase64(user.referenceImageBlob);
    rows.push({
      name: user.name,
      role: user.role,
      imageBase64: referenceImageBase64,
      backup: {
        schemaVersion: ROSTER_EXPORT_SCHEMA_VERSION,
        userId: user.id,
        createdAt: user.createdAt,
        referenceImageBase64,
        embedding: {
          encoding: 'float32le-base64',
          dimensions: user.embedding.length,
          base64: float32ToBase64(user.embedding),
        },
      },
    });
  }
  return rows;
}

export async function exportRosterJson(persistence: DexiePersistence): Promise<string> {
  const users = await persistence.usersRepo.toArray();
  const rows = await serializeRosterExportRows(users);
  return JSON.stringify(rows, null, 2);
}

export function rosterExportFilename(now: Date = new Date()): string {
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `gatekeeper-roster-${year}-${month}-${day}.json`;
}

export function downloadRosterJson(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.click();
  URL.revokeObjectURL(url);
}
