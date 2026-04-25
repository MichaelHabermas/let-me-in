import Dexie from 'dexie';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { parseBulkImportJson, runBulkImport } from '../src/app/bulk-import';
import { exportRosterJson, serializeRosterExportRows } from '../src/app/roster-json-export';
import { createDexiePersistence } from '../src/infra/persistence';

import { DEFAULT_TEST_DATABASE_SEED } from './support/create-test-gate-runtime';
import { embeddingVectorFilled } from './support/test-embeddings';
import { stubCanvas2dContext } from './support/stub-canvas-2d-context';

const seed = DEFAULT_TEST_DATABASE_SEED;

const png1x1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const mixedFixturePath = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'bulk-import-mixed.json');

describe('parseBulkImportJson', () => {
  it('parses mixed fixture: 3 valid, 2 errors, 1 duplicate name warning', () => {
    const text = readFileSync(mixedFixturePath, 'utf8');
    const r = parseBulkImportJson(text);
    expect(r.valid.length).toBe(3);
    expect(r.errors.length).toBe(2);
    expect(r.duplicateWarningsWithinValid.length).toBe(1);
  });

  it('rejects invalid JSON root', () => {
    const r = parseBulkImportJson('{}');
    expect(r.valid).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('array'))).toBe(true);
  });

  it('rejects unknown role', () => {
    const r = parseBulkImportJson(
      JSON.stringify([{ name: 'A', role: 'Intern', imageBase64: png1x1 }]),
    );
    expect(r.valid).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('Unknown role'))).toBe(true);
  });

  it('accepts role case-insensitively and stores canonical casing', () => {
    const r = parseBulkImportJson(
      JSON.stringify([{ name: 'A', role: 'staff', imageBase64: png1x1 }]),
    );
    expect(r.valid).toHaveLength(1);
    expect(r.valid[0]!.role).toBe('Staff');
  });

  it('rejects empty role string', () => {
    const r = parseBulkImportJson(
      JSON.stringify([{ name: 'A', role: '   ', imageBase64: png1x1 }]),
    );
    expect(r.valid).toHaveLength(0);
    expect(r.errors.some((e) => e.message.includes('empty role'))).toBe(true);
  });
});

describe('runBulkImport', () => {
  beforeEach(() => {
    stubCanvas2dContext();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('imports valid rows (stub detector/embedder via Vite define)', async () => {
    const dbName = `bulk-import-${crypto.randomUUID()}`;
    const p = createDexiePersistence(dbName);
    await p.initDatabase(seed);
    const rows = [
      { name: 'A', role: 'Staff', imageBase64: png1x1 },
      { name: 'B', role: 'Visitor', imageBase64: png1x1 },
    ];
    const res = await runBulkImport(p, JSON.stringify(rows), {
      useStubEnrollment: true,
      onProgress: () => {},
      confirmDuplicateNames: async () => true,
    });
    expect(res.proceededAfterDuplicateConfirm).toBe(true);
    expect(res.rowResults.filter((x) => x.ok).length).toBe(2);
    expect((await p.usersRepo.toArray()).length).toBe(2);
    await p.resetIndexedDbClientForTests();
    await Dexie.delete(dbName);
  });

  it('aborts when duplicate confirm declined', async () => {
    const dbName = `bulk-import-dup-${crypto.randomUUID()}`;
    const p = createDexiePersistence(dbName);
    await p.initDatabase(seed);
    const dupRows = [
      { name: 'Same', role: 'Staff', imageBase64: png1x1 },
      { name: 'same', role: 'Visitor', imageBase64: png1x1 },
    ];
    const res = await runBulkImport(p, JSON.stringify(dupRows), {
      onProgress: () => {},
      confirmDuplicateNames: async () => false,
    });
    expect(res.proceededAfterDuplicateConfirm).toBe(false);
    expect((await p.usersRepo.toArray()).length).toBe(0);
    await p.resetIndexedDbClientForTests();
    await Dexie.delete(dbName);
  });

  it('round-trips import contract and includes backup fields on export', async () => {
    const dbName = `bulk-import-export-${crypto.randomUUID()}`;
    const p = createDexiePersistence(dbName);
    await p.initDatabase(seed);
    const rows = [
      { name: 'Ada', role: 'Staff', imageBase64: png1x1 },
      { name: 'Bob', role: 'Visitor', imageBase64: png1x1 },
    ];
    await runBulkImport(p, JSON.stringify(rows), {
      useStubEnrollment: true,
      onProgress: () => {},
      confirmDuplicateNames: async () => true,
    });

    const exportedJson = await exportRosterJson(p);
    const exported = JSON.parse(exportedJson) as Array<{
      name: string;
      role: string;
      imageBase64: string;
      backup?: {
        referenceImageBase64: string;
        embedding: { encoding: string; dimensions: number; base64: string };
      };
    }>;
    const parsed = parseBulkImportJson(exportedJson);

    expect(parsed.errors).toHaveLength(0);
    expect(parsed.valid).toHaveLength(2);
    expect(parsed.valid.map((row) => row.name)).toEqual(exported.map((row) => row.name));
    expect(parsed.valid.map((row) => row.role)).toEqual(exported.map((row) => row.role));
    expect(parsed.valid.map((row) => row.imageBase64)).toEqual(exported.map((row) => row.imageBase64));
    expect(exported.every((row) => row.backup?.embedding.encoding === 'float32le-base64')).toBe(true);
    expect(
      exported.every((row) => row.backup && row.backup.referenceImageBase64 === row.imageBase64),
    ).toBe(true);
    expect(exported.every((row) => (row.backup?.embedding.dimensions ?? 0) > 0)).toBe(true);

    await p.resetIndexedDbClientForTests();
    await Dexie.delete(dbName);
  });
});

describe('roster-json-export failure semantics', () => {
  it('fails instead of silently substituting image data when blob conversion fails', async () => {
    const failingBlob = {
      arrayBuffer: async () => {
        throw new Error('blob conversion failed');
      },
    } as unknown as Blob;

    await expect(
      serializeRosterExportRows([
        {
          id: 'u-1',
          name: 'Ada',
          role: 'Staff',
          referenceImageBlob: failingBlob,
          embedding: embeddingVectorFilled(0.02),
          createdAt: 1_700_000_000_000,
        },
      ]),
    ).rejects.toThrow('blob conversion failed');
  });
});
