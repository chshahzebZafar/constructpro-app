import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Share,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import {
  listReports,
  createReport,
  deleteReport,
  getReport,
  addStep,
  updateStep,
  deleteStep,
  addStepImage,
  deleteStepImage,
  generateShareLink,
  revokeShareLink,
  updateReport,
  fetchReportHtml,
  type SiteReport,
  type ReportStep,
  type StepStatus,
  type StepImage,
  type ChecklistItem,
} from '@/lib/siteReport/api';
import { exportSiteReportPdf } from '@/lib/pdf/generateSiteReportPdf';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<StepStatus, { label: string; color: string; bg: string; icon: string }> = {
  pass:      { label: 'Pass',            color: '#16a34a', bg: '#dcfce7', icon: 'checkmark-circle' },
  fail:      { label: 'Fail',            color: '#dc2626', bg: '#fee2e2', icon: 'close-circle' },
  attention: { label: 'Needs Attention', color: '#d97706', bg: '#fef3c7', icon: 'warning' },
  pending:   { label: 'Pending',         color: '#6b7280', bg: '#f3f4f6', icon: 'ellipse-outline' },
};

// ─── Checklist templates ──────────────────────────────────────────────────────

const CHECKLIST_TEMPLATES: Record<string, string[]> = {
  'Foundation': [
    'Excavation depth verified',
    'Soil bearing capacity confirmed',
    'Rebar placement correct',
    'Formwork properly aligned',
    'Concrete mix approved',
    'Curing in progress',
  ],
  'Structure': [
    'Column alignment checked',
    'Beam connections secure',
    'Slab thickness verified',
    'Temporary bracing in place',
    'Welding inspection done',
  ],
  'MEP Rough-in': [
    'Electrical conduit routed',
    'Plumbing rough-in complete',
    'HVAC ductwork installed',
    'Insulation in place',
    'Fire suppression rough-in done',
  ],
  'Safety': [
    'PPE in use by all workers',
    'Scaffolding inspected',
    'Fire extinguisher on site',
    'First aid kit accessible',
    'Signage posted',
    'Hazardous materials stored safely',
  ],
  'Finishing': [
    'Wall plastering complete',
    'Tiling/flooring done',
    'Paint coat applied',
    'Fixtures installed',
    'Punch list items cleared',
  ],
};

