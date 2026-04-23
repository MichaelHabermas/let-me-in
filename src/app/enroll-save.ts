import type { User } from '../domain/types';
import type { DexiePersistence } from '../infra/persistence';

export type PersistEnrolledUserInput = {
  name: string;
  role: string;
  embedding: Float32Array;
  referenceImageBlob: Blob;
  /** @default crypto.randomUUID */
  randomId?: () => string;
  /** @default Date.now */
  nowMs?: () => number;
};

export async function persistEnrolledUser(
  persistence: DexiePersistence,
  input: PersistEnrolledUserInput,
): Promise<string> {
  const id = input.randomId?.() ?? crypto.randomUUID();
  const user: User = {
    id,
    name: input.name.trim(),
    role: input.role.trim(),
    referenceImageBlob: input.referenceImageBlob,
    embedding: input.embedding,
    createdAt: input.nowMs?.() ?? Date.now(),
  };
  await persistence.usersRepo.put(user);
  return id;
}
