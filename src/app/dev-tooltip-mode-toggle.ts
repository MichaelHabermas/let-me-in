/**
 * Dev-only toggle button for switching tooltip content between advanced and
 * simple modes. Mounted in the admin header next to the logout button.
 * In production this short-circuits to a no-op and the wrapper module
 * tree-shakes away.
 */

import {
  getDevTooltipMode,
  setDevTooltipMode,
  subscribeDevTooltipMode,
  type DevTooltipMode,
} from './dev-tooltip-mode';

const BUTTON_TESTID = 'dev-tooltip-mode-toggle';
const STYLE_ID = 'dev-tooltip-mode-toggle-styles';

const TOGGLE_CSS = `
.dev-tooltip-mode-toggle {
  padding: var(--space-2, 8px) var(--space-3, 12px);
  min-height: var(--control-height, 36px);
  border-radius: var(--radius-sm, 4px);
  border: 1px dashed rgba(150, 110, 230, 0.55);
  background: rgba(150, 110, 230, 0.08);
  color: #cbb6ff;
  font: 600 12px 'IBM Plex Mono', ui-monospace, monospace;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  margin-left: auto;
}
.dev-tooltip-mode-toggle:hover {
  background: rgba(150, 110, 230, 0.18);
}
`;

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = TOGGLE_CSS;
  document.head.appendChild(style);
}

function labelFor(mode: DevTooltipMode): string {
  return mode === 'simple' ? 'Tooltips: Simple' : 'Tooltips: Advanced';
}

export function attachDevTooltipModeToggle(root: ParentNode): void {
  if (!import.meta.env.DEV) return;
  const header = root.querySelector<HTMLElement>('.admin-header');
  const logoutBtn = root.querySelector<HTMLButtonElement>('.admin-header__logout');
  if (!header || !logoutBtn) return;
  if (header.querySelector(`[data-testid="${BUTTON_TESTID}"]`)) return;

  ensureStyles();

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'dev-tooltip-mode-toggle';
  btn.setAttribute('data-testid', BUTTON_TESTID);
  btn.textContent = labelFor(getDevTooltipMode());
  btn.title = 'Toggle dev tooltip detail level (dev only)';

  const unsubscribe = subscribeDevTooltipMode((mode) => {
    btn.textContent = labelFor(mode);
  });

  btn.addEventListener('click', () => {
    const next: DevTooltipMode = getDevTooltipMode() === 'simple' ? 'advanced' : 'simple';
    setDevTooltipMode(next);
  });

  header.insertBefore(btn, logoutBtn);

  const observer = new MutationObserver(() => {
    if (!btn.isConnected) {
      unsubscribe();
      observer.disconnect();
    }
  });
  observer.observe(header, { childList: true });
}
