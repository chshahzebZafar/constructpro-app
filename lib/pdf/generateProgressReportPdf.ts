import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { ProgressReportEntry } from '../progressReport/types';

export async function exportProgressReportPdf(report: ProgressReportEntry, projectName: string): Promise<void> {
  const period = `${escapeHtml(report.periodStart)} → ${escapeHtml(report.periodEnd)}`;
  const block = (label: string, body: string) =>
    body.trim()
      ? `<p style="white-space: pre-wrap;"><strong>${escapeHtml(label)}</strong><br/>${escapeHtml(body)}</p>`
      : '';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, sans-serif; padding: 40px; color: #111827;">
  <h1 style="color: #1B3A5C;">Progress report</h1>
  <p style="color: #374151;">Project: ${escapeHtml(projectName)}</p>
  <p style="color: #374151;">Period: ${period}</p>
  <p style="color: #374151;">Prepared: ${escapeHtml(report.preparedBy || '—')}</p>
  <p style="color: #6B7280; font-size: 12px;">Generated: ${new Date(report.createdAt).toLocaleString()}</p>
  <hr style="border: none; border-top: 1px solid #D1D5DB; margin: 20px 0;" />
  <p><strong>${escapeHtml(report.title || 'Report')}</strong></p>
  ${block('Summary', report.summary)}
  ${block('Work completed', report.workCompleted)}
  ${block('Milestones / schedule', report.milestones)}
  ${block('Next period plan', report.nextSteps)}
  ${block('Issues & risks', report.issuesRisks)}
  <p style="margin-top: 24px; color: #6B7280; font-size: 11px;">Photos attached in the app are not embedded in this PDF.</p>
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
