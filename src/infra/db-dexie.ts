import Dexie, { type Table } from 'dexie';

import type { DatabaseSeedSettings } from '../domain/database-seed';
import type { AccessLogRow, Decision, User } from '../domain/types';

export interface SettingsRow {
  key: string;
  value: unknown;
}

export type { DatabaseSeedSettings } from '../domain/database-seed';

export interface DexiePersistence {
  initDatabase(seed: DatabaseSeedSettings): Promise<void>;
  resetIndexedDbClientForTests(): Promise<void>;
  usersRepo: {
    put(user: User): Promise<string>;
    get(id: string): Promise<User | undefined>;
    delete(id: string): Promise<void>;
    toArray(): Promise<User[]>;
  };
  accessLogRepo: {
    put(row: AccessLogRow): Promise<number>;
    get(timestamp: number): Promise<AccessLogRow | undefined>;
    delete(timestamp: number): Promise<void>;
    toArray(): Promise<AccessLogRow[]>;
    appendDecision(payload: {
      userId: string | null;
      similarity01: number;
      decision: Decision;
      capturedFrameBlob: Blob;
      /** When set (e.g. tests), used as the first candidate key; still bumps on collision. */
      timestamp?: number;
    }): Promise<void>;
  };
  settingsRepo: {
    put(row: SettingsRow): Promise<string>;
    get(key: string): Promise<SettingsRow | undefined>;
    delete(key: string): Promise<void>;
    toArray(): Promise<SettingsRow[]>;
  };
}

class GatekeeperDB extends Dexie {
  users!: Table<User, string>;
  accessLog!: Table<AccessLogRow, number>;
  settings!: Table<SettingsRow, string>;

  constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores({
      users: 'id,name',
      accessLog: 'timestamp,userId,decision',
      settings: 'key',
    });
  }
}

type EnsureDbReady = () => Promise<void>;

async function seedSettingsIfEmpty(db: GatekeeperDB, seed: DatabaseSeedSettings): Promise<void> {
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

function makeUsersRepo(db: GatekeeperDB, ensureDbReady: EnsureDbReady) {
  return {
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
      return db.users.delete(id);
    },
    async toArray(): Promise<User[]> {
      await ensureDbReady();
      return db.users.toArray();
    },
  };
}

function makeAccessLogRepo(db: GatekeeperDB, ensureDbReady: EnsureDbReady) {
  return {
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
      return db.accessLog.delete(timestamp);
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
      timestamp?: number;
    }): Promise<void> {
      await ensureDbReady();
      let timestamp = payload.timestamp ?? Date.now();
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
      await db.accessLog.put(row);
    },
  };
}

function makeSettingsRepo(db: GatekeeperDB, ensureDbReady: EnsureDbReady) {
  return {
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
      return db.settings.delete(key);
    },
    async toArray(): Promise<SettingsRow[]> {
      await ensureDbReady();
      return db.settings.toArray();
    },
  };
}

/** Isolated IndexedDB stack (name per instance for tests / future parallelism). */
export function createDexiePersistence(databaseName: string): DexiePersistence {
  const db = new GatekeeperDB(databaseName);
  let dbReady: Promise<void> | null = null;

  async function openAndSeed(seed: DatabaseSeedSettings): Promise<void> {
    await db.open();
    await seedSettingsIfEmpty(db, seed);
  }

  async function initDatabase(seed: DatabaseSeedSettings): Promise<void> {
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

  async function resetIndexedDbClientForTests(): Promise<void> {
    try {
      const maybePromise = db.close() as Promise<void> | void;
      if (maybePromise) await maybePromise;
    } catch {
      /* ignore: already closed or delete in progress */
    }
    dbReady = null;
  }

  return {
    initDatabase,
    resetIndexedDbClientForTests,
    usersRepo: makeUsersRepo(db, ensureDbReady),
    accessLogRepo: makeAccessLogRepo(db, ensureDbReady),
    settingsRepo: makeSettingsRepo(db, ensureDbReady),
  };
}
