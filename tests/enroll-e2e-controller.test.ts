/** @vitest-environment happy-dom */

import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createEnrollmentController } from '../src/app/enroll';
import { stubCanvas2dContext } from './support/stub-canvas-2d-context';
import {
  createE2eEnrollmentCamera,
  createE2eEnrollmentDetector,
  createE2eEnrollmentEmbedder,
} from '../src/app/enroll-e2e-doubles';
import type { DatabaseSeedSettings } from '../src/domain/database-seed';
import { createDexiePersistence } from '../src/infra/persistence';

const seed: DatabaseSeedSettings = {
  thresholds: { strong: 0.85, weak: 0.65, unknown: 0.65, margin: 0.05 },
  cooldownMs: 3000,
};

const dbName = 'enroll-e2e-controller-test';

describe('createEnrollmentController with E2E doubles', () => {
  beforeEach(async () => {
    await Dexie.delete(dbName);
    stubCanvas2dContext();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await Dexie.delete(dbName);
  });

  it('idle → capture → save with doubles', async () => {
    const persistence = createDexiePersistence(dbName);
    await persistence.initDatabase(seed);

    const wrap = document.createElement('div');
    document.body.appendChild(wrap);

    const video = document.createElement('video');
    const frameCanvas = document.createElement('canvas');
    const overlayCanvas = document.createElement('canvas');
    frameCanvas.width = 640;
    frameCanvas.height = 480;
    overlayCanvas.width = 640;
    overlayCanvas.height = 480;
    wrap.append(video, frameCanvas, overlayCanvas);

    const statusEl = document.createElement('p');

    const ctrl = createEnrollmentController({
      camera: createE2eEnrollmentCamera(640, 480),
      detector: createE2eEnrollmentDetector(),
      embedder: createE2eEnrollmentEmbedder(),
      video,
      frameCanvas,
      overlayCanvas,
      statusEl,
      getNoFaceMessage: () => 'no face',
      getMultiFaceMessage: () => 'multi',
      persistence,
    });

    expect(ctrl.getState()).toBe('idle');
    await ctrl.startSession();
    expect(ctrl.getState()).toBe('detecting');

    const ok = await ctrl.captureFace();
    expect(ok).toBe(true);
    expect(ctrl.getState()).toBe('editing');

    await ctrl.saveUser('E2E User', 'Staff');
    expect(ctrl.getState()).toBe('detecting');

    const users = await persistence.usersRepo.toArray();
    expect(users).toHaveLength(1);
    expect(users[0]!.name).toBe('E2E User');
    expect(users[0]!.role).toBe('Staff');

    ctrl.dispose();
    wrap.remove();
  });
});
