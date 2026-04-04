/** High-level agreement structure for PDF boilerplate. */
export type ContractTemplateId = 'fixed_price' | 'time_and_materials' | 'subcontract';

export interface ContractDraft {
  id: string;
  createdAt: number;
  templateId: ContractTemplateId;
  /** YYYY-MM-DD */
  effectiveDate: string;
  partyClientName: string;
  partyContractorName: string;
  projectTitle: string;
  siteAddress: string;
  scopeOfWork: string;
  /** Total price, NTE, or fee basis — free text */
  contractPrice: string;
  paymentTerms: string;
  scheduleCompletion: string;
  /** For T&M template: not-to-exceed cap */
  notToExceed: string;
  /** For subcontract: reference to prime agreement */
  primeContractRef: string;
  changeOrderPolicy: string;
  warrantyNotes: string;
  additionalTerms: string;
}

export const CONTRACT_TEMPLATE_LABELS: Record<ContractTemplateId, string> = {
  fixed_price: 'Fixed price (lump sum)',
  time_and_materials: 'Time & materials (+ NTE)',
  subcontract: 'Subcontract',
};

export const CONTRACT_TEMPLATE_IDS: ContractTemplateId[] = [
  'fixed_price',
  'time_and_materials',
  'subcontract',
];
