import { collection, deleteDoc, getDocs } from 'firebase/firestore';
import { db, isFirestoreReady } from '@/lib/firebase/config';
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

  if (isFirestoreReady() && db) {
    try {
      const feedbackSnap = await getDocs(collection(db, `users/${uid}/feedback`));
      for (const d of feedbackSnap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {
      console.warn('[Account] Feedback cleanup failed:', e);
    }
  }

  await removeLocalKeysForUid(uid);
}
