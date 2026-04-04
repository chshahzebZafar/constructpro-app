import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { INCIDENT_CATEGORY_LABELS, type IncidentReport } from '../incidents/types';

export async function exportIncidentReportPdf(report: IncidentReport, projectName: string): Promise<void> {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, sans-serif; padding: 40px; color: #111827;">
  <h1 style="color: #1B3A5C;">Incident report</h1>
  <p style="color: #374151;">Project: ${escapeHtml(projectName)}</p>
  <p style="color: #374151;">Recorded: ${new Date(report.createdAt).toLocaleString()}</p>
  <hr style="border: none; border-top: 1px solid #D1D5DB; margin: 20px 0;" />
  <p><strong>Title</strong><br/>${escapeHtml(report.title)}</p>
  <p><strong>Site / location</strong><br/>${escapeHtml(report.siteLocation)}</p>
  <p><strong>Date</strong> ${escapeHtml(report.dateOccurred)} ${report.timeOccurred ? `· <strong>Time</strong> ${escapeHtml(report.timeOccurred)}` : ''}</p>
  <p><strong>Category</strong> ${escapeHtml(INCIDENT_CATEGORY_LABELS[report.category] ?? String(report.category))}</p>
  <p><strong>Reported by</strong> ${escapeHtml(report.reportedBy)}</p>
  <p style="white-space: pre-wrap;"><strong>Description</strong><br/>${escapeHtml(report.description)}</p>
  <p style="white-space: pre-wrap;"><strong>Immediate actions</strong><br/>${escapeHtml(report.immediateActions)}</p>
  ${report.witnesses.trim() ? `<p style="white-space: pre-wrap;"><strong>Witnesses</strong><br/>${escapeHtml(report.witnesses)}</p>` : ''}
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
