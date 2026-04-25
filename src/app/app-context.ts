import type { DexiePersistence, PersistenceProvider } from '../infra/persistence';
import { resolvePersistence } from '../infra/persistence';
import type { GateRuntime } from './gate-runtime';
import { resolveGateRuntime } from './gate-runtime';

export type AppContextOptions = {
  rt?: GateRuntime;
  persistence?: DexiePersistence;
  persistenceProvider?: PersistenceProvider;
};

export type AppContext = {
  rt: GateRuntime;
  persistence: DexiePersistence;
};

/** Shared composition helper used by all page mounts and bootstrap. */
export function resolveAppContext(options: Required<AppContextOptions>): AppContext {
  return {
    rt: options?.rt ?? resolveGateRuntime(),
    persistence: resolvePersistence({
      persistence: options?.persistence,
      provider: options?.persistenceProvider,
    }),
  };
}
