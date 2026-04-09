import { collection, doc, type CollectionReference, type DocumentReference } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { requireFirestore } from '@/lib/firebase/config';

/**
 * Canonical Firestore layout for ConstructPro.
 * Keep Security Rules and new tool code aligned with these paths.
 *
 * users/{uid}/
 *   appSnapshots/{key}           — user-wide app data (quick notes, invoices, …)
 *   projects/{projectId}         — project metadata
 *   projects/{projectId}/
 *     budgetLines/{lineId}
 *     toolSnapshots/{toolKey}     — per-tool JSON snapshot for sync
 *   feedback/{id}
 */
export const FS = {
  users: 'users',
  projects: 'projects',
  appSnapshots: 'appSnapshots',
  toolSnapshots: 'toolSnapshots',
  budgetLines: 'budgetLines',
  feedback: 'feedback',
} as const;

export function userRootPath(uid: string): string {
  return `${FS.users}/${uid}`;
}

export function userProjectsRef(db: Firestore, uid: string): CollectionReference {
  return collection(db, FS.users, uid, FS.projects);
}

export function userProjectDocRef(db: Firestore, uid: string, projectId: string): DocumentReference {
  return doc(db, FS.users, uid, FS.projects, projectId);
}

export function userAppSnapshotsRef(db: Firestore, uid: string): CollectionReference {
  return collection(db, FS.users, uid, FS.appSnapshots);
}

export function userFeedbackRef(db: Firestore, uid: string): CollectionReference {
  return collection(db, FS.users, uid, FS.feedback);
}

export function projectToolSnapshotsRef(db: Firestore, uid: string, projectId: string): CollectionReference {
  return collection(db, FS.users, uid, FS.projects, projectId, FS.toolSnapshots);
}

export function projectBudgetLinesRef(db: Firestore, uid: string, projectId: string): CollectionReference {
  return collection(db, FS.users, uid, FS.projects, projectId, FS.budgetLines);
}

/** Default export: Firestore instance + path helpers bound to current app DB. */
export function getFirestoreContext() {
  const db = requireFirestore();
  return {
    db,
    userProjectsRef: (uid: string) => userProjectsRef(db, uid),
    userProjectDocRef: (uid: string, projectId: string) => userProjectDocRef(db, uid, projectId),
    userAppSnapshotsRef: (uid: string) => userAppSnapshotsRef(db, uid),
    userFeedbackRef: (uid: string) => userFeedbackRef(db, uid),
    projectToolSnapshotsRef: (uid: string, projectId: string) =>
      projectToolSnapshotsRef(db, uid, projectId),
    projectBudgetLinesRef: (uid: string, projectId: string) =>
      projectBudgetLinesRef(db, uid, projectId),
  };
}
