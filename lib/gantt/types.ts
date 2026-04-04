export interface GanttBar {
  id: string;
  name: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD inclusive */
  endDate: string;
  /** Optional dependency / link notes (no auto scheduling) */
  notes: string;
}
