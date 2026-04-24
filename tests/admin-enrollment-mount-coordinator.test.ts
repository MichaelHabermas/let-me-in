import Dexie from 'dexie';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountAuthenticatedAdminEnrollmentCoordinator } from '../src/app/admin-enrollment-mount-coordinator';
import { createDexiePersistence } from '../src/infra/persistence';

import { createTestGateRuntime } from './support/create-test-gate-runtime';
import { embeddingVectorZeros } from './support/test-embeddings';
import { stubCanvas2dContext } from './support/stub-canvas-2d-context';

describe('mountAuthenticatedAdminEnrollmentCoordinator', () => {
  const dbName = `enroll-coord-${crypto.randomUUID()}`;

  afterEach(async () => {
    await Dexie.delete(dbName);
  });

  it('mounts and disposes without throwing (stub enrollment)', async () => {
    const restoreCanvas = stubCanvas2dContext();
    try {
      const persistence = createDexiePersistence(dbName);
      const rt = createTestGateRuntime();
      await persistence.initDatabase(rt.databaseSeedSettings);
      await persistence.usersRepo.put({
        id: 'u1',
        name: 'One',
        role: 'Staff',
        referenceImageBlob: new Blob(),
        embedding: embeddingVectorZeros(),
        createdAt: 1,
      });
      const root = document.createElement('div');
      document.body.appendChild(root);
      const auth = {
        isAdmin: () => true,
        logout: vi.fn(),
        login: vi.fn(() => true),
      };
      const teardown = mountAuthenticatedAdminEnrollmentCoordinator({
        root,
        rt,
        persistence,
        auth,
        rerender: vi.fn(),
        useStubEnrollment: true,
      });
      expect(root.querySelector('[data-testid="admin-enroll-root"]')).not.toBeNull();
      await vi.waitFor(() =>
        expect(root.querySelectorAll('[data-testid="admin-user-roster-tbody"] tr').length).toBe(1),
      );
      teardown();
      document.body.removeChild(root);
      await persistence.resetIndexedDbClientForTests();
    } finally {
      restoreCanvas();
    }
  });
});
