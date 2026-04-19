import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export async function exportSiteReportPdf(html: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Site Inspection Report' });
  }
}
