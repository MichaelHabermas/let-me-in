import { assertHttps, getHttpsRequiredMessage } from './https-gate';

function renderHttpsBanner(): void {
  const root = document.body;
  root.innerHTML = '';
  const banner = document.createElement('div');
  banner.className = 'https-gate';
  banner.setAttribute('role', 'alert');
  const p = document.createElement('p');
  p.className = 'https-gate__message';
  p.textContent = getHttpsRequiredMessage();
  banner.appendChild(p);
  root.appendChild(banner);
}

let allowed = false;
try {
  assertHttps();
  allowed = true;
} catch {
  renderHttpsBanner();
}

/** False when the app must not run (non-HTTPS remote origin). */
export function canRunApp(): boolean {
  return allowed;
}
