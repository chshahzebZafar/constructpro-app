import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import type { NetInfoState } from '@react-native-community/netinfo';

function computeOnline(state: NetInfoState): boolean {
  if (state.isConnected !== true) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

/**
 * Subscribes to NetInfo so UI (e.g. offline banner) re-renders when connectivity changes.
 * Matches `getIsOnline()` in `@/lib/network/connectivity` after the first fetch.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(computeOnline(state));
    });
    void NetInfo.fetch().then((s) => setIsOnline(computeOnline(s)));
    return unsub;
  }, []);

  return { isOnline, isOffline: !isOnline };
}
