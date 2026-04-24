/** Minimal `Storage` for unit tests (no `sessionStorage` / `localStorage` in node). */
export function createMemoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem(k: string) {
      return m.has(k) ? m.get(k)! : null;
    },
    setItem(k: string, v: string) {
      m.set(k, v);
    },
    removeItem(k: string) {
      m.delete(k);
    },
    clear() {
      m.clear();
    },
    key() {
      return null;
    },
    get length() {
      return m.size;
    },
  };
}
