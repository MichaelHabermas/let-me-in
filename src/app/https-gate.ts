const HTTPS_MESSAGE = 'This app requires HTTPS. Camera access is disabled on insecure origins.';

export function isHttpsOrLocalhost(): boolean {
  if (globalThis.location.protocol === 'https:') return true;
  const host = globalThis.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

/** @throws Error when the origin is not HTTPS and not localhost. */
export function assertHttps(): void {
  if (isHttpsOrLocalhost()) return;
  throw new Error(HTTPS_MESSAGE);
}

export function getHttpsRequiredMessage(): string {
  return HTTPS_MESSAGE;
}
