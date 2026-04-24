/**
 * Fetch ONNX (or other) model bytes with optional download progress for UI.
 */

export type FetchModelBytesProgress = {
  loaded: number;
  /** From Content-Length when present. */
  total: number | null;
};

function parseContentLength(header: string | null): number | null {
  if (!header) return null;
  const n = Number.parseInt(header, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Streams the response body and reports incremental `loaded` and optional `total`.
 */
export async function fetchModelBytesWithProgress(
  url: string,
  onProgress?: (p: FetchModelBytesProgress) => void,
  init?: RequestInit,
): Promise<Uint8Array> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Failed to fetch model (${res.status} ${res.statusText})`);
  }
  const total = parseContentLength(res.headers.get('Content-Length'));
  const reader = res.body?.getReader();
  if (!reader) {
    const buf = await res.arrayBuffer();
    const u8 = new Uint8Array(buf);
    onProgress?.({ loaded: u8.byteLength, total: total ?? u8.byteLength });
    return u8;
  }

  const chunks: Uint8Array[] = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress?.({ loaded, total });
  }

  const out = new Uint8Array(loaded);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
