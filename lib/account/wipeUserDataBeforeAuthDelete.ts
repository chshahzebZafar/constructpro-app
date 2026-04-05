import { collection, deleteDoc, getDocs } from 'firebase/firestore';
import { getDb, isFirestoreReady } from '@/lib/firebase/config';
import { deleteAllUserAppSnapshots } from '@/lib/firestore/userAppSnapshot';
import { listBudgetProjects, deleteBudgetProject } from '@/lib/budget/repository';
import { removeLocalKeysForUid } from '@/lib/account/removeLocalKeysForUid';

/**
 * Deletes Firestore data under `users/{uid}` and all local AsyncStorage keys for this uid.
 * Call while still signed in, before `deleteUser`.
 */
export async function wipeUserDataBeforeAuthDelete(uid: string): Promise<void> {
  const projects = await listBudgetProjects();
  for (const p of projects) {
    await deleteBudgetProject(p.id);
  }

  if (isFirestoreReady() && getDb()) {
    try {
      await deleteAllUserAppSnapshots(uid);
    } catch (e) {
      console.warn('[Account] App snapshots cleanup failed:', e);
    }
    try {
      const feedbackSnap = await getDocs(collection(getDb()!, `users/${uid}/feedback`));
      for (const d of feedbackSnap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {
      console.warn('[Account] Feedback cleanup failed:', e);
    }
  }

  await removeLocalKeysForUid(uid);
}
