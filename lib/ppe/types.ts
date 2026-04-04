export interface PpeItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  /** ISO date */
  issuedDate: string;
  /** ISO or empty */
  expiryDate: string;
  notes: string;
}
