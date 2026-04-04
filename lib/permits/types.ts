export type PermitStatus = 'pending' | 'submitted' | 'active' | 'expired';

export interface PermitItem {
  id: string;
  /** Short title, e.g. "Hot work", "Excavation" */
  name: string;
  /** Issuing authority / council */
  authority: string;
  /** Permit / reference number */
  reference: string;
  /** YYYY-MM-DD */
  issuedDate: string;
  /** YYYY-MM-DD */
  expiryDate: string;
  status: PermitStatus;
  notes: string;
}

export const PERMIT_STATUS_LABELS: Record<PermitStatus, string> = {
  pending: 'Pending',
  submitted: 'Submitted',
  active: 'Active',
  expired: 'Expired',
};

export const PERMIT_STATUSES: PermitStatus[] = ['pending', 'submitted', 'active', 'expired'];
