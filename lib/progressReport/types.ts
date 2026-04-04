export interface ProgressReportEntry {
  id: string;
  createdAt: number;
  /** YYYY-MM-DD */
  periodStart: string;
  /** YYYY-MM-DD */
  periodEnd: string;
  title: string;
  summary: string;
  workCompleted: string;
  milestones: string;
  nextSteps: string;
  issuesRisks: string;
  preparedBy: string;
  /** Local file URIs */
  photoUrls: string[];
}

export const MAX_PROGRESS_PHOTOS = 8;
