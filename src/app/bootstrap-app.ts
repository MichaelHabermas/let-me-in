import type { DexiePersistence } from '../infra/persistence';
import { getDefaultPersistence } from '../infra/persistence';
import { resolveGateRuntime } from './runtime-settings';
import { getHttpsStartupState } from './https-gate';

function renderHttpsBanner(message: string): void {
  const root = document.body;
  root.innerHTML = '';

  const banner = document.createElement('div');
  banner.className = 'https-gate';
  banner.setAttribute('role', 'alert');

  const p = document.createElement('p');
  p.className = 'https-gate__message';
  p.textContent = message;
  banner.appendChild(p);

  root.appendChild(banner);
}

export type BootstrapAppOptions = {
  mount: () => void | Promise<void>;
  persistence?: DexiePersistence;
};

/**
 * Single entry orchestration: HTTPS gate, IndexedDB init with org defaults from config, then mount.
 * Call as `void bootstrapApp({ mount: mountGateView })` from each HTML entry.
 */
export function bootstrapApp(options: BootstrapAppOptions): void {
  const { mount, persistence: persistenceOverride } = options;
  const persistence = persistenceOverride ?? getDefaultPersistence();

  void (async () => {
    const https = getHttpsStartupState();
    if (!https.ok) {
      renderHttpsBanner(https.message);
      return;
    }

    await persistence.initDatabase(resolveGateRuntime().getDatabaseSeedSettings());
    await mount();
  })();
}
