import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/useAuthStore';
import type { SavedInvoice } from './types';

const PREFIX = 'constructpro_invoices_v1_';

interface Blob {
  invoices: SavedInvoice[];
}

function uid(): string {
  const s = useAuthStore.getState();
  const u = s.user?.uid ?? s.offlinePreviewUid;
  if (!u) throw new Error('Sign in required.');
  return u;
}

function rid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

async function loadBlob(u: string): Promise<Blob> {
  const raw = await AsyncStorage.getItem(PREFIX + u);
  if (!raw) return { invoices: [] };
  try {
    const b = JSON.parse(raw) as Blob;
    return Array.isArray(b.invoices) ? b : { invoices: [] };
  } catch {
    return { invoices: [] };
  }
}

async function saveBlob(u: string, b: Blob): Promise<void> {
  await AsyncStorage.setItem(PREFIX + u, JSON.stringify(b));
}

export async function listSavedInvoices(): Promise<SavedInvoice[]> {
  const u = uid();
  const b = await loadBlob(u);
  return [...b.invoices].sort((a, b) => b.createdAt - a.createdAt);
}

export type InvoiceSaveInput = Omit<SavedInvoice, 'id' | 'createdAt'> & { id?: string };

export async function saveInvoiceToHistory(data: InvoiceSaveInput): Promise<SavedInvoice> {
  const u = uid();
  const blob = await loadBlob(u);
  if (data.id) {
    const i = blob.invoices.findIndex((x) => x.id === data.id);
    if (i >= 0) {
      const saved: SavedInvoice = {
        ...blob.invoices[i],
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        invoiceNumber: data.invoiceNumber,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        lines: data.lines,
        taxPercent: data.taxPercent,
        notes: data.notes,
        id: data.id,
        createdAt: blob.invoices[i].createdAt,
      };
      blob.invoices[i] = saved;
      await saveBlob(u, blob);
      return saved;
    }
  }
  const newInv: SavedInvoice = {
    id: rid(),
    createdAt: Date.now(),
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    invoiceNumber: data.invoiceNumber,
    issueDate: data.issueDate,
    dueDate: data.dueDate,
    lines: data.lines,
    taxPercent: data.taxPercent,
    notes: data.notes,
  };
  blob.invoices.unshift(newInv);
  await saveBlob(u, blob);
  return newInv;
}

export async function deleteSavedInvoice(id: string): Promise<void> {
  const u = uid();
  const blob = await loadBlob(u);
  blob.invoices = blob.invoices.filter((x) => x.id !== id);
  await saveBlob(u, blob);
}
