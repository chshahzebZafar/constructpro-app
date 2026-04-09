import NetInfo from '@react-native-community/netinfo';
import type { NetInfoState } from '@react-native-community/netinfo';

/**
 * Tracks device connectivity. Firestore write promises do not resolve while offline;
 * we use this to skip awaiting those mutations and to prefer cache reads.
 */
let online = true;

/** Exported for reconnect handlers (must match `getIsOnline()`). */
export function computeOnline(state: NetInfoState): boolean {
  if (state.isConnected !== true) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

NetInfo.addEventListener((state) => {
  online = computeOnline(state);
});

void NetInfo.fetch().then((state) => {
  online = computeOnline(state);
});

export function getIsOnline(): boolean {
  return online;
}
