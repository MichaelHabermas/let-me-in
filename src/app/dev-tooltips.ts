/**
 * Dev-only hover tooltips for studying UI sections during interview prep.
 *
 * `attachDevTooltip` short-circuits in production via `import.meta.env.DEV`,
 * so Vite/terser tree-shake the unreachable body and ship nothing to prod.
 */

import { getDevTooltipMode, subscribeDevTooltipMode } from './dev-tooltip-mode';

export type DevTooltipGlossaryEntry = { term: string; def: string };

export type DevTooltipSimpleVariant = {
  title?: string;
  what: string;
  why: string;
  decisions?: readonly string[];
  tradeoffs?: readonly string[];
  glossary?: readonly DevTooltipGlossaryEntry[];
};

export type DevTooltipContent = {
  title: string;
  what: string;
  why: string;
  decisions?: readonly string[];
  tradeoffs?: readonly string[];
  glossary?: readonly DevTooltipGlossaryEntry[];
  simple?: DevTooltipSimpleVariant;
};

type DevTooltipView = {
  title: string;
  what: string;
  why: string;
  decisions?: readonly string[];
  tradeoffs?: readonly string[];
  glossary?: readonly DevTooltipGlossaryEntry[];
};

export function attachDevTooltip(el: HTMLElement, content: DevTooltipContent): void {
  if (!import.meta.env.DEV) return;
  ensureStyles();
  el.setAttribute('data-dev-tooltip', '');
  el.addEventListener('mouseenter', () => showPanel(el, content));
  el.addEventListener('mouseleave', scheduleHide);
  el.addEventListener('focus', () => showPanel(el, content));
  el.addEventListener('blur', scheduleHide);
}

let panel: HTMLDivElement | null = null;
let stylesInjected = false;
let hideTimer: number | null = null;
const HIDE_DELAY_MS = 120;

function ensureStyles(): void {
  if (stylesInjected) return;
  const style = document.createElement('style');
  style.id = 'dev-tooltip-styles';
  style.textContent = TOOLTIP_CSS;
  document.head.appendChild(style);
  stylesInjected = true;
}

function getPanel(): HTMLDivElement {
  if (panel) return panel;
  const el = document.createElement('div');
  el.className = 'dev-tooltip-panel';
  el.setAttribute('role', 'tooltip');
  el.addEventListener('mouseenter', cancelHide);
  el.addEventListener('mouseleave', scheduleHide);
  subscribeDevTooltipMode(() => el.classList.remove('dev-tooltip-panel--visible'));
  document.body.appendChild(el);
  panel = el;
  return el;
}

function showPanel(anchor: HTMLElement, content: DevTooltipContent): void {
  cancelHide();
  const el = getPanel();
  el.replaceChildren(renderPanel(content));
  el.classList.add('dev-tooltip-panel--visible');
  positionPanel(el, anchor);
}

function scheduleHide(): void {
  cancelHide();
  hideTimer = window.setTimeout(() => {
    panel?.classList.remove('dev-tooltip-panel--visible');
    hideTimer = null;
  }, HIDE_DELAY_MS);
}

function cancelHide(): void {
  if (hideTimer === null) return;
  clearTimeout(hideTimer);
  hideTimer = null;
}

function renderPanel(content: DevTooltipContent): DocumentFragment {
  const view = pickView(content);
  const frag = document.createDocumentFragment();
  frag.appendChild(buildHeading(view.title));
  frag.appendChild(buildSection('What', view.what));
  frag.appendChild(buildSection('Why', view.why));
  if (view.decisions?.length) frag.appendChild(buildList('Decisions', view.decisions));
  if (view.tradeoffs?.length) frag.appendChild(buildList('Trade-offs', view.tradeoffs));
  if (view.glossary?.length) frag.appendChild(buildGlossary(view.glossary));
  return frag;
}

function pickView(content: DevTooltipContent): DevTooltipView {
  if (getDevTooltipMode() === 'simple' && content.simple) {
    const s = content.simple;
    return {
      title: s.title ?? content.title,
      what: s.what,
      why: s.why,
      decisions: s.decisions,
      tradeoffs: s.tradeoffs,
      glossary: s.glossary,
    };
  }
  return {
    title: content.title,
    what: content.what,
    why: content.why,
    decisions: content.decisions,
    tradeoffs: content.tradeoffs,
    glossary: content.glossary,
  };
}

