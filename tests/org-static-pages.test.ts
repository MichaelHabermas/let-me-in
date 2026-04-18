/** @vitest-environment happy-dom */

import { describe, expect, it } from 'vitest';

import type { GateRuntime } from '../src/app/runtime-settings';
import { mountOrgBrandedStaticPage } from '../src/ui/org-static-pages';

function fakeRuntime(): GateRuntime {
  return {
    orgName: 'Acme',
    gatePageTitle: 'Acme — Entry',
    adminPageTitle: 'Acme — Admin panel',
    logPageTitle: 'Acme — Log page',
    previewCanvasWidth: 1,
    previewCanvasHeight: 1,
    showFpsOverlay: false,
    getDatabaseSeedSettings: () => ({
      thresholds: { strong: 1, weak: 1, unknown: 1, margin: 1 },
      cooldownMs: 0,
    }),
    getDefaultVideoConstraintsForCamera: () => ({
      idealWidth: 1,
      idealHeight: 1,
      facingMode: 'user',
    }),
    getCameraUserFacingMessage: () => '',
    getCameraStartLabel: () => '',
    getCameraStopLabel: () => '',
    getDetectorLoadingMessage: () => '',
    getDetectorLoadFailedMessage: () => '',
  };
}

describe('mountOrgBrandedStaticPage', () => {
  it('mounts admin variant with titles and layout', () => {
    document.body.innerHTML = '<div id="app"></div>';
    mountOrgBrandedStaticPage('admin', fakeRuntime());
    expect(document.title).toBe('Acme — Admin panel');
    const h1 = document.querySelector('.page--admin .page__title');
    expect(h1?.textContent).toBe('Acme — Admin');
    expect(document.querySelector('.page--admin .page__lede')?.textContent).toContain('Epic E6');
  });

  it('mounts log variant with titles and layout', () => {
    document.body.innerHTML = '<div id="app"></div>';
    mountOrgBrandedStaticPage('log', fakeRuntime());
    expect(document.title).toBe('Acme — Log page');
    const h1 = document.querySelector('.page--log .page__title');
    expect(h1?.textContent).toBe('Acme — Entry log');
    expect(document.querySelector('.page--log .page__lede')?.textContent).toContain('Epic E7');
  });
});
