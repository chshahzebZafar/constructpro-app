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
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/store/useAuthStore';
import {
  addBimLink,
  createBudgetProject,
  deleteBudgetProject,
  deleteBimLink,
  getLastSelectedProjectId,
  listBimLinks,
  listBudgetProjects,
  setLastSelectedProjectId,
  updateBimLink,
} from '@/lib/bimViewer/repository';
import type { BimLink } from '@/lib/bimViewer/types';
import { invalidateSharedProjectQueries } from '@/lib/query/invalidateSharedProjectQueries';
import { useI18n } from '@/hooks/useI18n';

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function BimViewerScreen() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectModal, setProjectModal] = useState(false);
  const [formModal, setFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');

  const projectsQuery = useQuery({
    queryKey: ['budget-projects', uid],
    queryFn: listBudgetProjects,
    enabled: Boolean(uid),
  });
  const projects = projectsQuery.data ?? [];

  const linksQuery = useQuery({
    queryKey: ['bim-viewer', uid, selectedProjectId],
    queryFn: () => listBimLinks(selectedProjectId!),
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
    void queryClient.invalidateQueries({ queryKey: ['bim-viewer', uid] });
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
      if (!selectedProjectId) throw new Error(t('tools.bim.error.selectProject'));
      if (!title.trim() || !url.trim()) throw new Error(t('tools.bim.error.titleUrl'));
      const u = url.trim();
      if (!isHttpUrl(u)) throw new Error(t('tools.bim.error.urlScheme'));
      const row = { title: title.trim(), url: u, notes: notes.trim() };
      if (editingId) await updateBimLink(selectedProjectId, editingId, row);
      else await addBimLink(selectedProjectId, row);
    },
    onSuccess: () => {
      invalidate();
      closeForm();
    },
  });

  const deleteMut = useMutation({
    mutationFn: ({ pid, id }: { pid: string; id: string }) => deleteBimLink(pid, id),
    onSuccess: invalidate,
  });

  const openAdd = () => {
    setEditingId(null);
    setTitle('');
    setUrl('https://');
    setNotes('');
    setFormModal(true);
  };

  const openEdit = (l: BimLink) => {
    setEditingId(l.id);
    setTitle(l.title);
    setUrl(l.url);
    setNotes(l.notes);
    setFormModal(true);
  };

  const closeForm = () => {
    setFormModal(false);
    setEditingId(null);
  };

  const openInBrowser = async (href: string) => {
    try {
      await WebBrowser.openBrowserAsync(href);
    } catch {
      Alert.alert(t('tools.bim.error.openLinkTitle'), t('tools.bim.error.openLinkBody'));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="BIM viewer" level="Advanced" />
      {!uid ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            {t('tools.bim.signInLinks')}
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={linksQuery.data ?? []}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={projectsQuery.isFetching || linksQuery.isFetching}
                onRefresh={() => {
                  void projectsQuery.refetch();
                  void linksQuery.refetch();
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
                    {t('tools.bim.createProjectFirst')}
                  </Text>
                  <Button title={t('common.newProject')} onPress={() => setProjectModal(true)} />
                </View>
              ) : (
                <View className="pb-3">
                  <View className="mb-3 rounded-2xl border border-neutral-200 bg-white p-4">
                    <Text className="text-sm text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
                      {t('tools.bim.aboutTitle')}
                    </Text>
                    <Text className="mt-2 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                      {t('tools.bim.aboutBody')}
                    </Text>
                  </View>
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
                              Alert.alert(t('tools.ui.deleteProjectQuestion'), p.name, [
                                { text: t('common.cancel'), style: 'cancel' },
                                { text: t('common.delete'), style: 'destructive', onPress: () => deleteProjectMut.mutate(p.id) },
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
                </View>
              )
            }
            ListEmptyComponent={
              projects.length === 0 || !selectedProjectId ? null : linksQuery.isLoading ? (
                <ActivityIndicator color={Colors.brand[700]} />
              ) : (
                <Text className="py-4 text-center text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                  {t('tools.bim.emptyLinks')}
                </Text>
              )
            }
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 8 }}
            renderItem={({ item }) => (
              <View className="mb-2 rounded-2xl border border-neutral-200 bg-white p-4">
                <View className="flex-row items-start justify-between">
                  <Pressable onPress={() => openEdit(item)} className="mr-2 flex-1">
                    <Text className="text-base text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                      {item.title}
                    </Text>
                    <Text
                      className="mt-1 text-xs text-brand-700"
                      style={{ fontFamily: 'Inter_400Regular' }}
                      numberOfLines={2}
                    >
                      {item.url}
                    </Text>
                    {item.notes ? (
                      <Text className="mt-2 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                        {item.notes}
                      </Text>
                    ) : null}
                  </Pressable>
                  <View className="flex-row items-center">
                    <Pressable onPress={() => openInBrowser(item.url)} className="p-2" accessibilityLabel={t('tools.bim.a11y.openLink')}>
                      <Ionicons name="open-outline" size={22} color={Colors.brand[700]} />
                    </Pressable>
                    <Pressable
                      onPress={() => deleteMut.mutate({ pid: selectedProjectId!, id: item.id })}
                      className="p-2"
                    >
                      <Ionicons name="trash-outline" size={20} color={Colors.neutral[500]} />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          />
          {projects.length > 0 && selectedProjectId ? (
            <View
              className="border-t border-neutral-200 bg-white px-5 pt-3"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            >
              <Button title={t('tools.ui.addViewerLink')} onPress={openAdd} />
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
          <View className="rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <Text className="mb-2 text-lg text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
              {editingId ? t('tools.bim.editLink') : t('tools.bim.newViewerLink')}
            </Text>
            <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
              {t('tools.bim.field.title')}
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('tools.bim.placeholder.titleExample')}
              className="mb-3 rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
            />
            <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
              {t('tools.bim.field.url')}
            </Text>
            <TextInput
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              className="mb-3 rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
            />
            <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
              {t('tools.bim.field.notesOptional')}
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              className="mb-4 min-h-[72px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
            />
            <Button
              title={t('common.save')}
              loading={saveMut.isPending}
              onPress={() => {
                saveMut.mutate(undefined, {
                  onError: (e) =>
                    Alert.alert(t('tools.daily.alert.checkForm'), e instanceof Error ? e.message : t('tools.daily.alert.invalid')),
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
