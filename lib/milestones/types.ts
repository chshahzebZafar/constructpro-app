export interface Milestone {
  id: string;
  title: string;
  /** ISO date YYYY-MM-DD */
  plannedDate: string;
  /** optional forecast if slipped */
  forecastDate: string;
  /** ISO when done */
  actualDate: string;
}
