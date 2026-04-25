import type { User } from '../domain/types';
import type { DexiePersistence } from '../infra/persistence';

export const ROSTER_EXPORT_SCHEMA_VERSION = 1;
const FALLBACK_IMAGE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

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

async function blobToBase64(blob: Blob): Promise<string> {
  try {
    if ('arrayBuffer' in blob && typeof blob.arrayBuffer === 'function') {
      const buffer = await blob.arrayBuffer();
      return bytesToBase64(new Uint8Array(buffer));
    }
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== 'string') {
          reject(new Error('Blob read failed'));
          return;
        }
        const marker = 'base64,';
        const markerIndex = result.indexOf(marker);
        if (markerIndex === -1) {
          reject(new Error('Blob base64 payload missing'));
          return;
        }
        resolve(result.slice(markerIndex + marker.length));
      };
      reader.onerror = () => reject(reader.error ?? new Error('Blob read failed'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return FALLBACK_IMAGE_BASE64;
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
