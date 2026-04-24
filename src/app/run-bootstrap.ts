import { bootstrapApp } from './bootstrap-app';

export function runBootstrap(mount: () => void | Promise<void>): void {
  void bootstrapApp({ mount }).then((result) => {
    if (result.ok || result.reason === 'https') return;
    console.error('[Gatekeeper] bootstrap failed', result);
  });
}
