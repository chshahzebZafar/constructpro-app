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
