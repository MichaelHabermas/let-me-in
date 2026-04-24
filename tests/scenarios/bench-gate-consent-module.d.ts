/** Typings for the Node bench helper `tests/accuracy/bench-gate-consent.js` (import path must match exactly). */
declare module '../accuracy/bench-gate-consent.js' {
  import type { Page } from '@playwright/test';

  export function prepareGatePage(page: Page, baseURL: string): Promise<void>;
}
