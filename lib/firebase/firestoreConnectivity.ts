import type {
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  Query,
  QuerySnapshot,
} from 'firebase/firestore';
import { getDoc, getDocFromCache, getDocs, getDocsFromCache } from 'firebase/firestore';
import { getIsOnline } from '@/lib/network/connectivity';

/**
 * Firestore write promises resolve when the backend applies the change. While offline,
 * that never happens, so awaiting would block forever. Queue the work without awaiting.
 */
export async function awaitFirestoreMutation(promise: Promise<unknown>): Promise<void> {
  if (getIsOnline()) {
    await promise;
    return;
  }
  void promise.catch((e: unknown) =>
    console.warn('[Firestore] mutation queued offline (will sync when online)', e)
  );
}

export async function getDocsForConnectivity<AppModelType extends DocumentData = DocumentData>(
  query: Query<AppModelType>
): Promise<QuerySnapshot<AppModelType>> {
  if (getIsOnline()) return getDocs(query);
  return getDocsFromCache(query);
}

function offlineMissingSnapshot(ref: DocumentReference): DocumentSnapshot {
  return {
    exists: () => false,
    data: () => undefined,
    id: ref.id,
    ref,
  } as DocumentSnapshot<DocumentData>;
}

export async function getDocForConnectivity(
  ref: DocumentReference
): Promise<DocumentSnapshot<DocumentData>> {
  if (getIsOnline()) return getDoc(ref);
  try {
    return await getDocFromCache(ref);
  } catch {
    return offlineMissingSnapshot(ref);
  }
}
