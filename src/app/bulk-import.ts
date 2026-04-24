import { parseBulkImportJson } from './bulk-import-parse';
import { runBulkImportRows } from './bulk-import-pipeline';
import { createDuplicateCancelResult, type BulkImportRowResult } from './bulk-import-progress';
import type { DexiePersistence } from '../infra/persistence';

export type { BulkImportRow, ParseBulkImportJsonResult } from './bulk-import-parse';
export { parseBulkImportJson } from './bulk-import-parse';

export type RunBulkImportOptions = {
  useStubEnrollment?: boolean;
  onProgress: (current: number, total: number) => void;
  confirmDuplicateNames: () => Promise<boolean>;
};

export type RunBulkImportResult = {
  duplicateNameIndices: number[];
  proceededAfterDuplicateConfirm: boolean;
  rowResults: BulkImportRowResult[];
};

/** Parses JSON, optionally confirms duplicate names, then embeds and saves each valid row. */
export async function runBulkImport(
  persistence: DexiePersistence,
  jsonText: string,
  opts: RunBulkImportOptions,
): Promise<RunBulkImportResult> {
  const parsed = parseBulkImportJson(jsonText);

  if (parsed.duplicateWarningsWithinValid.length > 0) {
    const ok = await opts.confirmDuplicateNames();
    if (!ok) {
      return createDuplicateCancelResult(parsed);
    }
  }

  const rowResults = await runBulkImportRows({
    rows: parsed.valid,
    persistence,
    useStubEnrollment: opts.useStubEnrollment === true,
    onProgress: opts.onProgress,
  });

  return {
    duplicateNameIndices: parsed.duplicateWarningsWithinValid,
    proceededAfterDuplicateConfirm: true,
    rowResults,
  };
}
