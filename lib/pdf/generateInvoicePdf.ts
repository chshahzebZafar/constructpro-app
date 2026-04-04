import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { InvoiceLine } from '../invoices/types';
import { computeInvoiceTotals } from '../invoices/types';

export interface InvoicePdfPayload {
  clientName: string;
  clientEmail: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  lines: InvoiceLine[];
  taxPercent: number;
  notes: string;
  issuerName: string;
}

export async function exportInvoicePdf(payload: InvoicePdfPayload): Promise<void> {
  const { subtotal, tax, total } = computeInvoiceTotals(payload.lines, payload.taxPercent);
  const rows = payload.lines
    .map(
      (l) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${escapeHtml(l.description)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E5E7EB; text-align: right;">${l.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E5E7EB; text-align: right;">${formatUsd(l.unitPrice)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #E5E7EB; text-align: right;">${formatUsd(l.quantity * l.unitPrice)}</td>
    </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, sans-serif; padding: 40px; color: #111827;">
  <h1 style="color: #1B3A5C; margin-bottom: 4px;">Invoice</h1>
  <p style="margin: 4px 0; color: #374151;">No. ${escapeHtml(payload.invoiceNumber)}</p>
  <p style="margin: 4px 0; color: #374151;">Issue: ${escapeHtml(payload.issueDate)} · Due: ${escapeHtml(payload.dueDate)}</p>
  <hr style="border: none; border-top: 1px solid #D1D5DB; margin: 20px 0;" />
  <p style="margin: 4px 0;"><strong>From:</strong> ${escapeHtml(payload.issuerName)}</p>
  <p style="margin: 4px 0;"><strong>Bill to:</strong> ${escapeHtml(payload.clientName)}</p>
  ${payload.clientEmail ? `<p style="margin: 4px 0; color: #374151;">${escapeHtml(payload.clientEmail)}</p>` : ''}
  <table width="100%" style="border-collapse: collapse; margin-top: 24px;">
    <thead>
      <tr style="background: #F3F4F6;">
        <th align="left" style="padding: 8px;">Description</th>
        <th align="right" style="padding: 8px;">Qty</th>
        <th align="right" style="padding: 8px;">Unit</th>
        <th align="right" style="padding: 8px;">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <table width="100%" style="margin-top: 16px; max-width: 320px; margin-left: auto;">
    <tr><td>Subtotal</td><td align="right">${formatUsd(subtotal)}</td></tr>
    <tr><td>Tax (${payload.taxPercent}%)</td><td align="right">${formatUsd(tax)}</td></tr>
    <tr><td><strong>Total</strong></td><td align="right"><strong>${formatUsd(total)}</strong></td></tr>
  </table>
  ${payload.notes.trim() ? `<p style="margin-top: 24px; white-space: pre-wrap;"><strong>Notes</strong><br/>${escapeHtml(payload.notes)}</p>` : ''}
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}
