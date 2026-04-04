export interface BimLink {
  id: string;
  createdAt: number;
  title: string;
  /** https URL to viewer or model portal */
  url: string;
  notes: string;
}
