/** @vitest-environment happy-dom */

import { describe, expect, it } from 'vitest';

import type { GateRuntime } from '../src/app/runtime-settings';
import { mountOrgBrandedStaticPage } from '../src/ui/org-static-pages';

function fakeRuntime(): GateRuntime {
  return {
    orgName: 'Acme',
    orgTagline: '',
    gatePageTitle: 'Acme — Entry',
    adminPageTitle: 'Acme — Admin panel',
    logPageTitle: 'Acme — Log page',
    previewCanvasWidth: 1,
    previewCanvasHeight: 1,
    showFpsOverlay: false,
    devLogEmbeddingTimings: false,
    getDatabaseSeedSettings: () => ({
      thresholds: { strong: 1, weak: 1, unknown: 1, margin: 1 },
      cooldownMs: 0,
    }),
    getGatePreviewSessionCoreDeps() {
      return {
        getDefaultVideoConstraintsForCamera: () => ({
          idealWidth: 1,
          idealHeight: 1,
          facingMode: 'user',
        }),
        getCameraUserFacingMessage: () => '',
        logEmbeddingTimings: false,
        detectorLoadingMessage: '',
        detectorLoadFailedMessage: '',
        noFaceMessage: 'No face',
        multiFaceMessage: 'Multiple faces',
        cooldownMs: 0,
      };
    },
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
    getNoFaceMessage: () => 'No face',
    getMultiFaceMessage: () => 'Multiple faces',
    getAdminUiStrings: () => ({
      loginHeading: '',
      loginUsername: '',
      loginPassword: '',
      loginSubmit: '',
      loginError: '',
      logout: '',
      enrollTitle: '',
      enrollStartCamera: '',
      enrollCapture: '',
      enrollRetake: '',
      enrollSave: '',
      enrollNameLabel: '',
      enrollRoleLabel: '',
      enrollRolePlaceholder: '',
      enrollRoleRequired: '',
      enrollRoleLegacySuffix: '',
      enrollSuccess: '',
      enrollNameRequired: '',
      rosterTitle: '',
      rosterColPhoto: '',
      rosterColName: '',
      rosterColRole: '',
      rosterColCreated: '',
      rosterColActions: '',
      rosterEdit: '',
      rosterDelete: '',
      rosterThumbnailAlt: '',
      rosterBulkImport: '',
      rosterImportPick: '',
      rosterImportConfirmDuplicates: '',
      rosterImportProgress: '',
      rosterImportDone: '',
      rosterDeleteConfirm: '',
    }),
    getGateAccessUiStrings: () => ({
      formatGranted: (n, p) => `${n} ${p}`,
      formatDenied: (p) => `x ${p}`,
      tryAgain: 'try',
    }),
    getConsentModalStrings: () => ({
      title: 't',
      intro: 'i',
      bullets: ['a', 'b'],
      accept: 'ok',
      decline: 'no',
    }),
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
