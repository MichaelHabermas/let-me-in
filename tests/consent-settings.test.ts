/** @vitest-environment happy-dom */

import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';

import { readConsentAccepted, writeConsentAccepted } from '../src/app/consent';
import { createDexiePersistence } from '../src/infra/persistence';

import { createTestGateRuntime } from './support/create-test-gate-runtime';

describe('consent settings', () => {
  it('persists and reads consentAccepted', async () => {
    const dbName = `consent-${crypto.randomUUID()}`;
    const persistence = createDexiePersistence(dbName);
    const rt = createTestGateRuntime();
    await persistence.initDatabase(rt.databaseSeedSettings!);

    expect(await readConsentAccepted(persistence)).toBeNull();
    await writeConsentAccepted(persistence);
    const row = await readConsentAccepted(persistence);
    expect(row?.timestamp).toBeTypeOf('number');

    await persistence.resetIndexedDbClientForTests();
    await Dexie.delete(dbName);
  });
});
