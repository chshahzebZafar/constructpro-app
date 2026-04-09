import { doc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { requireFirestore } from '@/lib/firebase/config';
import { awaitFirestoreMutation, getDocForConnectivity, getDocsForConnectivity } from '@/lib/firebase/firestoreConnectivity';
import { projectToolSnapshotsRef, userProjectDocRef } from '@/lib/firebase/firestorePaths';

/** Subcollection under each project: one doc per tool key, `{ payload, updatedAt }`. */
export const TOOL_SNAPSHOTS = 'toolSnapshots';

export const TOOL_KEYS = {
  tasks: 'tasks',
  permits: 'permits',
  milestones: 'milestones',
  gantt: 'gantt',
  cpm: 'cpm',
  rfi: 'rfi',
  ppe: 'ppe',
  incidents: 'incidents',
  dailySiteLog: 'dailySiteLog',
  progressReport: 'progressReport',
  contractBuilder: 'contractBuilder',
  resourceScheduler: 'resourceScheduler',
  droneReport: 'droneReport',
  bimViewer: 'bimViewer',
} as const;

export type ToolSnapshotKey = (typeof TOOL_KEYS)[keyof typeof TOOL_KEYS];

function snapDoc(uid: string, projectId: string, key: string) {
  const db = requireFirestore();
  return doc(projectToolSnapshotsRef(db, uid, projectId), key);
}

export async function getToolSnapshot<T>(uid: string, projectId: string, key: string): Promise<T | null> {
  const s = await getDocForConnectivity(snapDoc(uid, projectId, key));
  if (!s.exists()) return null;
  const data = s.data() as { payload?: T };
  return data.payload !== undefined ? data.payload : null;
}

/** Returns true if the snapshot doc exists (even if payload is empty array). */
export async function toolSnapshotDocExists(uid: string, projectId: string, key: string): Promise<boolean> {
  const s = await getDocForConnectivity(snapDoc(uid, projectId, key));
  return s.exists();
}

export async function setToolSnapshot(uid: string, projectId: string, key: string, payload: unknown): Promise<void> {
  const db = requireFirestore();
  await awaitFirestoreMutation(
    Promise.all([
      setDoc(snapDoc(uid, projectId, key), {
        payload,
        updatedAt: serverTimestamp(),
      }),
      updateDoc(userProjectDocRef(db, uid, projectId), {
        updatedAt: serverTimestamp(),
      }),
    ])
  );
}

export async function deleteToolSnapshotsForProject(uid: string, projectId: string): Promise<void> {
  const db = requireFirestore();
  const col = projectToolSnapshotsRef(db, uid, projectId);
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
