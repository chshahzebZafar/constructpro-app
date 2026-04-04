import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { CONTRACT_TEMPLATE_LABELS, type ContractDraft, type ContractTemplateId } from '../contractBuilder/types';

export async function exportContractPdf(draft: ContractDraft, budgetProjectName: string): Promise<void> {
  const html = buildContractHtml(draft, budgetProjectName);
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  }
}

function buildContractHtml(draft: ContractDraft, budgetProjectName: string): string {
  const title = CONTRACT_TEMPLATE_LABELS[draft.templateId] ?? 'Construction agreement';
  const body = sectionForTemplate(draft.templateId, draft);
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Georgia, serif; padding: 36px; color: #111827; line-height: 1.45; font-size: 11pt;">
  <p style="font-size: 9pt; color: #6B7280;">Indicative template only — not legal advice. Review with qualified counsel.</p>
  <h1 style="color: #1B3A5C; font-size: 18pt; margin-bottom: 4px;">${escapeHtml(title)}</h1>
  <p style="margin: 4px 0; color: #374151;"><strong>Workspace project:</strong> ${escapeHtml(budgetProjectName)}</p>
  <p style="margin: 4px 0; color: #374151;"><strong>Agreement title:</strong> ${escapeHtml(draft.projectTitle || '—')}</p>
  <p style="margin: 4px 0; color: #374151;"><strong>Effective date:</strong> ${escapeHtml(draft.effectiveDate || '—')}</p>
  <hr style="border: none; border-top: 1px solid #D1D5DB; margin: 18px 0;" />
  ${body}
  <hr style="border: none; border-top: 1px solid #D1D5DB; margin: 24px 0;" />
  <p style="margin-top: 28px;"><strong>Signatures</strong></p>
  <p style="margin-top: 32px;">Client / Owner: ___________________________ &nbsp; Date: __________</p>
  <p style="margin-top: 24px;">Contractor: ___________________________ &nbsp; Date: __________</p>
</body>
</html>`;
}

function sectionForTemplate(id: ContractTemplateId, d: ContractDraft): string {
  const parties = `
  <h2 style="font-size: 13pt;">Parties</h2>
  <p><strong>Client / Owner:</strong> ${escapeHtml(d.partyClientName || '—')}</p>
  <p><strong>Contractor:</strong> ${escapeHtml(d.partyContractorName || '—')}</p>
  <p><strong>Site / project:</strong> ${escapeHtml(d.siteAddress || '—')}</p>`;

  const scope = `
  <h2 style="font-size: 13pt; margin-top: 18px;">Scope of work</h2>
  <p style="white-space: pre-wrap;">${escapeHtml(d.scopeOfWork || '—')}</p>`;

  const priceFixed = `
  <h2 style="font-size: 13pt; margin-top: 18px;">Contract price</h2>
  <p>The total fixed price for the Work, subject to approved change orders, is: <strong>${escapeHtml(d.contractPrice || '—')}</strong>.</p>`;

  const priceTm = `
  <h2 style="font-size: 13pt; margin-top: 18px;">Compensation (time &amp; materials)</h2>
  <p>Work shall be performed on a time-and-materials basis as follows: ${escapeHtml(d.contractPrice || '—')}</p>
  ${
    d.notToExceed.trim()
      ? `<p><strong>Not-to-exceed:</strong> ${escapeHtml(d.notToExceed)} unless modified in writing.</p>`
      : ''
  }`;

  const priceSub = `
  <h2 style="font-size: 13pt; margin-top: 18px;">Subcontract price</h2>
  <p>Subcontract amount and basis: <strong>${escapeHtml(d.contractPrice || '—')}</strong></p>
  ${
    d.primeContractRef.trim()
      ? `<p><strong>Prime contract reference:</strong> ${escapeHtml(d.primeContractRef)}</p>`
      : ''
  }
  <p>The Subcontractor agrees to perform its portion of the Work consistent with the prime agreement where applicable.</p>`;

  const pay = `
  <h2 style="font-size: 13pt; margin-top: 18px;">Payment terms</h2>
  <p style="white-space: pre-wrap;">${escapeHtml(d.paymentTerms || '—')}</p>`;

  const sched = `
  <h2 style="font-size: 13pt; margin-top: 18px;">Schedule</h2>
  <p style="white-space: pre-wrap;">${escapeHtml(d.scheduleCompletion || '—')}</p>`;

  const changes = `
  <h2 style="font-size: 13pt; margin-top: 18px;">Change orders</h2>
  <p style="white-space: pre-wrap;">${escapeHtml(d.changeOrderPolicy.trim() || 'Changes to scope, price, or schedule require written agreement signed by both parties.')}</p>`;

  const warranty = d.warrantyNotes.trim()
    ? `<h2 style="font-size: 13pt; margin-top: 18px;">Warranty / defects</h2><p style="white-space: pre-wrap;">${escapeHtml(d.warrantyNotes)}</p>`
    : '';

  const extra = d.additionalTerms.trim()
    ? `<h2 style="font-size: 13pt; margin-top: 18px;">Additional terms</h2><p style="white-space: pre-wrap;">${escapeHtml(d.additionalTerms)}</p>`
    : '';

  const commonEnd = `
  <h2 style="font-size: 13pt; margin-top: 18px;">General</h2>
  <p>This draft is generated for discussion and documentation. Governing law, insurance, indemnity, lien waivers, and dispute resolution should be completed to match your jurisdiction and risk profile.</p>`;

  if (id === 'fixed_price') {
    return parties + scope + priceFixed + pay + sched + changes + warranty + extra + commonEnd;
  }
  if (id === 'time_and_materials') {
    return parties + scope + priceTm + pay + sched + changes + warranty + extra + commonEnd;
  }
  return parties + scope + priceSub + pay + sched + changes + warranty + extra + commonEnd;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
