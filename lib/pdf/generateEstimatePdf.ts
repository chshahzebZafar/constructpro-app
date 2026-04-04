import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { CostInputs } from '../formulas/cost';
import type { CostResult } from '../formulas/cost';

export async function exportCostEstimatePdf(
  inputs: CostInputs,
  result: CostResult,
  userName: string
): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
</head>
<body style="font-family: Arial, sans-serif; padding: 40px; color: #111827;">
  <h1 style="color: #1B3A5C; margin-bottom: 8px;">Cost Estimate</h1>
  <p style="margin: 4px 0; color: #374151;">Prepared by: ${escapeHtml(userName)}</p>
  <p style="margin: 4px 0; color: #374151;">Date: ${new Date().toLocaleDateString()}</p>
  <hr style="border: none; border-top: 1px solid #D1D5DB; margin: 24px 0;" />
  <h2 style="color: #1B3A5C; font-size: 18px;">Inputs</h2>
  <p style="margin: 6px 0;">Project type: ${escapeHtml(inputs.projectType)}</p>
  <p style="margin: 6px 0;">Area: ${inputs.areaSqm.toFixed(2)} m²</p>
  <p style="margin: 6px 0;">Material grade: ${escapeHtml(inputs.materialGrade)}</p>
  <p style="margin: 6px 0;">Labour: ${inputs.laborDays} days × ${inputs.laborRatePerDay.toFixed(2)}/day</p>
  <p style="margin: 6px 0;">Contingency: ${inputs.contingencyPercent}% · Tax: ${inputs.taxPercent}%</p>
  <h2 style="color: #1B3A5C; font-size: 18px; margin-top: 24px;">Results</h2>
  <table width="100%" border="1" cellpadding="10" style="border-collapse: collapse; border-color: #D1D5DB;">
    <tr><td>Material cost</td><td align="right">${formatUsd(result.materialCost)}</td></tr>
    <tr><td>Labour cost</td><td align="right">${formatUsd(result.laborCost)}</td></tr>
    <tr><td>Contingency</td><td align="right">${formatUsd(result.contingency)}</td></tr>
    <tr><td>Tax</td><td align="right">${formatUsd(result.tax)}</td></tr>
    <tr><td><strong>TOTAL</strong></td><td align="right"><strong>${formatUsd(result.total)}</strong></td></tr>
  </table>
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
