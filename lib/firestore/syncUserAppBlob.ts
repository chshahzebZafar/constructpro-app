import { getBudgetStorageMode } from '@/lib/budget/repository';
import {
  getUserAppSnapshot,
  setUserAppSnapshot,
  userAppSnapshotDocExists,
  USER_SNAPSHOT_KEYS,
} from '@/lib/firestore/userAppSnapshot';

export async function loadUserPayloadOrMigrate<T>(
  uid: string,
  key: (typeof USER_SNAPSHOT_KEYS)[keyof typeof USER_SNAPSHOT_KEYS],
  loadLocal: () => Promise<T>,
  saveLocal: (payload: T) => Promise<void>,
  emptyPayload: T
): Promise<T> {
  if (getBudgetStorageMode() !== 'cloud') {
    return loadLocal();
  }

  const exists = await userAppSnapshotDocExists(uid, key);
  if (!exists) {
    const local = await loadLocal();
    await setUserAppSnapshot(uid, key, local);
    await saveLocal(emptyPayload);
    return local;
  }

  const data = await getUserAppSnapshot<T>(uid, key);
  return data !== null && data !== undefined ? data : emptyPayload;
}
