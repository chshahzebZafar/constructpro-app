import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase/config';

/** Top-level user docs: `users/{uid}/appSnapshots/{key}` with `{ payload, updatedAt }`. */
export const USER_APP_SNAPSHOTS = 'appSnapshots';

export const USER_SNAPSHOT_KEYS = {
  quickNotes: 'quickNotes',
  invoices: 'invoices',
} as const;

function snapDoc(uid: string, key: string) {
  return doc(getDb()!, `users/${uid}/${USER_APP_SNAPSHOTS}`, key);
}

export async function getUserAppSnapshot<T>(uid: string, key: string): Promise<T | null> {
  const s = await getDoc(snapDoc(uid, key));
  if (!s.exists()) return null;
  const data = s.data() as { payload?: T };
  return data.payload !== undefined ? data.payload : null;
}

export async function userAppSnapshotDocExists(uid: string, key: string): Promise<boolean> {
  const s = await getDoc(snapDoc(uid, key));
  return s.exists();
}

export async function setUserAppSnapshot(uid: string, key: string, payload: unknown): Promise<void> {
  await setDoc(snapDoc(uid, key), {
    payload,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAllUserAppSnapshots(uid: string): Promise<void> {
  const db = getDb()!;
  const col = collection(db, `users/${uid}/${USER_APP_SNAPSHOTS}`);
  const snap = await getDocs(col);
  if (snap.empty) return;
  let batch = writeBatch(db);
  let n = 0;
  for (const d of snap.docs) {
    batch.delete(d.ref);
    n++;
    if (n >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      n = 0;
    }
  }
  if (n > 0) await batch.commit();
}
