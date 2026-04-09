import type { QueryClient } from '@tanstack/react-query';

/**
 * Shared list + Home dashboard + cached analytics that aggregate project/task/budget/permit data.
 * Invalidate after any project CRUD or tool mutations that affect those aggregates so tab UIs stay in sync
 * without a manual refresh (tabs often keep screens mounted).
 */
export function invalidateSharedProjectQueries(queryClient: QueryClient, uid: string) {
  void queryClient.invalidateQueries({ queryKey: ['budget-projects', uid] });
  void queryClient.invalidateQueries({ queryKey: ['home-dashboard', uid] });
  void queryClient.invalidateQueries({ queryKey: ['project-hub-analytics', uid] });
  void queryClient.invalidateQueries({ queryKey: ['analytics-dashboard', uid] });
}

/** Query key prefixes for screens backed by Firestore tool snapshots / user snapshots (see `app/(app)/tools/*.tsx`). */
const RECONNECT_INVALIDATION_PREFIXES = [
  'quick-notes',
  'tasks',
  'permits',
  'punch-items',
  'budget-lines',
  'gantt',
  'cpm',
  'rfi',
  'ppe',
  'progress-report',
  'drone-report',
  'contract-builder',
  'resource-scheduler',
  'daily-site-log',
  'incidents',
  'milestones',
  'bim-viewer',
  'invoices-saved',
] as const;

/**
 * Full cache refresh after regaining connectivity: shared aggregates + every project-scoped tool list
 * so mounted tool screens don’t show pre-offline data after `waitForPendingWrites`.
 */
export function invalidateQueriesAfterFirestoreReconnect(queryClient: QueryClient, uid: string) {
  invalidateSharedProjectQueries(queryClient, uid);
  for (const key of RECONNECT_INVALIDATION_PREFIXES) {
    void queryClient.invalidateQueries({ queryKey: [key, uid] });
  }
  void queryClient.invalidateQueries({ queryKey: ['home-weather'] });
}
