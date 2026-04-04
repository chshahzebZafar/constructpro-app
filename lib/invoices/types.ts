export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface SavedInvoice {
  id: string;
  createdAt: number;
  clientName: string;
  clientEmail: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  lines: InvoiceLine[];
  taxPercent: number;
  notes: string;
}

export interface InvoiceTotals {
  subtotal: number;
  tax: number;
  total: number;
}

export function computeInvoiceTotals(
  lines: Pick<InvoiceLine, 'quantity' | 'unitPrice'>[],
  taxPercent: number
): InvoiceTotals {
  const subtotal = lines.reduce((s, l) => s + Math.max(0, l.quantity) * Math.max(0, l.unitPrice), 0);
  const tax = subtotal * (Math.max(0, taxPercent) / 100);
  return { subtotal, tax, total: subtotal + tax };
}
