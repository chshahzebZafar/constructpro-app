export type PunchStatus = 'open' | 'in_progress' | 'done' | 'verified';

export interface PunchItem {
  id: string;
  title: string;
  detail: string;
  status: PunchStatus;
  assignee: string;
  /** Display URLs (download URLs or file:// locally) */
  photoUrls: string[];
  /** Storage object paths (cloud only; used to delete files) */
  photoPaths: string[];
  order: number;
  createdAt: number;
}

export interface PunchItemInput {
  title: string;
  detail: string;
  status: PunchStatus;
  assignee: string;
}

export const PUNCH_STATUS_LABELS: Record<PunchStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  done: 'Done',
  verified: 'Verified',
};

export const PUNCH_STATUSES: PunchStatus[] = ['open', 'in_progress', 'done', 'verified'];
