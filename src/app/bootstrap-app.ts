import type { DatabaseSeedSettings } from '../domain/database-seed';
import type { DexiePersistence } from '../infra/persistence';
import { getDefaultPersistence } from '../infra/persistence';
import { getHttpsStartupState as defaultGetHttpsStartupState } from './https-gate';
import { resolveGateRuntime } from './runtime-settings';

export type HttpsStartupState = ReturnType<typeof defaultGetHttpsStartupState>;

function defaultRenderHttpsBanner(message: string): void {
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
  /** When omitted, uses `resolveGateRuntime().getDatabaseSeedSettings()`. */
  getDatabaseSeedSettings?: () => DatabaseSeedSettings;
  getHttpsStartupState?: () => HttpsStartupState;
  renderHttpsBanner?: (message: string) => void;
};

export type BootstrapResult =
  | { ok: true }
  | { ok: false; reason: 'https'; message: string }
  | { ok: false; reason: 'database'; cause: unknown }
  | { ok: false; reason: 'mount'; cause: unknown };

/**
 * Single entry orchestration: HTTPS gate, IndexedDB init with org defaults from config, then mount.
 * Call from each HTML entry: `void bootstrapApp({ mount }).then(handleBootstrapResult)`.
 */
export async function bootstrapApp(options: BootstrapAppOptions): Promise<BootstrapResult> {
  const { mount, persistence: persistenceOverride } = options;
  const persistence = persistenceOverride ?? getDefaultPersistence();
  const getHttps = options.getHttpsStartupState ?? defaultGetHttpsStartupState;
  const renderHttpsBanner = options.renderHttpsBanner ?? defaultRenderHttpsBanner;
  const getDatabaseSeedSettings =
    options.getDatabaseSeedSettings ?? (() => resolveGateRuntime().getDatabaseSeedSettings());

  const https = getHttps();
  if (!https.ok) {
    renderHttpsBanner(https.message);
    return { ok: false, reason: 'https', message: https.message };
  }

  try {
    await persistence.initDatabase(getDatabaseSeedSettings());
  } catch (cause) {
    return { ok: false, reason: 'database', cause };
  }

  try {
    await mount();
  } catch (cause) {
    return { ok: false, reason: 'mount', cause };
  }

  return { ok: true };
}
