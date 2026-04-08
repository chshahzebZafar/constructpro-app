import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Modal,
  Pressable,
  FlatList,
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
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/store/useAuthStore';
import {
  MAX_PUNCH_PHOTOS,
} from '@/lib/punchList/storageUpload';
import {
  createBudgetProject,
  createPunchItem,
  deleteBudgetProject,
  deletePunchItem,
  getLastSelectedProjectId,
  getPunchStorageMode,
  listBudgetProjects,
  listPunchItems,
  setLastSelectedProjectId,
  updatePunchItem,
} from '@/lib/punchList/repository';
import type { BudgetProject } from '@/lib/budget/types';
import {
  PUNCH_STATUSES,
  PUNCH_STATUS_LABELS,
  type PunchItem,
  type PunchStatus,
} from '@/lib/punchList/types';
import { invalidateSharedProjectQueries } from '@/lib/query/invalidateSharedProjectQueries';
import { TOOL_PHOTO_UPLOAD_ENABLED } from '@/lib/tools/featureFlags';
import { useI18n } from '@/hooks/useI18n';
import { localizeKnownUiText } from '@/lib/i18n/toolUiText';

type StatusFilter = 'all' | PunchStatus;

export default function PunchListScreen() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');
  const storageMode = getPunchStorageMode();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [projectModal, setProjectModal] = useState(false);
  const [itemModal, setItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PunchItem | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState<PunchStatus>('open');
  const [pendingUris, setPendingUris] = useState<string[]>([]);
  const [pendingMimes, setPendingMimes] = useState<string[]>([]);
  const [removePhotoIndexes, setRemovePhotoIndexes] = useState<number[]>([]);

  const projectsQuery = useQuery({
    queryKey: ['budget-projects', uid],
    queryFn: listBudgetProjects,
    enabled: Boolean(uid),
  });

  const projects = projectsQuery.data ?? [];

  const itemsQuery = useQuery({
    queryKey: ['punch-items', uid, selectedProjectId],
    queryFn: () => listPunchItems(selectedProjectId!),
    enabled: Boolean(uid && selectedProjectId),
  });

  const items = itemsQuery.data ?? [];
  const filteredItems = useMemo(() => {
    if (statusFilter === 'all') return items;
    return items.filter((i) => i.status === statusFilter);
  }, [items, statusFilter]);

  useEffect(() => {
    const list = projectsQuery.data;
    if (!list || list.length === 0) {
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

  const invalidatePunch = useCallback(() => {
    invalidateSharedProjectQueries(queryClient, uid);
    void queryClient.invalidateQueries({ queryKey: ['punch-items', uid] });
  }, [queryClient, uid]);

  const createProjectMut = useMutation({
    mutationFn: (name: string) => createBudgetProject(name),
    onSuccess: (p) => {
      invalidatePunch();
      setSelectedProjectId(p.id);
      setProjectModal(false);
      setNewProjectName('');
    },
  });

  const deleteProjectMut = useMutation({
    mutationFn: (id: string) => deleteBudgetProject(id),
    onSuccess: (_, id) => {
      invalidatePunch();
      if (selectedProjectId === id) setSelectedProjectId(null);
    },
  });

  const saveItemMut = useMutation({
    mutationFn: async () => {
      if (!selectedProjectId) throw new Error(t('tools.permit.selectProject'));
      if (editingItem) {
        await updatePunchItem(
          selectedProjectId,
          editingItem.id,
          { title, detail, status, assignee },
          {
            newLocalPhotoUris: pendingUris,
            mimeTypes: pendingMimes,
            removePhotoIndexes: removePhotoIndexes,
          }
        );
      } else {
        await createPunchItem(
          selectedProjectId,
          { title, detail, status, assignee },
          { localPhotoUris: pendingUris, mimeTypes: pendingMimes }
        );
      }
    },
    onSuccess: () => {
      invalidatePunch();
      closeItemModal();
    },
  });

  const deleteItemMut = useMutation({
    mutationFn: ({ projectId, itemId }: { projectId: string; itemId: string }) =>
      deletePunchItem(projectId, itemId),
    onSuccess: invalidatePunch,
  });

  const openAdd = () => {
    setEditingItem(null);
    setTitle('');
    setDetail('');
    setAssignee('');
    setStatus('open');
    setPendingUris([]);
    setPendingMimes([]);
    setRemovePhotoIndexes([]);
    setItemModal(true);
  };

  const openEdit = (item: PunchItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setDetail(item.detail);
    setAssignee(item.assignee);
    setStatus(item.status);
    setPendingUris([]);
    setPendingMimes([]);
    setRemovePhotoIndexes([]);
    setItemModal(true);
  };

  const closeItemModal = () => {
    setItemModal(false);
    setEditingItem(null);
    setPendingUris([]);
    setPendingMimes([]);
    setRemovePhotoIndexes([]);
  };

  const pickPhotos = async () => {
    if (!TOOL_PHOTO_UPLOAD_ENABLED) return;
    const existingCount = editingItem
      ? editingItem.photoUrls.length - removePhotoIndexes.length + pendingUris.length
      : pendingUris.length;
    const cap = MAX_PUNCH_PHOTOS - existingCount;
    if (cap <= 0) {
      Alert.alert(
        t('tools.progress.limitTitle'),
        t('tools.punch.maxPhotosPerItem').replace('{max}', String(MAX_PUNCH_PHOTOS))
      );
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert(t('tools.punch.photoPermissionTitle'), t('tools.punch.photoPermissionBody'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: cap,
      quality: 0.85,
    });
    if (res.canceled || !res.assets?.length) return;
    const nextUris = [...pendingUris];
    const nextMimes = [...pendingMimes];
    for (const a of res.assets) {
      if (a.uri && nextUris.length < cap) {
        nextUris.push(a.uri);
        nextMimes.push(a.mimeType ?? 'image/jpeg');
      }
    }
    setPendingUris(nextUris);
    setPendingMimes(nextMimes);
  };

  const toggleRemoveExistingPhoto = (index: number) => {
    setRemovePhotoIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const confirmDeleteProject = (p: BudgetProject) => {
    Alert.alert(
      t('tools.punch.deleteProjectTitle'),
      t('tools.punch.deleteProjectMessage').replace('{name}', p.name),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteProjectMut.mutate(p.id),
        },
      ]
    );
  };

  const confirmDeleteItem = (item: PunchItem) => {
    if (!selectedProjectId) return;
    Alert.alert(t('tools.punch.deleteItemTitle'), t('tools.punch.deleteItemBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => deleteItemMut.mutate({ projectId: selectedProjectId, itemId: item.id }),
      },
    ]);
  };

  const header = (
    <View className="pb-2">
      <Text className="mb-3 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
        {storageMode === 'cloud' ? t('tools.punch.storageCloud') : t('tools.punch.storageDevice')}
      </Text>
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-sm text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
          {t('common.project')}
        </Text>
        <Pressable
          onPress={() => setProjectModal(true)}
          className="flex-row items-center rounded-lg bg-brand-100 px-3 py-2"
        >
          <Ionicons name="add" size={18} color={Colors.brand[900]} />
          <Text className="ml-1 text-sm text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
            {t('home.quickNotes.newShort')}
          </Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
        <View className="flex-row flex-wrap gap-2">
          {projects.map((p) => {
            const active = p.id === selectedProjectId;
            return (
              <View key={p.id} className="flex-row items-center">
                <Pressable
                  onPress={() => setSelectedProjectId(p.id)}
                  className="rounded-full border px-3 py-2"
                  style={{
                    borderColor: active ? Colors.brand[700] : Colors.neutral[300],
                    backgroundColor: active ? Colors.brand[100] : Colors.white,
                  }}
                >
                  <Text
                    className="text-sm text-brand-900"
                    style={{ fontFamily: 'Inter_500Medium' }}
                    numberOfLines={1}
                  >
                    {p.name}
                  </Text>
                </Pressable>
                <Pressable onPress={() => confirmDeleteProject(p)} hitSlop={8} className="ml-1 p-1">
                  <Ionicons name="trash-outline" size={18} color={Colors.neutral[500]} />
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <Text className="mb-2 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
        {t('tools.punch.statusFilter')}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
        <View className="flex-row gap-2">
          {(['all', ...PUNCH_STATUSES] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => setStatusFilter(f)}
              className="rounded-full border px-3 py-1.5"
              style={{
                borderColor: statusFilter === f ? Colors.brand[700] : Colors.neutral[300],
                backgroundColor: statusFilter === f ? Colors.brand[100] : Colors.white,
              }}
            >
              <Text className="text-xs text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                {f === 'all' ? t('tools.punch.filterAll') : localizeKnownUiText(t, PUNCH_STATUS_LABELS[f])}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="Punch list" level="Advanced" />
      {!uid ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            {t('tools.punch.signIn')}
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={filteredItems}
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
                <View className="items-center py-8">
                  <ActivityIndicator color={Colors.brand[700]} />
                </View>
              ) : projects.length === 0 ? (
                <View className="px-5 pt-4">
                  <Text className="mb-4 text-center text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                    Create a project (shared with Budget tracker), then add snags with photos.
                  </Text>
                  <Button title="Create project" onPress={() => setProjectModal(true)} />
                </View>
              ) : (
                header
              )
            }
            ListEmptyComponent={
              projects.length === 0 ? null : itemsQuery.isLoading && selectedProjectId ? (
                <View className="py-6">
                  <ActivityIndicator color={Colors.brand[700]} />
                </View>
              ) : selectedProjectId ? (
                <Text
                  className="px-5 pt-2 text-center text-sm text-neutral-500"
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
                  {items.length === 0 ? t('tools.punch.emptyNone') : t('tools.punch.emptyFilter')}
                </Text>
              ) : null
            }
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 8 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => openEdit(item)}
                className="mb-2 rounded-2xl border border-neutral-200 bg-white p-4 active:opacity-90"
              >
                <View className="flex-row items-start justify-between">
                  <View className="mr-2 flex-1">
                    <View className="mb-1 flex-row flex-wrap items-center gap-2">
                      <Text
                        className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-700"
                        style={{ fontFamily: 'Inter_500Medium' }}
                      >
                        {localizeKnownUiText(t, PUNCH_STATUS_LABELS[item.status])}
                      </Text>
                      {item.assignee ? (
                        <Text className="text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                          {item.assignee}
                        </Text>
                      ) : null}
                    </View>
                    <Text className="text-base text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                      {item.title}
                    </Text>
                    {item.detail ? (
                      <Text
                        className="mt-1 text-sm text-neutral-600"
                        style={{ fontFamily: 'Inter_400Regular' }}
                        numberOfLines={3}
                      >
                        {item.detail}
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
                  </View>
                  <Pressable onPress={() => confirmDeleteItem(item)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={20} color={Colors.neutral[500]} />
                  </Pressable>
                </View>
              </Pressable>
            )}
          />
          {projects.length > 0 && selectedProjectId ? (
            <View
              className="border-t border-neutral-200 bg-white px-5 pt-3"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            >
              <Button title="Add punch item" onPress={openAdd} />
            </View>
          ) : null}
        </>
      )}

      <Modal visible={projectModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/40"
        >
          <Pressable className="flex-1" onPress={() => setProjectModal(false)} />
          <View className="rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <Text className="mb-3 text-lg text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
              {t('common.newProject')}
            </Text>
            <TextInput
              value={newProjectName}
              onChangeText={setNewProjectName}
              placeholder={t('tools.budget.projectPlaceholder')}
              className="mb-4 min-h-[48px] rounded-xl border border-neutral-300 px-3 text-neutral-900"
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

      <Modal visible={itemModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/40"
        >
          <Pressable className="flex-1" onPress={closeItemModal} />
          <View className="max-h-[90%] rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <Text className="mb-3 text-lg text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
              {editingItem
                ? localizeKnownUiText(t, 'Edit item')
                : localizeKnownUiText(t, 'New punch item')}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text className="mb-1 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                {localizeKnownUiText(t, 'Title')}
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={localizeKnownUiText(t, 'Short description of the snag')}
                className="mb-3 min-h-[44px] rounded-xl border border-neutral-300 px-3 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                {localizeKnownUiText(t, 'Detail')}
              </Text>
              <TextInput
                value={detail}
                onChangeText={setDetail}
                placeholder={localizeKnownUiText(t, 'Location, spec reference, etc.')}
                multiline
                className="mb-3 min-h-[80px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                {localizeKnownUiText(t, 'Assignee')}
              </Text>
              <TextInput
                value={assignee}
                onChangeText={setAssignee}
                placeholder={localizeKnownUiText(t, 'Name or trade')}
                className="mb-3 min-h-[44px] rounded-xl border border-neutral-300 px-3 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-2 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                {localizeKnownUiText(t, 'Status')}
              </Text>
              <View className="mb-3 flex-row flex-wrap gap-2">
                {PUNCH_STATUSES.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setStatus(s)}
                    className="rounded-full border px-3 py-1.5"
                    style={{
                      borderColor: status === s ? Colors.brand[700] : Colors.neutral[300],
                      backgroundColor: status === s ? Colors.brand[100] : Colors.white,
                    }}
                  >
                    <Text className="text-xs text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                      {localizeKnownUiText(t, PUNCH_STATUS_LABELS[s])}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {TOOL_PHOTO_UPLOAD_ENABLED ? (
                <>
                  <Text className="mb-2 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                    {localizeKnownUiText(t, 'Photos')} (
                    {editingItem
                      ? editingItem.photoUrls.length - removePhotoIndexes.length + pendingUris.length
                      : pendingUris.length}
                    /{MAX_PUNCH_PHOTOS})
                  </Text>
                  {editingItem ? (
                    <ScrollView horizontal className="mb-2" showsHorizontalScrollIndicator={false}>
                      {editingItem.photoUrls.map((uri, index) => {
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
                  {editingItem && editingItem.photoUrls.length > 0 ? (
                    <ScrollView horizontal className="mb-1" showsHorizontalScrollIndicator={false}>
                      {editingItem.photoUrls.map((uri, index) => (
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
              title={
                editingItem
                  ? localizeKnownUiText(t, 'Save')
                  : localizeKnownUiText(t, 'Add item')
              }
              loading={saveItemMut.isPending}
              onPress={() => {
                if (!title.trim()) {
                  Alert.alert(
                    localizeKnownUiText(t, 'Title'),
                    localizeKnownUiText(t, 'Enter a title.')
                  );
                  return;
                }
                saveItemMut.mutate();
              }}
            />
            <Pressable onPress={closeItemModal} className="mt-3 items-center py-2">
              <Text className="text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>
                {localizeKnownUiText(t, 'Cancel')}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
