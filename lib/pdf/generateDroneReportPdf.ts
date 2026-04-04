import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { DroneReportEntry } from '../droneReport/types';

export async function exportDroneReportPdf(entry: DroneReportEntry, projectName: string): Promise<void> {
  const loc = entry.locationNotes.trim()
    ? `<p><strong>Location / geo notes</strong><br/>${escapeHtml(entry.locationNotes)}</p>`
    : '';
  const desc = entry.description.trim()
    ? `<p style="white-space: pre-wrap;"><strong>Description</strong><br/>${escapeHtml(entry.description)}</p>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: Arial, sans-serif; padding: 40px; color: #111827;">
  <h1 style="color: #1B3A5C;">Site photo report</h1>
  <p style="color: #374151;">Project: ${escapeHtml(projectName)}</p>
  <p style="color: #374151;">Report date: ${escapeHtml(entry.reportDate)}</p>
  <p style="color: #6B7280; font-size: 12px;">Recorded: ${new Date(entry.createdAt).toLocaleString()}</p>
  <hr style="border: none; border-top: 1px solid #D1D5DB; margin: 20px 0;" />
  <p><strong>${escapeHtml(entry.title || 'Untitled')}</strong></p>
  ${loc}
  ${desc}
  <p style="margin-top: 24px; color: #6B7280; font-size: 11px;">Images are stored in the app and are not embedded in this PDF.</p>
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
