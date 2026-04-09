import { waitForPendingWrites } from 'firebase/firestore';
import type { QueryClient } from '@tanstack/react-query';
import { getDb, isFirestoreReady } from '@/lib/firebase/config';
import { invalidateQueriesAfterFirestoreReconnect } from '@/lib/query/invalidateSharedProjectQueries';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Firestore already keeps a **local database** on the device (`persistentLocalCache` in config)
 * and queues writes offline; the SDK syncs to the cloud when the network returns.
 *
 * This helper runs **after** reconnect: wait for pending writes to be acknowledged, then
 * refresh React Query caches so the UI shows server-consistent data.
 */
export async function refreshAfterReconnect(queryClient: QueryClient): Promise<void> {
  const uid = useAuthStore.getState().user?.uid ?? useAuthStore.getState().offlinePreviewUid ?? '';
  if (!uid) return;

  const db = getDb();
  if (isFirestoreReady() && db) {
    try {
      await waitForPendingWrites(db);
    } catch (e) {
      console.warn('[Firestore] waitForPendingWrites after reconnect:', e);
    }
  }

  invalidateQueriesAfterFirestoreReconnect(queryClient, uid);
}
