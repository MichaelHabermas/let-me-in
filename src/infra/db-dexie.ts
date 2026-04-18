import Dexie, { type Table } from 'dexie';

import type { AccessLogRow, Decision, User } from './types';

export interface SettingsRow {
  key: string;
  value: unknown;
}

/** Default rows written to `settings` when the store is empty (caller supplies values). */
export interface DatabaseSeedSettings {
  thresholds: {
    strong: number;
    weak: number;
    unknown: number;
    margin: number;
  };
  cooldownMs: number;
}

class GatekeeperDB extends Dexie {
  users!: Table<User, string>;
  accessLog!: Table<AccessLogRow, number>;
  settings!: Table<SettingsRow, string>;

  constructor() {
    super('gatekeeper');
    this.version(1).stores({
      users: 'id,name',
      accessLog: 'timestamp,userId,decision',
      settings: 'key',
    });
  }
}

const db = new GatekeeperDB();

let dbReady: Promise<void> | null = null;

async function seedSettingsIfEmpty(seed: DatabaseSeedSettings): Promise<void> {
  const n = await db.settings.count();
  if (n > 0) return;
  await db.transaction('rw', db.settings, async () => {
    await db.settings.put({
      key: 'thresholds',
      value: { ...seed.thresholds },
    });
    await db.settings.put({ key: 'cooldownMs', value: seed.cooldownMs });
  });
}

async function openAndSeed(seed: DatabaseSeedSettings): Promise<void> {
  await db.open();
  await seedSettingsIfEmpty(seed);
}

/** Open DB and ensure default settings rows exist (E1.S2.F1.T3). Idempotent per process until reset. */
export async function initDatabase(seed: DatabaseSeedSettings): Promise<void> {
  if (!dbReady) {
    dbReady = openAndSeed(seed);
  }
  await dbReady;
}

async function ensureDbReady(): Promise<void> {
  if (!dbReady) {
    throw new Error('initDatabase() must be called before using repositories');
  }
  await dbReady;
}

/** Close client and drop init promise — use in tests after Dexie.delete. */
export async function resetIndexedDbClientForTests(): Promise<void> {
  try {
    const maybePromise = db.close() as Promise<void> | void;
    if (maybePromise) await maybePromise;
  } catch {
    /* ignore: already closed or delete in progress */
  }
  dbReady = null;
}

export const usersRepo = {
  async put(user: User): Promise<string> {
    await ensureDbReady();
    return db.users.put(user);
  },
  async get(id: string): Promise<User | undefined> {
    await ensureDbReady();
    return db.users.get(id);
  },
  async delete(id: string): Promise<void> {
    await ensureDbReady();
    await db.users.delete(id);
  },
  async toArray(): Promise<User[]> {
    await ensureDbReady();
    return db.users.toArray();
  },
};

export const accessLogRepo = {
  async put(row: AccessLogRow): Promise<number> {
    await ensureDbReady();
    return db.accessLog.put(row);
  },
  async get(timestamp: number): Promise<AccessLogRow | undefined> {
    await ensureDbReady();
    return db.accessLog.get(timestamp);
  },
  async delete(timestamp: number): Promise<void> {
    await ensureDbReady();
    await db.accessLog.delete(timestamp);
  },
  async toArray(): Promise<AccessLogRow[]> {
    await ensureDbReady();
    return db.accessLog.toArray();
  },
  async appendDecision(payload: {
    userId: string | null;
    similarity01: number;
    decision: Decision;
    capturedFrameBlob: Blob;
  }): Promise<void> {
    await ensureDbReady();
    let timestamp = Date.now();
    while (await db.accessLog.get(timestamp)) {
      timestamp += 1;
    }
    const row: AccessLogRow = {
      timestamp,
      userId: payload.userId,
      similarity01: payload.similarity01,
      decision: payload.decision,
      capturedFrameBlob: payload.capturedFrameBlob,
    };
    await accessLogRepo.put(row);
  },
};

export const settingsRepo = {
  async put(row: SettingsRow): Promise<string> {
    await ensureDbReady();
    return db.settings.put(row);
  },
  async get(key: string): Promise<SettingsRow | undefined> {
    await ensureDbReady();
    return db.settings.get(key);
  },
  async delete(key: string): Promise<void> {
    await ensureDbReady();
    await db.settings.delete(key);
  },
  async toArray(): Promise<SettingsRow[]> {
    await ensureDbReady();
    return db.settings.toArray();
  },
};
