export type RfiStatus = 'open' | 'pending_response' | 'answered' | 'closed';

export interface RfiItem {
  id: string;
  /** e.g. RFI-001 */
  rfiNumber: string;
  subject: string;
  /** YYYY-MM-DD */
  dateRaised: string;
  /** YYYY-MM-DD */
  dueDate: string;
  status: RfiStatus;
  question: string;
  response: string;
  /** Recipient / discipline */
  toParty: string;
}

export const RFI_STATUS_LABELS: Record<RfiStatus, string> = {
  open: 'Open',
  pending_response: 'Pending response',
  answered: 'Answered',
  closed: 'Closed',
};

export const RFI_STATUSES: RfiStatus[] = ['open', 'pending_response', 'answered', 'closed'];
