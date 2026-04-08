import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  FlatList,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { YmdDateField } from '@/components/forms/YmdDateField';
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/store/useAuthStore';
import {
  addDailySiteLog,
  createBudgetProject,
  deleteBudgetProject,
  deleteDailySiteLog,
  getLastSelectedProjectId,
  listBudgetProjects,
  listDailySiteLogs,
  setLastSelectedProjectId,
  updateDailySiteLog,
} from '@/lib/dailySiteLog/repository';
import {
  MAX_DAILY_LOG_PHOTOS,
  WEATHER_CONDITIONS,
  type DailySiteLogEntry,
  type WeatherCondition,
} from '@/lib/dailySiteLog/types';
import { invalidateSharedProjectQueries } from '@/lib/query/invalidateSharedProjectQueries';
import { TOOL_PHOTO_UPLOAD_ENABLED } from '@/lib/tools/featureFlags';
import { useI18n } from '@/hooks/useI18n';

export default function DailySiteLogScreen() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectModal, setProjectModal] = useState(false);
  const [formModal, setFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [logDate, setLogDate] = useState('');
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>('clear');
  const [weatherNotes, setWeatherNotes] = useState('');
  const [workforce, setWorkforce] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');
  const [deliveries, setDeliveries] = useState('');
  const [visitors, setVisitors] = useState('');
  const [safetyNotes, setSafetyNotes] = useState('');
  const [signedBy, setSignedBy] = useState('');
  const [signedDate, setSignedDate] = useState('');
  const [pendingUris, setPendingUris] = useState<string[]>([]);
  const [removePhotoIndexes, setRemovePhotoIndexes] = useState<number[]>([]);
  const [editingPhotos, setEditingPhotos] = useState<string[]>([]);

  const projectsQuery = useQuery({
    queryKey: ['budget-projects', uid],
    queryFn: listBudgetProjects,
    enabled: Boolean(uid),
  });
  const projects = projectsQuery.data ?? [];

  const itemsQuery = useQuery({
    queryKey: ['daily-site-log', uid, selectedProjectId],
    queryFn: () => listDailySiteLogs(selectedProjectId!),
    enabled: Boolean(uid && selectedProjectId),
  });

  useEffect(() => {
    const list = projectsQuery.data;
    if (!list?.length) {
      setSelectedProjectId(null);
      return;
    }
    void (async () => {
      const last = await getLastSelectedProjectId();
      setSelectedProjectId((cur) => {
        if (cur && list.some((p) => p.id === cur)) return cur;
        if (last && list.some((p) => p.id === last)) return last;
        return list[0].id;
      });
    })();
  }, [projectsQuery.data]);

  useEffect(() => {
    if (selectedProjectId) void setLastSelectedProjectId(selectedProjectId);
  }, [selectedProjectId]);

  const invalidate = useCallback(() => {
    invalidateSharedProjectQueries(queryClient, uid);
    void queryClient.invalidateQueries({ queryKey: ['daily-site-log', uid] });
  }, [queryClient, uid]);

  const createProjectMut = useMutation({
    mutationFn: (n: string) => createBudgetProject(n),
    onSuccess: (p) => {
      invalidate();
      setSelectedProjectId(p.id);
      setProjectModal(false);
      setNewProjectName('');
    },
  });

  const deleteProjectMut = useMutation({
    mutationFn: (id: string) => deleteBudgetProject(id),
    onSuccess: (_, id) => {
      invalidate();
      if (selectedProjectId === id) setSelectedProjectId(null);
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!selectedProjectId) throw new Error(t('tools.daily.error.selectProject'));
      if (!logDate.trim() || !workforce.trim() || !workPerformed.trim()) {
        throw new Error(t('tools.daily.error.requiredFields'));
      }
      const base = {
        logDate: logDate.trim(),
        weatherCondition,
        weatherNotes: weatherNotes.trim(),
        workforce: workforce.trim(),
        workPerformed: workPerformed.trim(),
        deliveries: deliveries.trim(),
        visitors: visitors.trim(),
        safetyNotes: safetyNotes.trim(),
        signedBy: signedBy.trim(),
        signedDate: signedDate.trim(),
      };
      if (editingId) {
        const kept = editingPhotos.filter((_, i) => !removePhotoIndexes.includes(i));
        const photoUrls = [...kept, ...pendingUris];
        await updateDailySiteLog(selectedProjectId, editingId, { ...base, photoUrls });
      } else {
        await addDailySiteLog(selectedProjectId, { ...base, photoUrls: [...pendingUris] });
      }
    },
    onSuccess: () => {
      invalidate();
      closeForm();
    },
  });

  const deleteMut = useMutation({
    mutationFn: ({ pid, id }: { pid: string; id: string }) => deleteDailySiteLog(pid, id),
    onSuccess: invalidate,
  });

  const resetPhotoState = () => {
    setPendingUris([]);
    setRemovePhotoIndexes([]);
    setEditingPhotos([]);
  };

  const openAdd = () => {
    setEditingId(null);
    setLogDate(new Date().toISOString().slice(0, 10));
    setWeatherCondition('clear');
    setWeatherNotes('');
    setWorkforce('');
    setWorkPerformed('');
    setDeliveries('');
    setVisitors('');
    setSafetyNotes('');
    setSignedBy('');
    setSignedDate('');
    resetPhotoState();
    setFormModal(true);
  };

  const openEdit = (r: DailySiteLogEntry) => {
    setEditingId(r.id);
    setLogDate(r.logDate);
    setWeatherCondition(r.weatherCondition);
    setWeatherNotes(r.weatherNotes);
    setWorkforce(r.workforce);
    setWorkPerformed(r.workPerformed);
    setDeliveries(r.deliveries);
    setVisitors(r.visitors);
    setSafetyNotes(r.safetyNotes);
    setSignedBy(r.signedBy);
    setSignedDate(r.signedDate);
    setEditingPhotos([...r.photoUrls]);
    setPendingUris([]);
    setRemovePhotoIndexes([]);
    setFormModal(true);
  };

  const closeForm = () => {
    setFormModal(false);
    setEditingId(null);
    resetPhotoState();
  };

  const existingPhotoCount = editingId
    ? editingPhotos.length - removePhotoIndexes.length + pendingUris.length
    : pendingUris.length;

  const pickPhotos = async () => {
    const cap = MAX_DAILY_LOG_PHOTOS - existingPhotoCount;
    if (cap <= 0) {
      Alert.alert(
        t('tools.progress.limitTitle'),
        t('tools.daily.alert.maxPhotos').replace('{max}', String(MAX_DAILY_LOG_PHOTOS))
      );
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert(t('tools.progress.permissionTitle'), t('tools.progress.photoPermissionBody'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: cap,
      quality: 0.85,
    });
    if (res.canceled || !res.assets?.length) return;
    const next = [...pendingUris];
    for (const a of res.assets) {
      if (a.uri && next.length < cap) next.push(a.uri);
    }
    setPendingUris(next);
  };

  const toggleRemoveExistingPhoto = (index: number) => {
    setRemovePhotoIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="Daily Site Log" level="Basic" />
      {!uid ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            {t('tools.daily.signIn')}
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={itemsQuery.data ?? []}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={projectsQuery.isFetching || itemsQuery.isFetching}
                onRefresh={() => {
                  void projectsQuery.refetch();
                  void itemsQuery.refetch();
                }}
              />
            }
            ListHeaderComponent={
              projectsQuery.isLoading ? (
                <View className="py-8">
                  <ActivityIndicator color={Colors.brand[700]} />
                </View>
              ) : projects.length === 0 ? (
                <View className="pb-4 pt-2">
                  <Text className="mb-3 text-center text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                    {t('tools.daily.createProjectAttach')}
                  </Text>
                  <Button title={t('common.newProject')} onPress={() => setProjectModal(true)} />
                </View>
              ) : (
                <View className="pb-3">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-sm text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
                      {t('common.project')}
                    </Text>
                    <Pressable onPress={() => setProjectModal(true)} className="rounded-lg bg-brand-100 px-3 py-2">
                      <Text className="text-sm text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                        {t('tools.daily.newShort')}
                      </Text>
                    </Pressable>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row flex-wrap gap-2">
                      {projects.map((p) => (
                        <View key={p.id} className="flex-row items-center">
                          <Pressable
                            onPress={() => setSelectedProjectId(p.id)}
                            className="rounded-full border px-3 py-2"
                            style={{
                              borderColor: selectedProjectId === p.id ? Colors.brand[700] : Colors.neutral[300],
                              backgroundColor: selectedProjectId === p.id ? Colors.brand[100] : '#fff',
                            }}
                          >
                            <Text className="text-sm text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                              {p.name}
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() =>
                              Alert.alert(t('tools.daily.deleteProjectTitle'), p.name, [
                                { text: t('common.cancel'), style: 'cancel' },
                                {
                                  text: t('common.delete'),
                                  style: 'destructive',
                                  onPress: () => deleteProjectMut.mutate(p.id),
                                },
                              ])
                            }
                            className="ml-1 p-1"
                          >
                            <Ionicons name="trash-outline" size={18} color={Colors.neutral[500]} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                  <Text className="mt-2 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                    {t('tools.daily.storageHint')}
                  </Text>
                </View>
              )
            }
            ListEmptyComponent={
              projects.length === 0 || !selectedProjectId ? null : itemsQuery.isLoading ? (
                <ActivityIndicator color={Colors.brand[700]} />
              ) : (
                <Text className="py-4 text-center text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                  {t('tools.daily.empty')}
                </Text>
              )
            }
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 8 }}
            renderItem={({ item }) => (
              <View className="mb-2 rounded-2xl border border-neutral-200 bg-white p-4">
                <View className="flex-row items-start justify-between">
                  <Pressable onPress={() => openEdit(item)} className="flex-1 pr-2">
                    <Text className="text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                      {item.logDate} · {t(`tools.daily.weather.${item.weatherCondition}`)}
                    </Text>
                    <Text className="mt-1 text-base text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                      {t('tools.daily.listWorkforcePrefix')} {item.workforce}
                    </Text>
                    <Text
                      className="mt-1 text-sm text-neutral-700"
                      style={{ fontFamily: 'Inter_400Regular' }}
                      numberOfLines={4}
                    >
                      {item.workPerformed}
                    </Text>
                    {item.signedBy ? (
                      <Text className="mt-2 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                        {t('tools.daily.listSignedPrefix')} {item.signedBy}
                        {item.signedDate ? ` · ${item.signedDate}` : ''}
                      </Text>
                    ) : null}
                    {item.photoUrls.length > 0 ? (
                      <ScrollView horizontal className="mt-2" showsHorizontalScrollIndicator={false}>
                        {item.photoUrls.map((uri, i) => (
                          <Image
                            key={`${item.id}_${i}`}
                            source={{ uri }}
                            className="mr-2 h-16 w-16 rounded-lg bg-neutral-100"
                            style={{ width: 64, height: 64 }}
                          />
                        ))}
                      </ScrollView>
                    ) : null}
                  </Pressable>
                  <Pressable
                    onPress={() => deleteMut.mutate({ pid: selectedProjectId!, id: item.id })}
                    className="p-2"
                  >
                    <Ionicons name="trash-outline" size={20} color={Colors.neutral[500]} />
                  </Pressable>
                </View>
              </View>
            )}
          />
          {projects.length > 0 && selectedProjectId ? (
            <View
              className="border-t border-neutral-200 bg-white px-5 pt-3"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            >
              <Button title={t('tools.ui.newDailyLog')} onPress={openAdd} />
            </View>
          ) : null}
        </>
      )}

      <Modal visible={projectModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/40"
        >
          <Pressable className="flex-1" onPress={() => setProjectModal(false)} />
          <View className="rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <Text className="mb-2 text-lg text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
              {t('common.newProject')}
            </Text>
            <TextInput
              value={newProjectName}
              onChangeText={setNewProjectName}
              placeholder={t('tools.daily.projectNamePlaceholder')}
              className="mb-4 rounded-xl border border-neutral-300 px-3 py-3 text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
            />
            <Button
              title={t('common.create')}
              loading={createProjectMut.isPending}
              onPress={() => createProjectMut.mutate(newProjectName)}
            />
            <Pressable onPress={() => setProjectModal(false)} className="mt-3 items-center py-2">
              <Text className="text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>
                {t('common.cancel')}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={formModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/40"
        >
          <Pressable className="flex-1" onPress={closeForm} />
          <View className="max-h-[92%] rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text className="mb-2 text-lg text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
                {editingId ? t('tools.daily.editLog') : t('tools.ui.newDailyLog')}
              </Text>
              <YmdDateField label={t('tools.daily.field.logDate')} value={logDate} onChange={setLogDate} />
              <Text className="mb-2 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                {t('tools.daily.weather')}
              </Text>
              <View className="mb-3 flex-row flex-wrap gap-2">
                {WEATHER_CONDITIONS.map((w) => (
                  <Pressable
                    key={w}
                    onPress={() => setWeatherCondition(w)}
                    className="rounded-full border px-3 py-1.5"
                    style={{
                      borderColor: weatherCondition === w ? Colors.brand[700] : Colors.neutral[300],
                      backgroundColor: weatherCondition === w ? Colors.brand[100] : '#fff',
                    }}
                  >
                    <Text className="text-xs text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                      {t(`tools.daily.weather.${w}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                {t('tools.daily.field.weatherNotes')}
              </Text>
              <TextInput
                value={weatherNotes}
                onChangeText={setWeatherNotes}
                className="mb-3 rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                {t('tools.daily.field.workforce')}
              </Text>
              <TextInput
                value={workforce}
                onChangeText={setWorkforce}
                placeholder={t('tools.daily.placeholder.workforce')}
                className="mb-3 rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                {t('tools.daily.field.workPerformed')}
              </Text>
              <TextInput
                value={workPerformed}
                onChangeText={setWorkPerformed}
                multiline
                className="mb-3 min-h-[100px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                {t('tools.daily.field.deliveries')}
              </Text>
              <TextInput
                value={deliveries}
                onChangeText={setDeliveries}
                multiline
                className="mb-3 min-h-[60px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Visitors (optional)
              </Text>
              <TextInput
                value={visitors}
                onChangeText={setVisitors}
                multiline
                className="mb-3 min-h-[60px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                {t('tools.daily.field.safety')}
              </Text>
              <TextInput
                value={safetyNotes}
                onChangeText={setSafetyNotes}
                multiline
                className="mb-3 min-h-[60px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                {t('tools.daily.field.signedBy')}
              </Text>
              <TextInput
                value={signedBy}
                onChangeText={setSignedBy}
                className="mb-3 rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <YmdDateField
                label={t('tools.daily.field.signedDate')}
                value={signedDate}
                onChange={setSignedDate}
                optional
              />
              {TOOL_PHOTO_UPLOAD_ENABLED ? (
                <>
                  <Text className="mb-2 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                    {t('tools.daily.photosCount')
                      .replace('{current}', String(existingPhotoCount))
                      .replace('{max}', String(MAX_DAILY_LOG_PHOTOS))}
                  </Text>
                  {editingId ? (
                    <ScrollView horizontal className="mb-2" showsHorizontalScrollIndicator={false}>
                      {editingPhotos.map((uri, index) => {
                        const marked = removePhotoIndexes.includes(index);
                        return (
                          <Pressable
                            key={`ex_${index}`}
                            onPress={() => toggleRemoveExistingPhoto(index)}
                            className="mr-2"
                          >
                            <Image
                              source={{ uri }}
                              style={{ width: 72, height: 72, opacity: marked ? 0.35 : 1 }}
                              className="rounded-lg bg-neutral-100"
                            />
                            {marked ? (
                              <View className="absolute inset-0 items-center justify-center">
                                <Ionicons name="close-circle" size={28} color={Colors.danger[600]} />
                              </View>
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  ) : null}
                  {pendingUris.length > 0 ? (
                    <ScrollView horizontal className="mb-2" showsHorizontalScrollIndicator={false}>
                      {pendingUris.map((uri, i) => (
                        <Image
                          key={`p_${i}`}
                          source={{ uri }}
                          style={{ width: 72, height: 72 }}
                          className="mr-2 rounded-lg bg-neutral-100"
                        />
                      ))}
                    </ScrollView>
                  ) : null}
                  <Pressable
                    onPress={pickPhotos}
                    className="mb-4 flex-row items-center self-start rounded-xl border border-dashed border-neutral-300 px-3 py-2"
                  >
                    <Ionicons name="images-outline" size={20} color={Colors.brand[700]} />
                    <Text className="ml-2 text-sm text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                      {t('tools.action.addPhotos')}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <View className="mb-4">
                  <View className="mb-2 flex-row items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
                    <Ionicons name="images-outline" size={20} color={Colors.neutral[500]} />
                    <Text className="flex-1 text-sm text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                      {t('tools.photoUploadSoon')}
                    </Text>
                  </View>
                  {editingId && editingPhotos.length > 0 ? (
                    <ScrollView horizontal className="mb-1" showsHorizontalScrollIndicator={false}>
                      {editingPhotos.map((uri, index) => (
                        <Image
                          key={`ro_${index}`}
                          source={{ uri }}
                          style={{ width: 72, height: 72 }}
                          className="mr-2 rounded-lg bg-neutral-100"
                        />
                      ))}
                    </ScrollView>
                  ) : null}
                  <Text className="text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                    {t('tools.photoUploadSoonNote')}
                  </Text>
                </View>
              )}
            </ScrollView>
            <Button
              title={t('common.save')}
              loading={saveMut.isPending}
              onPress={() => {
                saveMut.mutate(undefined, {
                  onError: (e) =>
                    Alert.alert(
                      t('tools.daily.alert.checkForm'),
                      e instanceof Error ? e.message : t('tools.daily.alert.invalid')
                    ),
                });
              }}
            />
            <Pressable onPress={closeForm} className="mt-3 items-center py-2">
              <Text className="text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>
                {t('common.cancel')}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