function makeChecklist(labels: string[]): ChecklistItem[] {
  return labels.map((label) => ({ id: Math.random().toString(36).slice(2), label, checked: false }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GMAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '';
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

function buildMapUrl(lat: number, lng: number): string {
  if (GMAPS_KEY) {
    return (
      `https://maps.googleapis.com/maps/api/staticmap` +
      `?center=${lat},${lng}&zoom=17&size=600x200` +
      `&maptype=satellite` +
      `&markers=color:red%7C${lat},${lng}` +
      `&key=${GMAPS_KEY}`
    );
  }
  if (MAPBOX_TOKEN) {
    return (
      `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static` +
      `/pin-s+ff0000(${lng},${lat})/${lng},${lat},16,0/600x200` +
      `?access_token=${MAPBOX_TOKEN}`
    );
  }
  // Last fallback: show placeholder
  return '';
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = 'list' | 'detail';

// ─── Main component ───────────────────────────────────────────────────────────

export default function SiteInspectionReportScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [screen, setScreen] = useState<Screen>('list');
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  if (screen === 'detail' && activeReportId) {
    return (
      <ReportDetailScreen
        reportId={activeReportId}
        onBack={() => {
          setScreen('list');
          setActiveReportId(null);
          void queryClient.invalidateQueries({ queryKey: ['site-reports'] });
        }}
      />
    );
  }

  return (
    <ReportListScreen
      insets={insets}
      onOpen={(id) => { setActiveReportId(id); setScreen('detail'); }}
    />
  );
}

// ─── Report List ──────────────────────────────────────────────────────────────

function ReportListScreen({
  insets,
  onOpen,
}: {
  insets: ReturnType<typeof useSafeAreaInsets>;
  onOpen: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [newModal, setNewModal] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');

  const { data: reports = [], isLoading, refetch } = useQuery({
    queryKey: ['site-reports'],
    queryFn: listReports,
  });

  const createMutation = useMutation({
    mutationFn: () => createReport({ title: title.trim(), author: author.trim() || undefined }),
    onSuccess: (report) => {
      void queryClient.invalidateQueries({ queryKey: ['site-reports'] });
      setNewModal(false);
      setTitle('');
      setAuthor('');
      onOpen(report.id);
    },
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create report'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['site-reports'] }),
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete'),
  });

  const confirmDelete = (id: string, title: string) => {
    Alert.alert('Delete Report', `Delete "${title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top', 'left', 'right']}>
      <ScreenHeader title="AI Site Inspection Report" level="Advanced" />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => setNewModal(true)}
          style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.brand[500], backgroundColor: Colors.brand[100], paddingVertical: 14 }}
        >
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.brand[700], alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="add" size={18} color="#fff" />
          </View>
          <Text style={{ fontSize: 14, color: Colors.brand[700], fontFamily: 'Poppins_700Bold' }}>New Inspection Report</Text>
        </Pressable>

        {isLoading && (
          <ActivityIndicator size="large" color={Colors.brand[700]} className="mt-8" />
        )}

        {!isLoading && reports.length === 0 && (
          <View style={{ marginTop: 48, alignItems: 'center', gap: 10 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.brand[100], alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="camera-outline" size={34} color={Colors.brand[500]} />
            </View>
            <Text style={{ fontSize: 15, color: Colors.neutral[700], fontFamily: 'Poppins_700Bold' }}>No Reports Yet</Text>
            <Text style={{ fontSize: 13, color: Colors.neutral[500], fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 19 }}>
              Tap the button above to create{'\n'}your first inspection report.
            </Text>
          </View>
        )}

        {reports.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => onOpen(r.id)}
            style={{ marginBottom: 10, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden' }}
          >
            {/* Left accent bar */}
            <View style={{ width: 4, backgroundColor: Colors.brand[700] }} />
            {/* Icon */}
            <View style={{ width: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.brand[100] }}>
              <Ionicons name="clipboard-outline" size={20} color={Colors.brand[700]} />
            </View>
            {/* Content */}
            <View style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 12 }}>
              <Text numberOfLines={1} style={{ fontSize: 14, color: '#1B3A5C', fontFamily: 'Poppins_700Bold' }}>{r.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                {r.author && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="person-outline" size={10} color={Colors.neutral[500]} />
                    <Text style={{ fontSize: 11, color: Colors.neutral[500], fontFamily: 'Inter_400Regular' }}>{r.author}</Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="calendar-outline" size={10} color={Colors.neutral[500]} />
                  <Text style={{ fontSize: 11, color: Colors.neutral[500], fontFamily: 'Inter_400Regular' }}>{new Date(r.created_at).toLocaleDateString()}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.brand[100], borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Ionicons name="layers-outline" size={10} color={Colors.brand[700]} />
                  <Text style={{ fontSize: 10, color: Colors.brand[700], fontFamily: 'Inter_500Medium' }}>{r.step_count ?? 0} step{r.step_count !== 1 ? 's' : ''}</Text>
                </View>
              </View>
            </View>
            {/* Actions */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 10, gap: 4 }}>
              <Pressable onPress={() => confirmDelete(r.id, r.title)} hitSlop={10} style={{ padding: 6 }}>
                <Ionicons name="trash-outline" size={17} color={Colors.neutral[500]} />
              </Pressable>
              <Ionicons name="chevron-forward" size={17} color={Colors.neutral[300]} />
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* New Report Modal */}
      <Modal visible={newModal} transparent animationType="slide" onRequestClose={() => setNewModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/40"
        >
          <View className="rounded-t-3xl bg-white px-6 pb-10 pt-6" style={{ paddingBottom: insets.bottom + 24 }}>
            <Text className="mb-4 text-xl text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
              New Inspection Report
            </Text>

            <Text className="mb-1 text-sm text-neutral-600" style={{ fontFamily: 'Inter_500Medium' }}>
              Report Title *
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Foundation Inspection - Block A"
              placeholderTextColor="#9CA3AF"
              className="mb-3 rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-base text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
              autoFocus
            />

            <Text className="mb-1 text-sm text-neutral-600" style={{ fontFamily: 'Inter_500Medium' }}>
              Inspector Name (optional)
            </Text>
            <TextInput
              value={author}
              onChangeText={setAuthor}
              placeholder="Your name"
              placeholderTextColor="#9CA3AF"
              className="mb-5 rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-base text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
            />

            <Button
              title={createMutation.isPending ? 'Creating…' : 'Create Report'}
              onPress={() => { if (title.trim()) createMutation.mutate(); }}
              disabled={!title.trim() || createMutation.isPending}
            />
            <Pressable onPress={() => setNewModal(false)} className="mt-3 items-center py-2">
              <Text className="text-sm text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Report Detail ────────────────────────────────────────────────────────────

function ReportDetailScreen({ reportId, onBack }: { reportId: string; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [addingStep, setAddingStep] = useState(false);
  const [editingStep, setEditingStep] = useState<ReportStep | null>(null);
  const [exporting, setExporting] = useState(false);
  const [sharingLink, setSharingLink] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['site-report', reportId],
    queryFn: () => getReport(reportId),
  });

  const report = data?.report;
  const steps = data?.steps ?? [];

  const { data: stepImagesData, refetch: refetchImages } = useQuery({
    queryKey: ['step-images', reportId],
    queryFn: async () => {
      const { getAuth } = await import('firebase/auth');
      const { BASE_URL } = { BASE_URL: (process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8080').replace(/\/$/, '') };
      const user = getAuth().currentUser;
      const token = user ? await user.getIdToken() : 'dev-test';
      const res = await fetch(`${BASE_URL}/api/v1/reports/${reportId}/step-images`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [] as import('@/lib/siteReport/api').StepImage[];
      const json = await res.json();
      return json.images as import('@/lib/siteReport/api').StepImage[];
    },
    enabled: !!reportId,
  });

  const extraImagesByStep = useMemo(() => {
    const map: Record<string, StepImage[]> = {};
    for (const img of stepImagesData ?? []) {
      if (!map[img.step_id]) map[img.step_id] = [];
      map[img.step_id].push(img);
    }
    return map;
  }, [stepImagesData]);

  const updateReportMutation = useMutation({
    mutationFn: (title: string) => updateReport(reportId, { title }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['site-report', reportId] });
      void queryClient.invalidateQueries({ queryKey: ['site-reports'] });
      setEditingTitle(false);
    },
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Failed to rename report'),
  });

  const addStepMutation = useMutation({
    mutationFn: (params: Parameters<typeof addStep>[1]) => addStep(reportId, params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['site-report', reportId] });
      setAddingStep(false);
    },
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add step'),
  });

  const deleteStepMutation = useMutation({
    mutationFn: (stepId: string) => deleteStep(reportId, stepId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['site-report', reportId] }),
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete step'),
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const html = await fetchReportHtml(reportId);
      await exportSiteReportPdf(html);
    } catch (err) {
      Alert.alert('Export Failed', err instanceof Error ? err.message : 'Could not export report');
    } finally {
      setExporting(false);
    }
  };

  const handleShareLink = async () => {
    setSharingLink(true);
    try {
      const url = await generateShareLink(reportId);
      await Share.share({ message: `View Site Inspection Report: ${url}`, url });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not generate link');
    } finally {
      setSharingLink(false);
    }
  };

  const handleWhatsApp = async () => {
    setExporting(true);
    try {
      const html = await fetchReportHtml(reportId);
      await exportSiteReportPdf(html);
    } catch (err) {
      Alert.alert('Share Failed', err instanceof Error ? err.message : 'Could not share report');
    } finally {
      setExporting(false);
    }
  };

  const handleRevokeLink = () => {
    Alert.alert(
      'Revoke Share Link',
      'Anyone with the current link will no longer be able to view this report. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeShareLink(reportId);
              void queryClient.invalidateQueries({ queryKey: ['site-report', reportId] });
              void queryClient.invalidateQueries({ queryKey: ['site-reports'] });
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to revoke link');
            }
          },
        },
      ]
    );
  };

  const confirmDeleteStep = (step: ReportStep) => {
    Alert.alert('Delete Step', `Delete Step ${step.step_index + 1}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteStepMutation.mutate(step.id) },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top', 'left', 'right']}>
      <ScreenHeader
        title={report?.title ?? 'AI Site Inspection Report'}
        level="Advanced"
      />

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.brand[700]} className="mt-16" />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Inline title editor */}
          {editingTitle ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: Colors.brand[500], paddingHorizontal: 12, paddingVertical: 6 }}>
              <TextInput
                value={titleDraft}
                onChangeText={setTitleDraft}
                autoFocus
                style={{ flex: 1, fontSize: 15, fontFamily: 'Poppins_700Bold', color: '#1B3A5C' }}
                returnKeyType="done"
                onSubmitEditing={() => { if (titleDraft.trim()) updateReportMutation.mutate(titleDraft.trim()); }}
              />
              <Pressable onPress={() => { if (titleDraft.trim()) updateReportMutation.mutate(titleDraft.trim()); }} style={{ padding: 4 }}>
                {updateReportMutation.isPending
                  ? <ActivityIndicator size="small" color={Colors.brand[700]} />
                  : <Ionicons name="checkmark-circle" size={22} color={Colors.brand[700]} />}
              </Pressable>
              <Pressable onPress={() => setEditingTitle(false)} style={{ padding: 4 }}>
                <Ionicons name="close-circle-outline" size={22} color={Colors.neutral[500]} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => { setTitleDraft(report?.title ?? ''); setEditingTitle(true); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, alignSelf: 'flex-start' }}
            >
              <Text style={{ fontSize: 13, color: Colors.neutral[500], fontFamily: 'Inter_400Regular' }} numberOfLines={1}>{report?.title}</Text>
              <Ionicons name="pencil-outline" size={13} color={Colors.neutral[300]} />
            </Pressable>
          )}

          {/* Revoke share link (only if a link exists) */}
          {report?.share_token && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, backgroundColor: '#fff7ed', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: '#fed7aa' }}>
              <Ionicons name="link" size={14} color="#ea580c" />
              <Text style={{ flex: 1, fontSize: 11, color: '#c2410c', fontFamily: 'Inter_400Regular' }}>This report has an active share link</Text>
              <Pressable onPress={handleRevokeLink} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ea580c', borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5 }}>
                <Ionicons name="close" size={11} color="#fff" />
                <Text style={{ fontSize: 11, color: '#fff', fontFamily: 'Inter_500Medium' }}>Revoke</Text>
              </Pressable>
            </View>
          )}

          {/* Steps */}
          {steps.map((step, idx) => (
            <StepCard
              key={step.id}
              step={step}
              index={idx}
              reportId={reportId}
              extraImages={extraImagesByStep[step.id] ?? []}
              onDelete={() => confirmDeleteStep(step)}
              onEdit={() => setEditingStep(step)}
              onRefresh={() => { void queryClient.invalidateQueries({ queryKey: ['site-report', reportId] }); void refetchImages(); }}
            />
          ))}

          {/* Add step button */}
          <Pressable
            onPress={() => setAddingStep(true)}
            style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.brand[500], backgroundColor: Colors.brand[100], paddingVertical: 14 }}
          >
            <Ionicons name="camera-outline" size={18} color={Colors.brand[700]} />
            <Text style={{ marginLeft: 8, fontSize: 13, color: Colors.brand[700], fontFamily: 'Inter_500Medium' }}>Add Inspection Step</Text>
          </Pressable>

          {/* Export / Share actions */}
          {steps.length > 0 && (
            <View style={{ marginTop: 16, gap: 8 }}>
              {/* PDF - full width */}
              <Pressable
                onPress={handleExport}
                disabled={exporting}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.brand[900], borderRadius: 14, paddingVertical: 14 }}
              >
                {exporting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Ionicons name="document-text-outline" size={18} color="#fff" />
                      <Text style={{ fontSize: 14, color: '#fff', fontFamily: 'Poppins_700Bold' }}>Export as PDF</Text>
                    </>}
              </Pressable>

              {/* Share row - 2 col */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={handleShareLink}
                  disabled={sharingLink}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#0ea5e9', borderRadius: 14, paddingVertical: 13 }}
                >
                  {sharingLink
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <>
                        <Ionicons name="link-outline" size={16} color="#fff" />
                        <Text style={{ fontSize: 13, color: '#fff', fontFamily: 'Inter_600SemiBold' }}>Web Link</Text>
                      </>}
                </Pressable>
                <Pressable
                  onPress={handleWhatsApp}
                  disabled={exporting}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#25D366', borderRadius: 14, paddingVertical: 13 }}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                  <Text style={{ fontSize: 13, color: '#fff', fontFamily: 'Inter_600SemiBold' }}>WhatsApp</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Step Modal */}
      {addingStep && (
        <AddStepModal
          onClose={() => setAddingStep(false)}
          onSubmit={(params) => addStepMutation.mutate(params)}
          submitting={addStepMutation.isPending}
        />
      )}

      {/* Edit Step Modal */}
      {editingStep && (
        <EditStepModal
          step={editingStep}
          reportId={reportId}
          onClose={() => setEditingStep(null)}
          onSaved={() => {
            setEditingStep(null);
            void queryClient.invalidateQueries({ queryKey: ['site-report', reportId] });
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Map Picker Modal ────────────────────────────────────────────────────────

function MapPickerModal({
  visible,
  initialLat,
  initialLng,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  initialLat: number | null;
  initialLng: number | null;
  onConfirm: (lat: number, lng: number) => void;
  onClose: () => void;
}) {
  const DEFAULT_LAT = 33.6844;
  const DEFAULT_LNG = 73.0479;
  const [pin, setPin] = useState({
    latitude: initialLat ?? DEFAULT_LAT,
    longitude: initialLng ?? DEFAULT_LNG,
  });

  useEffect(() => {
    if (visible) {
      setPin({
        latitude: initialLat ?? DEFAULT_LAT,
        longitude: initialLng ?? DEFAULT_LNG,
      });
    }
  }, [visible, initialLat, initialLng]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          mapType="satellite"
          initialRegion={{
            latitude: pin.latitude,
            longitude: pin.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          onPress={(e) => setPin(e.nativeEvent.coordinate)}
        >
          <Marker
            coordinate={pin}
            draggable
            onDragEnd={(e) => setPin(e.nativeEvent.coordinate)}
          />
        </MapView>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="map-outline" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, flex: 1, fontFamily: 'Inter_500Medium' }}>Tap or drag pin to set location</Text>
          <Pressable onPress={onClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </View>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, paddingBottom: 32, gap: 8 }}>
          <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', fontFamily: 'Inter_400Regular' }}>
            📍 {pin.latitude.toFixed(6)}, {pin.longitude.toFixed(6)}
          </Text>
          <Pressable
            onPress={() => onConfirm(pin.latitude, pin.longitude)}
            style={{ backgroundColor: '#1B3A5C', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontFamily: 'Inter_500Medium' }}>Confirm Location</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Map Tile ─────────────────────────────────────────────────────────────────

function MapTile({ lat, lng }: { lat: number; lng: number }) {
  const mapUrl = buildMapUrl(lat, lng);
  return (
    <Pressable
      onPress={() => Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`)}
      style={{ borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: Colors.neutral[300], marginTop: 4 }}
    >
      {mapUrl ? (
        <Image source={{ uri: mapUrl }} style={{ width: '100%', height: 140 }} resizeMode="cover" />
      ) : (
        <View style={{ height: 52, backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
          <Ionicons name="map-outline" size={16} color={Colors.neutral[500]} />
          <Text style={{ fontSize: 12, color: Colors.neutral[500], fontFamily: 'Inter_500Medium' }}>Tap to open in Google Maps</Text>
        </View>
      )}
      <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons name="map-outline" size={11} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 10, fontFamily: 'Inter_500Medium' }}>
          {mapUrl ? 'Satellite · Tap to open' : 'Tap to open Maps'}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Step Card ────────────────────────────────────────────────────────────────

function StepCard({
  step,
  index,
  extraImages,
  onDelete,
  onEdit,
}: {
  step: ReportStep;
  index: number;
  reportId: string;
  extraImages: StepImage[];
  onDelete: () => void;
  onEdit: () => void;
  onRefresh: () => void;
}) {
  const statusCfg = STATUS_CONFIG[step.status ?? 'pending'];
  return (
    <View style={{ marginBottom: 12, borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: Colors.brand[900] }}>
        {/* Step number circle */}
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
          <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'Poppins_700Bold' }}>{index + 1}</Text>
        </View>
        {/* Status badge */}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ backgroundColor: statusCfg.bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name={statusCfg.icon as any} size={11} color={statusCfg.color} />
            <Text style={{ fontSize: 10, color: statusCfg.color, fontFamily: 'Inter_600SemiBold' }}>{statusCfg.label}</Text>
          </View>
        </View>
        {/* Actions */}
        <Pressable onPress={onEdit} hitSlop={10} style={{ padding: 5, marginRight: 2 }}>
          <Ionicons name="create-outline" size={17} color="rgba(255,255,255,0.85)" />
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={10} style={{ padding: 5 }}>
          <Ionicons name="trash-outline" size={17} color="rgba(255,255,255,0.85)" />
        </Pressable>
      </View>

      {/* Primary image */}
      {step.image_url ? (
        <Image source={{ uri: step.image_url }} style={{ width: '100%', height: 160 }} resizeMode="cover" />
      ) : (
        <View style={{ height: 80, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', flexDirection: 'row', gap: 6 }}>
          <Ionicons name="image-outline" size={22} color={Colors.neutral[300]} />
          <Text style={{ fontSize: 12, color: Colors.neutral[300], fontFamily: 'Inter_400Regular' }}>No photo</Text>
        </View>
      )}

      {/* Extra images strip */}
      {extraImages.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: '#f9fafb', borderTopWidth: 1, borderTopColor: '#f3f4f6' }} contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 6, gap: 6, flexDirection: 'row' }}>
          {extraImages.map((img) => (
            <Image key={img.id} source={{ uri: img.image_url }} style={{ width: 72, height: 56, borderRadius: 7 }} resizeMode="cover" />
          ))}
        </ScrollView>
      )}

      {/* Body */}
      <View style={{ padding: 12, gap: 8 }}>
        {/* Location pill */}
        {(step.location_name || step.location_lat != null) && (
          <Pressable
            onPress={() => step.location_lat != null && Linking.openURL(`https://www.google.com/maps?q=${step.location_lat},${step.location_lng}`)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: Colors.brand[100], borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}
          >
            <Ionicons name="location" size={11} color={Colors.brand[700]} />
            <Text style={{ fontSize: 11, color: Colors.brand[700], fontFamily: 'Inter_500Medium' }} numberOfLines={1}>
              {step.location_name || `${Number(step.location_lat).toFixed(4)}, ${Number(step.location_lng).toFixed(4)}`}
            </Text>
            {step.location_lat != null && <Ionicons name="open-outline" size={10} color={Colors.brand[500]} />}
          </Pressable>
        )}

        {/* Map tile */}
        {step.location_lat != null && step.location_lng != null && (
          <MapTile lat={Number(step.location_lat)} lng={Number(step.location_lng)} />
        )}

        {/* AI Description */}
        {step.description ? (
          <Text style={{ fontSize: 13, lineHeight: 19, color: '#374151', fontFamily: 'Inter_400Regular' }}>
            {step.description}
          </Text>
        ) : (
          <Text style={{ fontSize: 12, color: Colors.neutral[300], fontFamily: 'Inter_400Regular', fontStyle: 'italic' }}>
            No AI description — tap ✏️ to edit
          </Text>
        )}

        {/* Notes */}
        {step.optional_field && (
          <View style={{ flexDirection: 'row', gap: 6, backgroundColor: '#fffbeb', borderRadius: 8, padding: 8, borderLeftWidth: 3, borderLeftColor: '#f59e0b' }}>
            <Ionicons name="document-text-outline" size={13} color="#d97706" style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 12, color: '#92400e', fontFamily: 'Inter_400Regular', lineHeight: 17 }}>{step.optional_field}</Text>
          </View>
        )}

        {/* Checklist */}
        {step.checklist && step.checklist.length > 0 && (() => {
          const done = step.checklist.filter(i => i.checked).length;
          const total = step.checklist.length;
          const pct = Math.round((done / total) * 100);
          return (
            <View style={{ borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' }}>
              {/* Progress header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#f9fafb', borderBottomWidth: done === total ? 1 : 0, borderBottomColor: '#dcfce7' }}>
                <Text style={{ flex: 1, fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.neutral[500], textTransform: 'uppercase', letterSpacing: 0.4 }}>Checklist</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_500Medium', color: done === total ? '#16a34a' : Colors.neutral[500] }}>{done}/{total} · {pct}%</Text>
              </View>
              {/* Progress bar */}
              <View style={{ height: 3, backgroundColor: '#f3f4f6' }}>
                <View style={{ height: 3, width: `${pct}%` as any, backgroundColor: done === total ? '#16a34a' : Colors.brand[700] }} />
              </View>
              {/* Items */}
              <View style={{ paddingHorizontal: 10, paddingVertical: 6, gap: 4 }}>
                {step.checklist.map((item) => (
                  <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Ionicons name={item.checked ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={item.checked ? '#16a34a' : Colors.neutral[300]} />
                    <Text style={{ fontSize: 12, flex: 1, color: item.checked ? '#16a34a' : '#374151', fontFamily: 'Inter_400Regular', textDecorationLine: item.checked ? 'line-through' : 'none' }}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}
      </View>
    </View>
  );
}

function AddStepModal({
  onClose,
  onSubmit,
  submitting,
}: {
  onClose: () => void;
  onSubmit: (params: Parameters<typeof addStep>[1]) => void;
  submitting: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [locationName, setLocationName] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [customItemText, setCustomItemText] = useState('');

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setMimeType(result.assets[0].mimeType ?? 'image/jpeg');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setMimeType(result.assets[0].mimeType ?? 'image/jpeg');
    }
  };

  const getLocation = async () => {
    setFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Location access is needed to tag this step.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocationLat(loc.coords.latitude);
      setLocationLng(loc.coords.longitude);
      const [place] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (place) {
        const parts = [place.city, place.region, place.country].filter(Boolean);
        setLocationName(parts.join(', '));
      }
    } catch {
      Alert.alert('Location error', 'Could not fetch your current location.');
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleSubmit = () => {
    if (!imageUri) { Alert.alert('Image required', 'Please select or take a photo first.'); return; }
    onSubmit({
      imageUri,
      mimeType,
      locationLat: locationLat ?? undefined,
      locationLng: locationLng ?? undefined,
      locationName: locationName.trim() || undefined,
      optionalField: notes.trim() || undefined,
      checklist: checklist.length ? checklist : undefined,
    });
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/50"
      >
        <ScrollView
          className="rounded-t-3xl bg-white"
          contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text className="mb-4 text-xl text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
            Add Inspection Step
          </Text>

          {/* Image picker */}
          {imageUri ? (
            <View className="mb-4 overflow-hidden rounded-2xl">
              <Image source={{ uri: imageUri }} style={{ width: '100%', height: 200 }} resizeMode="cover" />
              <Pressable
                onPress={() => setImageUri(null)}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1"
              >
                <Ionicons name="close" size={16} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <Pressable
                onPress={takePhoto}
                className="flex-1 flex-row items-center justify-center rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 py-5"
              >
                <Ionicons name="camera-outline" size={22} color={Colors.brand[700]} />
                <Text className="ml-2 text-sm font-semibold text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>
                  Camera
                </Text>
              </Pressable>
              <Pressable
                onPress={pickImage}
                className="flex-1 flex-row items-center justify-center rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 py-5"
              >
                <Ionicons name="images-outline" size={22} color={Colors.brand[700]} />
                <Text className="ml-2 text-sm font-semibold text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>
                  Gallery
                </Text>
              </Pressable>
            </View>
          )}

          {/* Location */}
          <Text className="mb-1 text-sm text-neutral-600" style={{ fontFamily: 'Inter_500Medium' }}>
            Location
          </Text>
          <View className="mb-1 flex-row items-center gap-2">
            <TextInput
              value={locationName}
              onChangeText={setLocationName}
              placeholder="Location name (optional)"
              placeholderTextColor="#9CA3AF"
              className="flex-1 rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
            />
            <Pressable
              onPress={getLocation}
              disabled={fetchingLocation}
              className="items-center justify-center rounded-xl border border-brand-300 bg-brand-50 px-3 py-3"
            >
              {fetchingLocation ? (
                <ActivityIndicator size="small" color={Colors.brand[700]} />
              ) : (
                <Ionicons name="locate-outline" size={20} color={Colors.brand[700]} />
              )}
            </Pressable>
            <Pressable
              onPress={() => setShowMapPicker(true)}
              className="items-center justify-center rounded-xl border border-brand-300 bg-brand-50 px-3 py-3"
            >
              <Ionicons name="map-outline" size={20} color={Colors.brand[700]} />
            </Pressable>
          </View>
          {locationLat != null && (
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-xs text-neutral-400" style={{ fontFamily: 'Inter_400Regular' }}>
                📍 {locationLat.toFixed(5)}, {locationLng?.toFixed(5)}
              </Text>
              <Pressable
                onPress={() => { setLocationLat(null); setLocationLng(null); setLocationName(''); }}
                className="flex-row items-center rounded-lg bg-neutral-100 px-3 py-1"
                style={{ gap: 4 }}
              >
                <Ionicons name="close-circle-outline" size={14} color={Colors.neutral[500]} />
                <Text style={{ fontSize: 11, color: Colors.neutral[500], fontFamily: 'Inter_500Medium' }}>Clear</Text>
              </Pressable>
            </View>
          )}
          <MapPickerModal
            visible={showMapPicker}
            initialLat={locationLat}
            initialLng={locationLng}
            onConfirm={(lat, lng) => {
              setLocationLat(lat);
              setLocationLng(lng);
              setShowMapPicker(false);
            }}
            onClose={() => setShowMapPicker(false)}
          />

          {/* Notes */}
          <Text className="mb-1 mt-2 text-sm text-neutral-600" style={{ fontFamily: 'Inter_500Medium' }}>
            Notes (optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional observations…"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            className="mb-5 rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-900"
            style={{ fontFamily: 'Inter_400Regular', textAlignVertical: 'top', minHeight: 80 }}
          />

          {/* Checklist */}
          <Text style={{ fontSize: 13, color: Colors.neutral[500], fontFamily: 'Inter_500Medium', marginBottom: 8, marginTop: 4 }}>Inspection Checklist (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 8, flexDirection: 'row' }}>
            {Object.keys(CHECKLIST_TEMPLATES).map((tpl) => (
              <Pressable
                key={tpl}
                onPress={() => setChecklist(makeChecklist(CHECKLIST_TEMPLATES[tpl]!))}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.brand[100], borderWidth: 1, borderColor: Colors.brand[500] }}
              >
                <Text style={{ fontSize: 11, color: Colors.brand[700], fontFamily: 'Inter_500Medium' }}>{tpl}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {checklist.map((item) => (
            <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              <Pressable onPress={() => setChecklist((p) => p.map((i) => i.id === item.id ? { ...i, checked: !i.checked } : i))}>
                <Ionicons name={item.checked ? 'checkbox' : 'square-outline'} size={20} color={item.checked ? '#16a34a' : Colors.neutral[300]} />
              </Pressable>
              <Text style={{ flex: 1, fontSize: 13, color: item.checked ? '#16a34a' : Colors.neutral[700], fontFamily: 'Inter_400Regular', textDecorationLine: item.checked ? 'line-through' : 'none' }}>{item.label}</Text>
              <Pressable onPress={() => setChecklist((p) => p.filter((i) => i.id !== item.id))} hitSlop={8}>
                <Ionicons name="close-circle-outline" size={16} color={Colors.neutral[300]} />
              </Pressable>
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <TextInput
              value={customItemText}
              onChangeText={setCustomItemText}
              placeholder="Add custom item…"
              placeholderTextColor="#9CA3AF"
              style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontFamily: 'Inter_400Regular', color: '#111' }}
              returnKeyType="done"
              onSubmitEditing={() => { const t = customItemText.trim(); if (!t) return; setChecklist((p) => [...p, { id: Math.random().toString(36).slice(2), label: t, checked: false }]); setCustomItemText(''); }}
            />
            <Pressable
              onPress={() => { const t = customItemText.trim(); if (!t) return; setChecklist((p) => [...p, { id: Math.random().toString(36).slice(2), label: t, checked: false }]); setCustomItemText(''); }}
              style={{ backgroundColor: Colors.brand[900], borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' }}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>
          </View>

          {submitting && (
            <View className="mb-3 flex-row items-center rounded-xl bg-brand-50 px-4 py-3">
              <ActivityIndicator size="small" color={Colors.brand[700]} />
              <Text className="ml-3 text-sm text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>
                Uploading image & generating AI description…
              </Text>
            </View>
          )}

          <Button
            title={submitting ? 'Processing…' : 'Add Step'}
            onPress={handleSubmit}
            disabled={!imageUri || submitting}
          />
          <Pressable onPress={onClose} className="mt-3 items-center py-2">
            <Text className="text-sm text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Edit Step Modal ──────────────────────────────────────────────────────────

function EditStepModal({
  step,
  reportId,
  onClose,
  onSaved,
}: {
  step: ReportStep;
  reportId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [description, setDescription] = useState(step.description ?? '');
  const [locationName, setLocationName] = useState(step.location_name ?? '');
  const [locationLat, setLocationLat] = useState<number | null>(step.location_lat);
  const [locationLng, setLocationLng] = useState<number | null>(step.location_lng);
  const [notes, setNotes] = useState(step.optional_field ?? '');
  const [stepStatus, setStepStatus] = useState<StepStatus>(step.status ?? 'pending');
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(step.checklist ?? []);
  const [customItemText, setCustomItemText] = useState('');
  const [extraImages, setExtraImages] = useState<StepImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    // load existing extra images for this step
    const BASE = (process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8080').replace(/\/$/, '');
    import('firebase/auth').then(({ getAuth }) => {
      const user = getAuth().currentUser;
      user?.getIdToken().then((token) => {
        fetch(`${BASE}/api/v1/reports/${reportId}/step-images`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()).then((j) => {
          const all: StepImage[] = j.images ?? [];
          setExtraImages(all.filter((i) => i.step_id === step.id));
        }).catch(() => {});
      });
    });
  }, [step.id, reportId]);

  const pickExtraImage = async () => {
    if (extraImages.length >= 4) { Alert.alert('Limit reached', 'Max 4 extra images per step.'); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setUploadingImage(true);
      try {
        const img = await addStepImage(reportId, step.id, { imageUri: result.assets[0].uri, mimeType: result.assets[0].mimeType ?? 'image/jpeg' });
        setExtraImages((prev) => [...prev, img]);
      } catch (e) {
        Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not upload image');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const removeExtraImage = (img: StepImage) => {
    Alert.alert('Remove image?', 'This will permanently delete this photo.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteStepImage(reportId, step.id, img.id).catch(() => {});
        setExtraImages((prev) => prev.filter((i) => i.id !== img.id));
      }},
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      updateStep(reportId, step.id, {
        description: description.trim(),
        location_lat: locationLat ?? undefined,
        location_lng: locationLng ?? undefined,
        location_name: locationName.trim() || undefined,
        optional_field: notes.trim() || undefined,
        status: stepStatus,
        checklist,
      }),
    onSuccess: onSaved,
    onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save'),
  });

  const getLocation = async () => {
    setFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocationLat(loc.coords.latitude);
      setLocationLng(loc.coords.longitude);
      const [place] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (place) {
        setLocationName([place.city, place.region, place.country].filter(Boolean).join(', '));
      }
    } catch {
      Alert.alert('Location error', 'Could not fetch location.');
    } finally {
      setFetchingLocation(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/50"
      >
        <ScrollView
          className="rounded-t-3xl bg-white"
          contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text className="mb-4 text-xl text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
            Edit Step {step.step_index + 1}
          </Text>

          {/* Image preview */}
          {step.image_url && (
            <Image
              source={{ uri: step.image_url }}
              className="mb-4 w-full rounded-2xl"
              style={{ height: 160 }}
              resizeMode="cover"
            />
          )}

          {/* Status */}
          <Text className="mb-2 text-sm text-neutral-600" style={{ fontFamily: 'Inter_500Medium' }}>
            Inspection Status
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {(Object.entries(STATUS_CONFIG) as [StepStatus, typeof STATUS_CONFIG[StepStatus]][]).map(([key, cfg]) => (
              <Pressable
                key={key}
                onPress={() => setStepStatus(key)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: stepStatus === key ? cfg.color : '#e5e7eb',
                  backgroundColor: stepStatus === key ? cfg.bg : '#f9fafb',
                }}
              >
                <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                <Text style={{ fontSize: 12, color: cfg.color, fontFamily: 'Inter_500Medium' }}>{cfg.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* AI Description */}
          <Text className="mb-1 text-sm text-neutral-600" style={{ fontFamily: 'Inter_500Medium' }}>
            AI Description
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="AI-generated description will appear here…"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            className="mb-4 rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-900"
            style={{ fontFamily: 'Inter_400Regular', textAlignVertical: 'top', minHeight: 100 }}
          />

          {/* Location */}
          <Text className="mb-1 text-sm text-neutral-600" style={{ fontFamily: 'Inter_500Medium' }}>
            Location
          </Text>
          <View className="mb-1 flex-row items-center gap-2">
            <TextInput
              value={locationName}
              onChangeText={setLocationName}
              placeholder="Location name"
              placeholderTextColor="#9CA3AF"
              className="flex-1 rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
            />
            <Pressable
              onPress={getLocation}
              disabled={fetchingLocation}
              className="items-center justify-center rounded-xl border border-brand-300 bg-brand-50 px-3 py-3"
            >
              {fetchingLocation ? (
                <ActivityIndicator size="small" color={Colors.brand[700]} />
              ) : (
                <Ionicons name="locate-outline" size={20} color={Colors.brand[700]} />
              )}
            </Pressable>
            <Pressable
              onPress={() => setShowMapPicker(true)}
              className="items-center justify-center rounded-xl border border-brand-300 bg-brand-50 px-3 py-3"
            >
              <Ionicons name="map-outline" size={20} color={Colors.brand[700]} />
            </Pressable>
          </View>
          {locationLat != null && (
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-xs text-neutral-400" style={{ fontFamily: 'Inter_400Regular' }}>
                📍 {locationLat.toFixed(5)}, {locationLng?.toFixed(5)}
              </Text>
              <Pressable
                onPress={() => { setLocationLat(null); setLocationLng(null); setLocationName(''); }}
                className="flex-row items-center rounded-lg bg-neutral-100 px-3 py-1"
                style={{ gap: 4 }}
              >
                <Ionicons name="close-circle-outline" size={14} color={Colors.neutral[500]} />
                <Text style={{ fontSize: 11, color: Colors.neutral[500], fontFamily: 'Inter_500Medium' }}>Clear</Text>
              </Pressable>
            </View>
          )}
          <MapPickerModal
            visible={showMapPicker}
            initialLat={locationLat}
            initialLng={locationLng}
            onConfirm={(lat, lng) => {
              setLocationLat(lat);
              setLocationLng(lng);
              setShowMapPicker(false);
            }}
            onClose={() => setShowMapPicker(false)}
          />

          {/* Notes */}
          <Text className="mb-1 mt-2 text-sm text-neutral-600" style={{ fontFamily: 'Inter_500Medium' }}>
            Notes
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional observations…"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            className="mb-5 rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-900"
            style={{ fontFamily: 'Inter_400Regular', textAlignVertical: 'top', minHeight: 80 }}
          />

          {/* Checklist */}
          <Text className="mb-2 mt-2 text-sm text-neutral-600" style={{ fontFamily: 'Inter_500Medium' }}>
            Inspection Checklist
          </Text>
          {/* Template picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 8, flexDirection: 'row' }}>
            {Object.keys(CHECKLIST_TEMPLATES).map((tpl) => (
              <Pressable
                key={tpl}
                onPress={() => setChecklist(makeChecklist(CHECKLIST_TEMPLATES[tpl]!))}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.brand[100], borderWidth: 1, borderColor: Colors.brand[500] }}
              >
                <Text style={{ fontSize: 11, color: Colors.brand[700], fontFamily: 'Inter_500Medium' }}>{tpl}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {/* Items */}
          {checklist.map((item) => (
            <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Pressable onPress={() => setChecklist((prev) => prev.map((i) => i.id === item.id ? { ...i, checked: !i.checked } : i))}>
                <Ionicons name={item.checked ? 'checkbox' : 'square-outline'} size={20} color={item.checked ? '#16a34a' : Colors.neutral[500]} />
              </Pressable>
              <Text style={{ flex: 1, fontSize: 13, color: item.checked ? '#16a34a' : Colors.neutral[700], fontFamily: 'Inter_400Regular', textDecorationLine: item.checked ? 'line-through' : 'none' }}>
                {item.label}
              </Text>
              <Pressable onPress={() => setChecklist((prev) => prev.filter((i) => i.id !== item.id))} hitSlop={8}>
                <Ionicons name="close-circle-outline" size={16} color={Colors.neutral[500]} />
              </Pressable>
            </View>
          ))}
          {/* Add custom item */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <TextInput
              value={customItemText}
              onChangeText={setCustomItemText}
              placeholder="Add custom item…"
              placeholderTextColor="#9CA3AF"
              style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontFamily: 'Inter_400Regular', color: '#111' }}
              returnKeyType="done"
              onSubmitEditing={() => {
                const t = customItemText.trim();
                if (!t) return;
                setChecklist((prev) => [...prev, { id: Math.random().toString(36).slice(2), label: t, checked: false }]);
                setCustomItemText('');
              }}
            />
            <Pressable
              onPress={() => {
                const t = customItemText.trim();
                if (!t) return;
                setChecklist((prev) => [...prev, { id: Math.random().toString(36).slice(2), label: t, checked: false }]);
                setCustomItemText('');
              }}
              style={{ backgroundColor: Colors.brand[900], borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' }}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>
          </View>

          {/* Extra Photos */}
          <Text className="mb-2 mt-2 text-sm text-neutral-600" style={{ fontFamily: 'Inter_500Medium' }}>
            Extra Photos ({extraImages.length}/4)
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8, flexDirection: 'row' }}>
            {extraImages.map((img) => (
              <View key={img.id} style={{ position: 'relative' }}>
                <Image source={{ uri: img.image_url }} style={{ width: 90, height: 90, borderRadius: 10 }} resizeMode="cover" />
                <Pressable
                  onPress={() => removeExtraImage(img)}
                  style={{ position: 'absolute', top: 3, right: 3, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 2 }}
                >
                  <Ionicons name="close" size={13} color="#fff" />
                </Pressable>
              </View>
            ))}
            {extraImages.length < 4 && (
              <Pressable
                onPress={pickExtraImage}
                disabled={uploadingImage}
                style={{ width: 90, height: 90, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.brand[500], backgroundColor: Colors.brand[100], alignItems: 'center', justifyContent: 'center' }}
              >
                {uploadingImage ? <ActivityIndicator size="small" color={Colors.brand[700]} /> : <Ionicons name="add" size={26} color={Colors.brand[700]} />}
              </Pressable>
            )}
          </ScrollView>

          <Button
            title={saveMutation.isPending ? 'Saving…' : 'Save Changes'}
            onPress={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          />
          <Pressable onPress={onClose} className="mt-3 items-center py-2">
            <Text className="text-sm text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
