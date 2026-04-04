import type { Href } from 'expo-router';

/** Tools that scope data to budget projects — deep links from the project hub. */
export const PROJECT_HUB_SHORTCUTS: { title: string; href: Href; icon: string }[] = [
  { title: 'Budget', href: '/(app)/tools/budget-tracker', icon: 'wallet-outline' },
  { title: 'Tasks', href: '/(app)/tools/task-manager', icon: 'checkbox-outline' },
  { title: 'Milestones', href: '/(app)/tools/milestone-tracker', icon: 'flag-outline' },
  { title: 'Gantt', href: '/(app)/tools/gantt', icon: 'calendar-outline' },
  { title: 'CPM', href: '/(app)/tools/cpm', icon: 'git-branch-outline' },
  { title: 'Resources', href: '/(app)/tools/resource-scheduler', icon: 'people-outline' },
  { title: 'Site log', href: '/(app)/tools/daily-site-log', icon: 'clipboard-outline' },
  { title: 'Punch list', href: '/(app)/tools/punch-list', icon: 'list-circle-outline' },
  { title: 'RFIs', href: '/(app)/tools/rfi-tracker', icon: 'chatbubbles-outline' },
  { title: 'Permits', href: '/(app)/tools/permit-manager', icon: 'document-text-outline' },
  { title: 'Incidents', href: '/(app)/tools/incident-report', icon: 'medkit-outline' },
  { title: 'PPE', href: '/(app)/tools/ppe-tracker', icon: 'shirt-outline' },
  { title: 'Progress', href: '/(app)/tools/progress-report', icon: 'newspaper-outline' },
  { title: 'Contracts', href: '/(app)/tools/contract-builder', icon: 'document-attach-outline' },
  { title: 'Drone photos', href: '/(app)/tools/drone-report', icon: 'airplane-outline' },
  { title: 'BIM links', href: '/(app)/tools/bim-viewer', icon: 'apps-outline' },
  { title: 'Analytics', href: '/(app)/tools/analytics-dashboard', icon: 'pie-chart-outline' },
];
