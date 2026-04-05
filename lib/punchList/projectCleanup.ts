import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { getDb, isFirestoreReady } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import { deleteStoragePaths } from './storageUpload';

const PUNCH_LOCAL_PREFIX = 'constructpro_punch_v1_';

function useCloudPunch(): boolean {
  const s = useAuthStore.getState();
  return Boolean(isFirestoreReady() && getDb() && s.user?.uid && !s.temporaryDevLogin);
}

interface LocalPunchBlob {
  itemsByProject: Record<string, unknown>;
}

/**
 * Removes all punch items (and cloud photos) for a project.
 * Called when a project is deleted from the budget flow so subcollections do not linger.
 */
export async function deletePunchDataForProject(uid: string, projectId: string): Promise<void> {
  if (useCloudPunch()) {
    const itemsRef = collection(getDb()!, `users/${uid}/projects/${projectId}/punchItems`);
    const snap = await getDocs(itemsRef);
    for (const d of snap.docs) {
      const data = d.data() as { photoPaths?: string[] };
      const paths = data.photoPaths ?? [];
      await deleteStoragePaths(paths);
      await deleteDoc(doc(getDb()!, `users/${uid}/projects/${projectId}/punchItems`, d.id));
    }
    return;
  }

  const raw = await AsyncStorage.getItem(PUNCH_LOCAL_PREFIX + uid);
  if (!raw) return;
  try {
    const blob = JSON.parse(raw) as LocalPunchBlob;
    if (!blob.itemsByProject) return;
    delete blob.itemsByProject[projectId];
    await AsyncStorage.setItem(PUNCH_LOCAL_PREFIX + uid, JSON.stringify(blob));
  } catch {
    /* ignore */
  }
}
