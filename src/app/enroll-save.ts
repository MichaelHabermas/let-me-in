import type { User } from '../domain/types';
import type { DexiePersistence } from '../infra/persistence';

export type PersistEnrolledUserInput = {
  name: string;
  role: string;
  embedding: Float32Array;
  referenceImageBlob: Blob;
  /** When set, updates this user instead of creating a new row. */
  existingUserId?: string;
  /** When updating, keep prior `createdAt` unless set to `false`. @default true when `existingUserId` is set */
  preserveCreatedAt?: boolean;
  /** @default crypto.randomUUID */
  randomId?: () => string;
  /** @default Date.now */
  nowMs?: () => number;
};

export async function persistEnrolledUser(
  persistence: DexiePersistence,
  input: PersistEnrolledUserInput,
): Promise<string> {
  const now = input.nowMs?.() ?? Date.now();
  const existingId = input.existingUserId;
  if (existingId) {
    const prev = await persistence.usersRepo.get(existingId);
    const preserve = input.preserveCreatedAt !== false;
    const createdAt = preserve ? (prev?.createdAt ?? now) : now;
    const user: User = {
      id: existingId,
      name: input.name.trim(),
      role: input.role.trim(),
      referenceImageBlob: input.referenceImageBlob,
      embedding: input.embedding,
      createdAt,
    };
    await persistence.usersRepo.put(user);
    return existingId;
  }

  const id = input.randomId?.() ?? crypto.randomUUID();
  const user: User = {
    id,
    name: input.name.trim(),
    role: input.role.trim(),
    referenceImageBlob: input.referenceImageBlob,
    embedding: input.embedding,
    createdAt: now,
  };
  await persistence.usersRepo.put(user);
  return id;
}
