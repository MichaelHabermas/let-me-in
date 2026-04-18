import { config } from '../config';
import { initDatabase } from '../infra/contracts';
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

/**
 * Single entry orchestration: HTTPS gate, IndexedDB init with org defaults from config, then mount.
 * Call as `void bootstrapApp(mountGateView)` from each HTML entry.
 */
export function bootstrapApp(mount: () => void | Promise<void>): void {
  void (async () => {
    const https = getHttpsStartupState();
    if (!https.ok) {
      renderHttpsBanner(https.message);
      return;
    }

    await initDatabase({ thresholds: config.thresholds, cooldownMs: config.cooldownMs });
    await mount();
  })();
}
