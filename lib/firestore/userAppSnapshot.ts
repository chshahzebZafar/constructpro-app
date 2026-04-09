import { doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { requireFirestore } from '@/lib/firebase/config';
import { awaitFirestoreMutation, getDocForConnectivity, getDocsForConnectivity } from '@/lib/firebase/firestoreConnectivity';
import { userAppSnapshotsRef } from '@/lib/firebase/firestorePaths';

/** Top-level user docs: `users/{uid}/appSnapshots/{key}` with `{ payload, updatedAt }`. */
export const USER_APP_SNAPSHOTS = 'appSnapshots';

export const USER_SNAPSHOT_KEYS = {
  quickNotes: 'quickNotes',
  invoices: 'invoices',
} as const;

function snapDoc(uid: string, key: string) {
  const db = requireFirestore();
  return doc(userAppSnapshotsRef(db, uid), key);
}

export async function getUserAppSnapshot<T>(uid: string, key: string): Promise<T | null> {
  const s = await getDocForConnectivity(snapDoc(uid, key));
  if (!s.exists()) return null;
  const data = s.data() as { payload?: T };
  return data.payload !== undefined ? data.payload : null;
}

export async function userAppSnapshotDocExists(uid: string, key: string): Promise<boolean> {
  const s = await getDocForConnectivity(snapDoc(uid, key));
  return s.exists();
}

export async function setUserAppSnapshot(uid: string, key: string, payload: unknown): Promise<void> {
  await awaitFirestoreMutation(
    setDoc(snapDoc(uid, key), {
      payload,
      updatedAt: serverTimestamp(),
    })
  );
}

export async function deleteAllUserAppSnapshots(uid: string): Promise<void> {
  const db = requireFirestore();
  const col = userAppSnapshotsRef(db, uid);
  const snap = await getDocsForConnectivity(col);
  if (snap.empty) return;
  let batch = writeBatch(db);
  let n = 0;
  for (const d of snap.docs) {
    batch.delete(d.ref);
    n++;
    if (n >= 400) {
      await awaitFirestoreMutation(batch.commit());
      batch = writeBatch(db);
      n = 0;
    }
  }
  if (n > 0) await awaitFirestoreMutation(batch.commit());
}
