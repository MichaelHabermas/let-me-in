import type { ParseBulkImportJsonResult } from './bulk-import-parse';

export type BulkImportRowResult = { sourceIndex: number; ok: boolean; error?: string };

export type DuplicateCancelResult = {
  duplicateNameIndices: number[];
  proceededAfterDuplicateConfirm: false;
  rowResults: BulkImportRowResult[];
};

export function createDuplicateCancelResult(
  parsed: ParseBulkImportJsonResult,
): DuplicateCancelResult {
  return {
    duplicateNameIndices: parsed.duplicateWarningsWithinValid,
    proceededAfterDuplicateConfirm: false,
    rowResults: [],
  };
}
