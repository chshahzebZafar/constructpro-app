import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { YmdDateField } from '@/components/forms/YmdDateField';
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/store/useAuthStore';
import { barLayout, computeTimelineWindow } from '@/lib/gantt/layout';
import type { GanttBar } from '@/lib/gantt/types';
import {
  addGanttBar,
  createBudgetProject,
  deleteBudgetProject,
  deleteGanttBar,
  getLastSelectedProjectId,
  listBudgetProjects,
  listGanttBars,
  setLastSelectedProjectId,
  updateGanttBar,
} from '@/lib/gantt/repository';
import { invalidateSharedProjectQueries } from '@/lib/query/invalidateSharedProjectQueries';
import { useI18n } from '@/hooks/useI18n';

export default function GanttScreen() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectModal, setProjectModal] = useState(false);
  const [formModal, setFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  const projectsQuery = useQuery({
    queryKey: ['budget-projects', uid],
    queryFn: listBudgetProjects,
    enabled: Boolean(uid),
  });
  const projects = projectsQuery.data ?? [];

  const itemsQuery = useQuery({
    queryKey: ['gantt', uid, selectedProjectId],
    queryFn: () => listGanttBars(selectedProjectId!),
    enabled: Boolean(uid && selectedProjectId),
  });

  const items = itemsQuery.data ?? [];

  const timeline = useMemo(() => computeTimelineWindow(items), [items]);

  const invalidate = useCallback(() => {
    invalidateSharedProjectQueries(queryClient, uid);
    void queryClient.invalidateQueries({ queryKey: ['gantt', uid] });
  }, [queryClient, uid]);

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
      if (!selectedProjectId) throw new Error(t('tools.permit.selectProject'));
      if (!name.trim() || !startDate.trim() || !endDate.trim()) {
        throw new Error(t('tools.gantt.validation.enterNameStartEnd'));
      }
      if (startDate.trim() > endDate.trim()) {
        throw new Error(t('tools.gantt.validation.startBeforeEnd'));
      }
      const row = {
        name: name.trim(),
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        notes: notes.trim(),
      };
      if (editingId) await updateGanttBar(selectedProjectId, editingId, row);
      else await addGanttBar(selectedProjectId, row);
    },
    onSuccess: () => {
      invalidate();
      closeForm();
    },
  });

  const deleteMut = useMutation({
    mutationFn: ({ pid, id }: { pid: string; id: string }) => deleteGanttBar(pid, id),
    onSuccess: invalidate,
  });

  const openAdd = () => {
    setEditingId(null);
    const t = new Date().toISOString().slice(0, 10);
    setName('');
    setStartDate(t);
    setEndDate(t);
    setNotes('');
    setFormModal(true);
  };

  const openEdit = (b: GanttBar) => {
    setEditingId(b.id);
    setName(b.name);
    setStartDate(b.startDate);
    setEndDate(b.endDate);
    setNotes(b.notes);
    setFormModal(true);
  };

  const closeForm = () => {
    setFormModal(false);
    setEditingId(null);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="Gantt / Timeline" level="Mid" />
      {!uid ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            {t('tools.ui.signInScheduleView')}
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
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
                    {t('tools.ui.createProjectTimelineBars')}
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
                        {t('tools.ui.plusNew')}
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
                  {timeline ? (
                    <Text className="mt-3 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                      {t('tools.ui.timelineWindow')} {timeline.min} → {timeline.max} ({timeline.spanDays}{' '}
                      {t('tools.ui.calendarDays')})
                    </Text>
                  ) : null}
                  <Text className="mt-2 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                    {t('tools.ui.barsPositionalOnly')}
                  </Text>
                </View>
              )
            }
            ListEmptyComponent={
              projects.length === 0 || !selectedProjectId ? null : itemsQuery.isLoading ? (
                <ActivityIndicator color={Colors.brand[700]} />
              ) : (
                <Text className="py-4 text-center text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                  {t('tools.ui.noBarsYet')}
                </Text>
              )
            }
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 8 }}
            renderItem={({ item }) => {
              const lay = timeline ? barLayout(item, timeline.min, timeline.spanDays) : { leftPct: 0, widthPct: 100 };
              return (
                <Pressable
                  onPress={() => openEdit(item)}
                  className="mb-3 rounded-2xl border border-neutral-200 bg-white p-3 active:opacity-90"
                >
                  <View className="mb-2 flex-row items-start justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="text-base text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                        {item.name}
                      </Text>
                      <Text className="text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                        {item.startDate} → {item.endDate}
                      </Text>
                      {item.notes ? (
                        <Text
                          className="mt-1 text-xs text-neutral-500"
                          style={{ fontFamily: 'Inter_400Regular' }}
                          numberOfLines={2}
                        >
                          {item.notes}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => deleteMut.mutate({ pid: selectedProjectId!, id: item.id })}
                      className="p-2"
                    >
                      <Ionicons name="trash-outline" size={20} color={Colors.neutral[500]} />
                    </Pressable>
                  </View>
                  {timeline ? (
                    <View className="h-9 justify-center">
                      <View className="relative h-3 w-full overflow-hidden rounded-full bg-neutral-200">
                        <View
                          style={{
                            position: 'absolute',
                            left: `${lay.leftPct}%`,
                            width: `${lay.widthPct}%`,
                            top: 0,
                            bottom: 0,
                            backgroundColor: Colors.brand[500],
                            borderRadius: 4,
                          }}
                        />
                      </View>
                    </View>
                  ) : null}
                </Pressable>
              );
            }}
          />
          {projects.length > 0 && selectedProjectId ? (
            <View
              className="border-t border-neutral-200 bg-white px-5 pt-3"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            >
              <Button title={t('tools.ui.addBar')} onPress={openAdd} />
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
              placeholder={t('tools.ui.name')}
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
          <View className="max-h-[85%] rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text className="mb-2 text-lg text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
                {editingId ? t('tools.ui.editBar') : t('tools.ui.newBar')}
              </Text>
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                {t('tools.ui.name')}
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('tools.ui.exampleFoundationPour')}
                className="mb-3 rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <YmdDateField label={t('tools.gantt.start')} value={startDate} onChange={setStartDate} />
              <YmdDateField label={t('tools.gantt.end')} value={endDate} onChange={setEndDate} />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                {t('tools.ui.notesDependenciesLinks')}
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder={t('tools.ui.manualNotesCpm')}
                className="mb-4 min-h-[72px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
            </ScrollView>
            <Button
              title={t('common.save')}
              loading={saveMut.isPending}
              onPress={() => {
                saveMut.mutate(undefined, {
                  onError: (e) =>
                    Alert.alert(t('tools.ui.checkForm'), e instanceof Error ? e.message : t('tools.ui.invalid')),
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
