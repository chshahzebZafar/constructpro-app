import { useCallback, useEffect, useRef, useState } from 'react';
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
  fetchReportHtml,
  type SiteReport,
  type ReportStep,
} from '@/lib/siteReport/api';
import { exportSiteReportPdf } from '@/lib/pdf/generateSiteReportPdf';

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
          className="mb-4 flex-row items-center justify-center rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 py-5"
        >
          <Ionicons name="add-circle-outline" size={24} color={Colors.brand[700]} />
          <Text className="ml-2 text-base font-semibold text-brand-700" style={{ fontFamily: 'Poppins_700Bold' }}>
            New Inspection Report
          </Text>
        </Pressable>

        {isLoading && (
          <ActivityIndicator size="large" color={Colors.brand[700]} className="mt-8" />
        )}

        {!isLoading && reports.length === 0 && (
          <View className="mt-12 items-center">
            <Ionicons name="camera-outline" size={56} color={Colors.neutral[300]} />
            <Text className="mt-4 text-center text-base text-neutral-400" style={{ fontFamily: 'Inter_400Regular' }}>
              No inspection reports yet.{'\n'}Create one to get started.
            </Text>
          </View>
        )}

        {reports.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => onOpen(r.id)}
            className="mb-3 flex-row items-center rounded-2xl border border-neutral-200 bg-white p-4 active:opacity-80"
          >
            <View
              className="mr-4 h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: Colors.brand[100] }}
            >
              <Ionicons name="camera" size={24} color={Colors.brand[700]} />
            </View>
            <View className="flex-1">
              <Text className="text-base text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }} numberOfLines={1}>
                {r.title}
              </Text>
              <Text className="text-xs text-neutral-500 mt-0.5" style={{ fontFamily: 'Inter_400Regular' }}>
                {r.author ? `By ${r.author} · ` : ''}
                {new Date(r.created_at).toLocaleDateString()}
              </Text>
            </View>
            <Pressable
              onPress={() => confirmDelete(r.id, r.title)}
              hitSlop={10}
              className="p-2"
            >
              <Ionicons name="trash-outline" size={20} color={Colors.neutral[500]} />
            </Pressable>
            <Ionicons name="chevron-forward" size={20} color={Colors.neutral[500]} />
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

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['site-report', reportId],
    queryFn: () => getReport(reportId),
  });

  const report = data?.report;
  const steps = data?.steps ?? [];

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
          {/* Steps */}
          {steps.map((step, idx) => (
            <StepCard
              key={step.id}
              step={step}
              index={idx}
              reportId={reportId}
              onDelete={() => confirmDeleteStep(step)}
              onEdit={() => setEditingStep(step)}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['site-report', reportId] })}
            />
          ))}

          {/* Add step button */}
          <Pressable
            onPress={() => setAddingStep(true)}
            className="mt-2 flex-row items-center justify-center rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 py-5"
          >
            <Ionicons name="camera-outline" size={22} color={Colors.brand[700]} />
            <Text className="ml-2 text-sm font-semibold text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>
              Add Inspection Step
            </Text>
          </Pressable>

          {/* Export actions */}
          {steps.length > 0 && (
            <View className="mt-6 gap-3">
              <Pressable
                onPress={handleExport}
                disabled={exporting}
                className="flex-row items-center justify-center rounded-2xl bg-brand-900 py-4 active:opacity-80"
              >
                {exporting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={20} color="#fff" />
                    <Text className="ml-2 text-base font-semibold text-white" style={{ fontFamily: 'Poppins_700Bold' }}>
                      Export as PDF
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={handleWhatsApp}
                disabled={exporting}
                className="flex-row items-center justify-center rounded-2xl py-4 active:opacity-80"
                style={{ backgroundColor: '#25D366' }}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                <Text className="ml-2 text-base font-semibold text-white" style={{ fontFamily: 'Poppins_700Bold' }}>
                  Share via WhatsApp
                </Text>
              </Pressable>
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
  onDelete,
  onEdit,
}: {
  step: ReportStep;
  index: number;
  reportId: string;
  onDelete: () => void;
  onEdit: () => void;
  onRefresh: () => void;
}) {
  return (
    <View className="mb-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <View className="flex-row items-center justify-between px-4 py-3" style={{ backgroundColor: Colors.brand[900] }}>
        <Text className="text-sm font-bold text-white" style={{ fontFamily: 'Poppins_700Bold' }}>
          Step {index + 1}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable onPress={onEdit} hitSlop={8}>
            <Ionicons name="create-outline" size={18} color="#fff" />
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>

      {step.image_url ? (
        <Image
          source={{ uri: step.image_url }}
          className="w-full"
          style={{ height: 200 }}
          resizeMode="cover"
        />
      ) : (
        <View className="h-28 items-center justify-center bg-neutral-100">
          <Ionicons name="image-outline" size={36} color={Colors.neutral[300]} />
        </View>
      )}

      <View className="p-4">
        {(step.location_name || (step.location_lat && step.location_lng)) && (
          <View className="mb-3">
            <View className="mb-1 flex-row items-center">
              <Ionicons name="location-outline" size={14} color={Colors.brand[700]} />
              <Text className="ml-1 text-xs text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>
                {[
                  step.location_name,
                  step.location_lat != null
                    ? `${Number(step.location_lat).toFixed(4)}, ${Number(step.location_lng).toFixed(4)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            {step.location_lat != null && step.location_lng != null && (
              <MapTile
                lat={Number(step.location_lat)}
                lng={Number(step.location_lng)}
              />
            )}
          </View>
        )}

        {step.description ? (
          <Text className="text-sm leading-5 text-neutral-700" style={{ fontFamily: 'Inter_400Regular' }}>
            {step.description}
          </Text>
        ) : (
          <Text className="text-sm italic text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
            No description — tap edit to add one.
          </Text>
        )}

        {step.optional_field && (
          <View className="mt-2 rounded-lg bg-neutral-100 p-3">
            <Text className="text-xs font-semibold text-neutral-500" style={{ fontFamily: 'Inter_500Medium' }}>
              Notes
            </Text>
            <Text className="mt-1 text-sm text-neutral-700" style={{ fontFamily: 'Inter_400Regular' }}>
              {step.optional_field}
            </Text>
          </View>
        )}
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
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateStep(reportId, step.id, {
        description: description.trim(),
        location_lat: locationLat ?? undefined,
        location_lng: locationLng ?? undefined,
        location_name: locationName.trim() || undefined,
        optional_field: notes.trim() || undefined,
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
