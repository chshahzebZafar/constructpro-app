import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/store/useAuthStore';
import { exportInvoicePdf } from '@/lib/pdf/generateInvoicePdf';
import type { InvoiceLine } from '@/lib/invoices/types';
import { computeInvoiceTotals } from '@/lib/invoices/types';
import {
  deleteSavedInvoice,
  listSavedInvoices,
  saveInvoiceToHistory,
} from '@/lib/invoices/repository';
import type { SavedInvoice } from '@/lib/invoices/types';

function rid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

interface LineDraft {
  id: string;
  description: string;
  qty: string;
  unitPrice: string;
}

function parseLines(drafts: LineDraft[]): InvoiceLine[] {
  return drafts.map((d) => ({
    id: d.id,
    description: d.description.trim(),
    quantity: Math.max(0, parseFloat(d.qty.replace(/,/g, '')) || 0),
    unitPrice: Math.max(0, parseFloat(d.unitPrice.replace(/,/g, '')) || 0),
  }));
}

export default function InvoiceGeneratorScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');
  const companyName = useAuthStore((s) => s.companyName || 'Your company');

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taxPercent, setTaxPercent] = useState('0');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([{ id: rid(), description: '', qty: '1', unitPrice: '0' }]);
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);
  const [pdfBusy, setPdfBusy] = useState(false);

  const savedQuery = useQuery({
    queryKey: ['invoices-saved', uid],
    queryFn: listSavedInvoices,
    enabled: Boolean(uid),
  });

  useEffect(() => {
    const t = new Date();
    const iso = t.toISOString().slice(0, 10);
    setIssueDate(iso);
    const due = new Date(t);
    due.setDate(due.getDate() + 30);
    setDueDate(due.toISOString().slice(0, 10));
    setInvoiceNumber(`INV-${iso.replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`);
  }, []);

  const numericLines = useMemo(() => parseLines(lines), [lines]);
  const tax = parseFloat(taxPercent.replace(/,/g, '')) || 0;
  const totals = useMemo(() => computeInvoiceTotals(numericLines, tax), [numericLines, tax]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['invoices-saved', uid] });
  }, [queryClient, uid]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!clientName.trim()) throw new Error('Enter client name.');
      const pl = parseLines(lines).filter((l) => l.description.length > 0);
      if (pl.length === 0) throw new Error('Add at least one line with a description.');
      return saveInvoiceToHistory({
        id: currentId,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        invoiceNumber: invoiceNumber.trim() || '—',
        issueDate: issueDate.trim(),
        dueDate: dueDate.trim(),
        lines: pl,
        taxPercent: tax,
        notes: notes.trim(),
      });
    },
    onSuccess: (saved) => {
      setCurrentId(saved.id);
      invalidate();
      Alert.alert('Saved', 'Invoice saved to history on this device.');
    },
    onError: (e) => Alert.alert('Could not save', e instanceof Error ? e.message : 'Error'),
  });

  const runPdf = async () => {
    if (!clientName.trim()) {
      Alert.alert('Client', 'Enter client name.');
      return;
    }
    const pl = parseLines(lines).filter((l) => l.description.length > 0);
    if (pl.length === 0) {
      Alert.alert('Lines', 'Add at least one line item with a description.');
      return;
    }
    setPdfBusy(true);
    try {
      await exportInvoicePdf({
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        invoiceNumber: invoiceNumber.trim() || '—',
        issueDate: issueDate.trim(),
        dueDate: dueDate.trim(),
        lines: pl,
        taxPercent: tax,
        notes: notes.trim(),
        issuerName: companyName,
      });
    } finally {
      setPdfBusy(false);
    }
  };

  const loadInvoice = (inv: SavedInvoice) => {
    setCurrentId(inv.id);
    setClientName(inv.clientName);
    setClientEmail(inv.clientEmail);
    setInvoiceNumber(inv.invoiceNumber);
    setIssueDate(inv.issueDate);
    setDueDate(inv.dueDate);
    setTaxPercent(String(inv.taxPercent));
    setNotes(inv.notes);
    setLines(
      inv.lines.map((l) => ({
        id: l.id,
        description: l.description,
        qty: String(l.quantity),
        unitPrice: String(l.unitPrice),
      }))
    );
  };

  const newInvoice = () => {
    setCurrentId(undefined);
    setClientName('');
    setClientEmail('');
    const t = new Date();
    const iso = t.toISOString().slice(0, 10);
    setIssueDate(iso);
    const due = new Date(t);
    due.setDate(due.getDate() + 30);
    setDueDate(due.toISOString().slice(0, 10));
    setInvoiceNumber(`INV-${iso.replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`);
    setTaxPercent('0');
    setNotes('');
    setLines([{ id: rid(), description: '', qty: '1', unitPrice: '0' }]);
  };

  const addLine = () => {
    setLines((prev) => [...prev, { id: rid(), description: '', qty: '1', unitPrice: '0' }]);
  };

  const removeLine = (id: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));
  };

  const updateLine = (id: string, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  if (!uid) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
        <ScreenHeader title="Invoice generator" level="Basic" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            Sign in to save invoices on this device.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="Invoice generator" level="Basic" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 200, paddingHorizontal: 20, paddingTop: 12 }}
        >
          <Text className="mb-2 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            Issuer (from profile): {companyName}
          </Text>
          {savedQuery.data && savedQuery.data.length > 0 ? (
            <View className="mb-4">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-sm text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
                  Saved on device
                </Text>
                <Pressable onPress={newInvoice}>
                  <Text className="text-sm text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>
                    New invoice
                  </Text>
                </Pressable>
              </View>
              <FlatList
                horizontal
                data={savedQuery.data}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View className="mr-2 flex-row items-center rounded-xl border border-neutral-200 bg-white px-3 py-2">
                    <Pressable onPress={() => loadInvoice(item)}>
                      <Text className="text-xs text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                        {item.invoiceNumber} · {item.issueDate}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        Alert.alert('Delete saved invoice?', 'This cannot be undone.', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => {
                              void deleteSavedInvoice(item.id).then(invalidate);
                              if (currentId === item.id) newInvoice();
                            },
                          },
                        ])
                      }
                      className="ml-2 p-1"
                    >
                      <Ionicons name="close-circle" size={18} color={Colors.neutral[500]} />
                    </Pressable>
                  </View>
                )}
              />
            </View>
          ) : (
            <Pressable onPress={newInvoice} className="mb-4 self-start">
              <Text className="text-sm text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>
                Clear form (new invoice)
              </Text>
            </Pressable>
          )}

          <View className="mb-3 rounded-2xl border border-neutral-200 bg-white p-4">
            <Text className="mb-2 text-sm text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
              Client
            </Text>
            <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
              Name
            </Text>
            <TextInput
              value={clientName}
              onChangeText={setClientName}
              className="mb-3 rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
            />
            <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
              Email (optional)
            </Text>
            <TextInput
              value={clientEmail}
              onChangeText={setClientEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              className="rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
            />
          </View>

          <View className="mb-3 rounded-2xl border border-neutral-200 bg-white p-4">
            <Text className="mb-2 text-sm text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
              Invoice details
            </Text>
            {[
              ['Invoice #', invoiceNumber, setInvoiceNumber],
              ['Issue date', issueDate, setIssueDate],
              ['Due date', dueDate, setDueDate],
              ['Tax %', taxPercent, setTaxPercent],
            ].map(([label, val, set]) => (
              <View key={String(label)} className="mb-3">
                <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                  {label as string}
                </Text>
                <TextInput
                  value={val as string}
                  onChangeText={set as (t: string) => void}
                  keyboardType={label === 'Tax %' ? 'decimal-pad' : 'default'}
                  className="rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                  style={{ fontFamily: 'Inter_400Regular' }}
                />
              </View>
            ))}
          </View>

          <View className="mb-3 rounded-2xl border border-neutral-200 bg-white p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-sm text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
                Line items
              </Text>
              <Pressable onPress={addLine} className="rounded-lg bg-brand-100 px-3 py-1">
                <Text className="text-xs text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                  + Line
                </Text>
              </Pressable>
            </View>
            {lines.map((line) => (
              <View key={line.id} className="mb-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3">
                <View className="mb-2 flex-row items-start justify-between">
                  <Text className="text-xs text-neutral-500" style={{ fontFamily: 'Inter_500Medium' }}>
                    Item
                  </Text>
                  {lines.length > 1 ? (
                    <Pressable onPress={() => removeLine(line.id)}>
                      <Ionicons name="trash-outline" size={18} color={Colors.neutral[500]} />
                    </Pressable>
                  ) : null}
                </View>
                <TextInput
                  value={line.description}
                  onChangeText={(t) => updateLine(line.id, { description: t })}
                  placeholder="Description"
                  className="mb-2 rounded-lg border border-neutral-300 bg-white px-2 py-2 text-neutral-900"
                  style={{ fontFamily: 'Inter_400Regular' }}
                />
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                      Qty
                    </Text>
                    <TextInput
                      value={line.qty}
                      onChangeText={(t) => updateLine(line.id, { qty: t })}
                      keyboardType="decimal-pad"
                      className="rounded-lg border border-neutral-300 bg-white px-2 py-2 text-neutral-900"
                      style={{ fontFamily: 'Inter_400Regular' }}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                      Unit price
                    </Text>
                    <TextInput
                      value={line.unitPrice}
                      onChangeText={(t) => updateLine(line.id, { unitPrice: t })}
                      keyboardType="decimal-pad"
                      className="rounded-lg border border-neutral-300 bg-white px-2 py-2 text-neutral-900"
                      style={{ fontFamily: 'Inter_400Regular' }}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View className="mb-3 rounded-2xl border border-neutral-200 bg-white p-4">
            <Text className="text-sm text-neutral-700" style={{ fontFamily: 'Inter_400Regular' }}>
              Subtotal {fmt(totals.subtotal)}
            </Text>
            <Text className="text-sm text-neutral-700" style={{ fontFamily: 'Inter_400Regular' }}>
              Tax ({tax}%) {fmt(totals.tax)}
            </Text>
            <Text className="mt-1 text-lg text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
              Total {fmt(totals.total)}
            </Text>
          </View>

          <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            Notes (optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            className="mb-4 min-h-[72px] rounded-xl border border-neutral-300 bg-white px-3 py-2 text-neutral-900"
            style={{ fontFamily: 'Inter_400Regular' }}
          />
        </ScrollView>

        <View
          className="border-t border-neutral-200 bg-white px-5 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <Button title="Generate PDF & share" loading={pdfBusy} onPress={() => void runPdf()} />
          <View className="h-2" />
          <Button
            title="Save to history"
            variant="secondary"
            loading={saveMut.isPending}
            onPress={() => saveMut.mutate()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
