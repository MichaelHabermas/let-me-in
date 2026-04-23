/** @vitest-environment happy-dom */

import Dexie from 'dexie';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { parseBulkImportJson, runBulkImport } from '../src/app/bulk-import';
import type { DatabaseSeedSettings } from '../src/infra/persistence';
import { createDexiePersistence } from '../src/infra/persistence';

import { stubCanvas2dContext } from './support/stub-canvas-2d-context';

const seed: DatabaseSeedSettings = {
  thresholds: { strong: 0.85, weak: 0.65, unknown: 0.65, margin: 0.05 },
  cooldownMs: 3000,
};

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
});
