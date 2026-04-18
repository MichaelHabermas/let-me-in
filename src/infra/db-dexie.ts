import Dexie, { type Table } from 'dexie';

import { config } from '../config';
import type { AccessLogRow, Decision, User } from './types';

export interface SettingsRow {
  key: string;
  value: unknown;
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

async function seedSettingsIfEmpty(): Promise<void> {
  const n = await db.settings.count();
  if (n > 0) return;
  await db.transaction('rw', db.settings, async () => {
    await db.settings.put({
      key: 'thresholds',
      value: { ...config.thresholds },
    });
    await db.settings.put({ key: 'cooldownMs', value: config.cooldownMs });
  });
}

/** Open DB and ensure default settings rows exist (E1.S2.F1.T3). */
export async function initDatabase(): Promise<void> {
  await db.open();
  await seedSettingsIfEmpty();
}

export const usersRepo = {
  async put(user: User): Promise<string> {
    await initDatabase();
    return db.users.put(user);
  },
  async get(id: string): Promise<User | undefined> {
    await initDatabase();
    return db.users.get(id);
  },
  async delete(id: string): Promise<void> {
    await initDatabase();
    await db.users.delete(id);
  },
  async toArray(): Promise<User[]> {
    await initDatabase();
    return db.users.toArray();
  },
};

export const accessLogRepo = {
  async put(row: AccessLogRow): Promise<number> {
    await initDatabase();
    return db.accessLog.put(row);
  },
  async get(timestamp: number): Promise<AccessLogRow | undefined> {
    await initDatabase();
    return db.accessLog.get(timestamp);
  },
  async delete(timestamp: number): Promise<void> {
    await initDatabase();
    await db.accessLog.delete(timestamp);
  },
  async toArray(): Promise<AccessLogRow[]> {
    await initDatabase();
    return db.accessLog.toArray();
  },
  async appendDecision(payload: {
    userId: string | null;
    similarity01: number;
    decision: Decision;
    capturedFrameBlob: Blob;
  }): Promise<void> {
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
    await this.put(row);
  },
};

export const settingsRepo = {
  async put(row: SettingsRow): Promise<string> {
    await initDatabase();
    return db.settings.put(row);
  },
  async get(key: string): Promise<SettingsRow | undefined> {
    await initDatabase();
    return db.settings.get(key);
  },
  async delete(key: string): Promise<void> {
    await initDatabase();
    await db.settings.delete(key);
  },
  async toArray(): Promise<SettingsRow[]> {
    await initDatabase();
    return db.settings.toArray();
  },
};
