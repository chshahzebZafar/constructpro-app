export interface TaskRow {
  id: string;
  title: string;
  done: boolean;
  /** optional ISO date */
  dueDate: string;
  order: number;
}