function buildHeading(text: string): HTMLElement {
  const h = document.createElement('div');
  h.className = 'dev-tooltip-panel__title';
  h.textContent = text;
  return h;
}

function buildSection(label: string, body: string): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'dev-tooltip-panel__section';
  wrap.append(buildLabel(label));
  const p = document.createElement('p');
  p.className = 'dev-tooltip-panel__body';
  p.textContent = body;
  wrap.appendChild(p);
  return wrap;
}

function buildList(label: string, items: readonly string[]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'dev-tooltip-panel__section';
  wrap.append(buildLabel(label));
  const ul = document.createElement('ul');
  ul.className = 'dev-tooltip-panel__list';
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  }
  wrap.appendChild(ul);
  return wrap;
}

function buildGlossary(items: readonly DevTooltipGlossaryEntry[]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'dev-tooltip-panel__section';
  wrap.append(buildLabel('Glossary'));
  const dl = document.createElement('dl');
  dl.className = 'dev-tooltip-panel__glossary';
  for (const { term, def } of items) {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = def;
    dl.append(dt, dd);
  }
  wrap.appendChild(dl);
  return wrap;
}

function buildLabel(text: string): HTMLElement {
  const lab = document.createElement('div');
  lab.className = 'dev-tooltip-panel__label';
  lab.textContent = text;
  return lab;
}

function positionPanel(el: HTMLDivElement, anchor: HTMLElement): void {
  const rect = anchor.getBoundingClientRect();
  el.style.left = `${rect.left}px`;
  el.style.top = `${rect.bottom + PANEL_MARGIN}px`;
  requestAnimationFrame(() => clampToViewport(el, rect));
}

function clampToViewport(el: HTMLDivElement, anchorRect: DOMRect): void {
  const panelRect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = anchorRect.left;
  let top = anchorRect.bottom + PANEL_MARGIN;
  if (left + panelRect.width + PANEL_MARGIN > vw) left = vw - panelRect.width - PANEL_MARGIN;
  if (left < PANEL_MARGIN) left = PANEL_MARGIN;
  if (top + panelRect.height + PANEL_MARGIN > vh) {
    top = anchorRect.top - panelRect.height - PANEL_MARGIN;
    if (top < PANEL_MARGIN) top = PANEL_MARGIN;
  }
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}

const PANEL_MARGIN = 8;

const TOOLTIP_CSS = `
[data-dev-tooltip] {
  cursor: help;
  outline: 1px dashed rgba(140, 110, 230, 0.4);
  outline-offset: 3px;
  border-radius: 2px;
}
.dev-tooltip-panel {
  position: fixed;
  z-index: 99999;
  max-width: 380px;
  padding: 12px 14px;
  background: #1b1b22;
  color: #e8e8ee;
  border: 1px solid rgba(150, 110, 230, 0.55);
  border-radius: 8px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  font-size: 12.5px;
  line-height: 1.5;
  pointer-events: none;
  opacity: 0;
  transform: translateY(-2px);
  transition: opacity 90ms ease-out, transform 90ms ease-out;
}
.dev-tooltip-panel--visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
.dev-tooltip-panel__title {
  font-weight: 600;
  font-size: 13px;
  color: #cbb6ff;
  margin-bottom: 8px;
  letter-spacing: 0.01em;
}
.dev-tooltip-panel__section + .dev-tooltip-panel__section {
  margin-top: 9px;
}
.dev-tooltip-panel__label {
  font-family: 'IBM Plex Mono', ui-monospace, monospace;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #9b8bd1;
  margin-bottom: 3px;
}
.dev-tooltip-panel__body {
  margin: 0;
}
.dev-tooltip-panel__list {
  margin: 0;
  padding-left: 18px;
}
.dev-tooltip-panel__list li + li {
  margin-top: 3px;
}
.dev-tooltip-panel__glossary {
  display: grid;
  grid-template-columns: max-content 1fr;
  column-gap: 10px;
  row-gap: 4px;
  margin: 0;
}
.dev-tooltip-panel__glossary dt {
  font-weight: 600;
  color: #cbb6ff;
}
.dev-tooltip-panel__glossary dd {
  margin: 0;
}
`;
