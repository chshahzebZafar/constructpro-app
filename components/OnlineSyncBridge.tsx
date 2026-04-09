import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { computeOnline } from '@/lib/network/connectivity';
import { refreshAfterReconnect } from '@/lib/firebase/offlineSync';

/**
 * When the device goes from offline → online, flush Firestore’s pending write queue (await
 * acknowledgements) and invalidate lists so screens refetch.
 *
 * `lastOnline` starts `null` so we never treat “unknown → online” as a reconnect (avoids a burst
 * of invalidations on cold start). After the first NetInfo event, false→true reliably means
 * the user just regained connectivity.
 */
export function OnlineSyncBridge() {
  const queryClient = useQueryClient();
  const lastOnlineRef = useRef<boolean | null>(null);

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      const online = computeOnline(state);
      const prev = lastOnlineRef.current;
      lastOnlineRef.current = online;
      if (prev === false && online) {
        void refreshAfterReconnect(queryClient);
      }
    });

    void NetInfo.fetch().then((s) => {
      if (lastOnlineRef.current === null) {
        lastOnlineRef.current = computeOnline(s);
      }
    });

    return () => sub();
  }, [queryClient]);

  return null;
}
