/**
 * Toggle button for switching tooltip content between advanced, simple, and off.
 * Mounted in the admin header next to the logout button.
 */

import {
  cycleDevTooltipMode,
  getDevTooltipMode,
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
  switch (mode) {
    case 'simple':
      return 'Tooltips: Simple';
    case 'off':
      return 'Tooltips: Off';
    default:
      return 'Tooltips: Advanced';
  }
}

export function attachDevTooltipModeToggle(root: ParentNode): void {
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
  btn.title = 'Cycle tooltips: Advanced → Simple → Off';

  const unsubscribe = subscribeDevTooltipMode((mode) => {
    btn.textContent = labelFor(mode);
  });

  btn.addEventListener('click', () => {
    cycleDevTooltipMode();
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
