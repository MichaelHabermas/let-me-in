import { formatAllowedRolesHint, resolveUserRole } from '../domain/user-roles';

export type BulkImportRow = {
  name: string;
  role: string;
  imageBase64: string;
  /** Original index in the parsed JSON array (for error reporting). */
  sourceIndex: number;
};

export type ParseBulkImportJsonResult = {
  valid: BulkImportRow[];
  errors: { index: number; message: string }[];
  /** Indices within `valid` where `name` duplicates an earlier valid row (case-insensitive trim). */
  duplicateWarningsWithinValid: number[];
};

export function stripDataUrlBase64(s: string): string {
  const m = s.trim().match(/^data:[^;]+;base64,(.+)$/i);
  const payload = m?.[1];
  return payload !== undefined ? payload.replace(/\s/g, '') : s.trim().replace(/\s/g, '');
}

function looksLikeValidBase64(raw: string): boolean {
  if (raw.length < 8) return false;
  try {
    atob(raw);
    return true;
  } catch {
    return false;
  }
}

function collectDuplicateNameWarnings(rows: BulkImportRow[]): number[] {
  const first = new Map<string, number>();
  const dup: number[] = [];
  rows.forEach((r, idx) => {
    const k = r.name.trim().toLowerCase();
    if (first.has(k)) dup.push(idx);
    else first.set(k, idx);
  });
  return dup;
}

function tryParseImportRow(
  row: unknown,
  index: number,
): { ok: true; row: BulkImportRow } | { ok: false; error: { index: number; message: string } } {
  if (row === null || typeof row !== 'object' || Array.isArray(row)) {
    return { ok: false, error: { index, message: 'Row must be an object' } };
  }
  const o = row as Record<string, unknown>;
  const name = o.name;
  const role = o.role;
  const imageBase64 = o.imageBase64;
  if (typeof name !== 'string' || !name.trim()) {
    return { ok: false, error: { index, message: 'Missing or empty name' } };
  }
  if (typeof role !== 'string') {
    return { ok: false, error: { index, message: 'role must be a string' } };
  }
  const trimmedRole = role.trim();
  if (!trimmedRole) {
    return { ok: false, error: { index, message: 'Missing or empty role' } };
  }
  const resolvedRole = resolveUserRole(trimmedRole);
  if (!resolvedRole) {
    return {
      ok: false,
      error: {
        index,
        message: `Unknown role "${trimmedRole}". Allowed: ${formatAllowedRolesHint()}`,
      },
    };
  }
  if (typeof imageBase64 !== 'string' || !imageBase64.trim()) {
    return { ok: false, error: { index, message: 'Missing or empty imageBase64' } };
  }
  const rawB64 = stripDataUrlBase64(imageBase64);
  if (!looksLikeValidBase64(rawB64)) {
    return { ok: false, error: { index, message: 'imageBase64 is not valid base64' } };
  }
  return {
    ok: true,
    row: {
      name: name.trim(),
      role: resolvedRole,
      imageBase64: rawB64,
      sourceIndex: index,
    },
  };
}

/** Pure JSON parse + row validation (no I/O). */
export function parseBulkImportJson(text: string): ParseBulkImportJsonResult {
  let root: unknown;
  try {
    root = JSON.parse(text) as unknown;
  } catch {
    return {
      valid: [],
      errors: [{ index: -1, message: 'Invalid JSON' }],
      duplicateWarningsWithinValid: [],
    };
  }
  if (!Array.isArray(root)) {
    return {
      valid: [],
      errors: [{ index: -1, message: 'Root must be a JSON array' }],
      duplicateWarningsWithinValid: [],
    };
  }

  const valid: BulkImportRow[] = [];
  const errors: { index: number; message: string }[] = [];

  root.forEach((row, index) => {
    const parsed = tryParseImportRow(row, index);
    if (parsed.ok) valid.push(parsed.row);
    else errors.push(parsed.error);
  });

  const duplicateWarningsWithinValid = collectDuplicateNameWarnings(valid);
  return { valid, errors, duplicateWarningsWithinValid };
}
