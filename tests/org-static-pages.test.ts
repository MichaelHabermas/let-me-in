/** @vitest-environment happy-dom */

import { describe, expect, it } from 'vitest';

import type { GateRuntime } from '../src/app/runtime-settings';
import { mountOrgBrandedStaticPage } from '../src/ui/org-static-pages';
import { createTestGateRuntime } from './support/create-test-gate-runtime';

function fakeRuntime(): GateRuntime {
  const base = createTestGateRuntime();
  return {
    ...base,
    orgName: 'Acme',
    orgTagline: '',
    gatePageTitle: 'Acme — Entry',
    adminPageTitle: 'Acme — Admin panel',
    logPageTitle: 'Acme — Log page',
  };
}

describe('mountOrgBrandedStaticPage', () => {
  it('mounts admin variant with titles and layout', () => {
    document.body.innerHTML = '<div id="app"></div>';
    mountOrgBrandedStaticPage('admin', fakeRuntime());
    expect(document.title).toBe('Acme — Admin panel');
    const h1 = document.querySelector('.page--admin .page__title');
    expect(h1?.textContent).toBe('Acme — Admin');
    expect(document.querySelector('.page--admin .page__lede')?.textContent).toMatch(/enrollment/i);
  });

  it('mounts log variant with titles and layout', () => {
    document.body.innerHTML = '<div id="app"></div>';
    mountOrgBrandedStaticPage('log', fakeRuntime());
    expect(document.title).toBe('Acme — Log page');
    const h1 = document.querySelector('.page--log .page__title');
    expect(h1?.textContent).toBe('Acme — Entry log');
    expect(document.querySelector('.page--log .page__lede')?.textContent).toContain('mountLogView');
  });
});
