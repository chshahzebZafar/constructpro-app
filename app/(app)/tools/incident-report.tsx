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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { YmdDateField } from '@/components/forms/YmdDateField';
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/store/useAuthStore';
import { exportIncidentReportPdf } from '@/lib/pdf/generateIncidentPdf';
import {
  addIncident,
  createBudgetProject,
  deleteBudgetProject,
  deleteIncident,
  getLastSelectedProjectId,
  listBudgetProjects,
  listIncidents,
  setLastSelectedProjectId,
  updateIncident,
} from '@/lib/incidents/repository';
import { INCIDENT_CATEGORIES, type IncidentCategory, type IncidentReport } from '@/lib/incidents/types';
import { invalidateSharedProjectQueries } from '@/lib/query/invalidateSharedProjectQueries';
import { useI18n } from '@/hooks/useI18n';

export default function IncidentReportScreen() {
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
  const [siteLocation, setSiteLocation] = useState('');
  const [dateOccurred, setDateOccurred] = useState('');
  const [timeOccurred, setTimeOccurred] = useState('');
  const [category, setCategory] = useState<IncidentCategory>('near_miss');
  const [description, setDescription] = useState('');
  const [immediateActions, setImmediateActions] = useState('');
  const [witnesses, setWitnesses] = useState('');
  const [reportedBy, setReportedBy] = useState('');
  const [exportingId, setExportingId] = useState<string | null>(null);

  const projectsQuery = useQuery({
    queryKey: ['budget-projects', uid],
    queryFn: listBudgetProjects,
    enabled: Boolean(uid),
  });
  const projects = projectsQuery.data ?? [];
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const itemsQuery = useQuery({
    queryKey: ['incidents', uid, selectedProjectId],
    queryFn: () => listIncidents(selectedProjectId!),
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
    void queryClient.invalidateQueries({ queryKey: ['incidents', uid] });
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
      if (!selectedProjectId) throw new Error(t('tools.incident.error.selectProject'));
      if (!title.trim() || !siteLocation.trim() || !dateOccurred.trim() || !description.trim() || !reportedBy.trim()) {
        throw new Error(t('tools.incident.error.requiredFields'));
      }
      const row = {
        title: title.trim(),
        siteLocation: siteLocation.trim(),
        dateOccurred: dateOccurred.trim(),
        timeOccurred: timeOccurred.trim(),
        category,
        description: description.trim(),
        immediateActions: immediateActions.trim(),
        witnesses: witnesses.trim(),
        reportedBy: reportedBy.trim(),
      };
      if (editingId) await updateIncident(selectedProjectId, editingId, row);
      else await addIncident(selectedProjectId, row);
    },
    onSuccess: () => {
      invalidate();
      closeForm();
    },
  });

  const deleteMut = useMutation({
    mutationFn: ({ pid, id }: { pid: string; id: string }) => deleteIncident(pid, id),
    onSuccess: invalidate,
  });

  const openAdd = () => {
    setEditingId(null);
    setTitle('');
    setSiteLocation('');
    setDateOccurred(new Date().toISOString().slice(0, 10));
    setTimeOccurred('');
    setCategory('near_miss');
    setDescription('');
    setImmediateActions('');
    setWitnesses('');
    setReportedBy('');
    setFormModal(true);
  };

  const openEdit = (r: IncidentReport) => {
    setEditingId(r.id);
    setTitle(r.title);
    setSiteLocation(r.siteLocation);
    setDateOccurred(r.dateOccurred);
    setTimeOccurred(r.timeOccurred);
    setCategory(r.category);
    setDescription(r.description);
    setImmediateActions(r.immediateActions);
    setWitnesses(r.witnesses);
    setReportedBy(r.reportedBy);
    setFormModal(true);
  };

  const closeForm = () => {
    setFormModal(false);
    setEditingId(null);
  };

  const exportPdf = async (r: IncidentReport) => {
    if (!selectedProject) return;
    setExportingId(r.id);
    try {
      await exportIncidentReportPdf(r, selectedProject.name);
    } finally {
      setExportingId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="Incident report" level="Basic" />
      {!uid ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            {t('tools.incident.signIn')}
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
                    {t('tools.incident.createProjectFirst')}
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
                  <Text className="mt-2 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                    On-device storage · PDF export for sharing
                  </Text>
                </View>
              )
            }
            ListEmptyComponent={
              projects.length === 0 || !selectedProjectId ? null : itemsQuery.isLoading ? (
                <ActivityIndicator color={Colors.brand[700]} />
              ) : (
                <Text className="py-4 text-center text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                  {t('tools.incident.empty')}
                </Text>
              )
            }
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 8 }}
            renderItem={({ item }) => (
              <View className="mb-2 rounded-2xl border border-neutral-200 bg-white p-4">
                <View className="flex-row items-start justify-between">
                  <Pressable onPress={() => openEdit(item)} className="flex-1 pr-2">
                    <Text
                      className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-800"
                      style={{ fontFamily: 'Inter_500Medium' }}
                    >
                      {t(`tools.incident.category.${item.category}`)}
                    </Text>
                    <Text className="mt-1 text-base text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                      {item.title}
                    </Text>
                    <Text className="text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                      {item.dateOccurred} · {item.siteLocation}
                    </Text>
                  </Pressable>
                  <View className="flex-row items-center gap-1">
                    <Pressable
                      onPress={() => exportPdf(item)}
                      disabled={exportingId === item.id}
                      className="p-2"
                      accessibilityLabel={t('tools.incident.exportPdfA11y')}
                    >
                      {exportingId === item.id ? (
                        <ActivityIndicator size="small" color={Colors.brand[700]} />
                      ) : (
                        <Ionicons name="share-outline" size={22} color={Colors.brand[700]} />
                      )}
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
              <Button title={t('tools.incident.newReport')} onPress={openAdd} />
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
            <Button title={t('common.create')} loading={createProjectMut.isPending} onPress={() => createProjectMut.mutate(newProjectName)} />
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
                {editingId ? t('tools.incident.editReport') : t('tools.incident.newReport')}
              </Text>
              {[
                [t('tools.incident.field.title'), title, setTitle],
                [t('tools.incident.field.siteLocation'), siteLocation, setSiteLocation],
              ].map(([label, val, set]) => (
                <View key={String(label)} className="mb-3">
                  <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                    {label as string}
                  </Text>
                  <TextInput
                    value={val as string}
                    onChangeText={set as (t: string) => void}
                    className="rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                    style={{ fontFamily: 'Inter_400Regular' }}
                  />
                </View>
              ))}
              <YmdDateField label={t('tools.incident.field.date')} value={dateOccurred} onChange={setDateOccurred} />
              <View className="mb-3">
                <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                  {t('tools.incident.field.timeOptional')}
                </Text>
                <TextInput
                  value={timeOccurred}
                  onChangeText={setTimeOccurred}
                  className="rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                  style={{ fontFamily: 'Inter_400Regular' }}
                />
              </View>
              <Text className="mb-2 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                {t('tools.incident.field.category')}
              </Text>
              <View className="mb-3 flex-row flex-wrap gap-2">
                {INCIDENT_CATEGORIES.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    className="rounded-full border px-3 py-1.5"
                    style={{
                      borderColor: category === c ? Colors.brand[700] : Colors.neutral[300],
                      backgroundColor: category === c ? Colors.brand[100] : '#fff',
                    }}
                  >
                    <Text className="text-xs text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                      {t(`tools.incident.category.${c}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                {t('tools.incident.field.description')}
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                multiline
                className="mb-3 min-h-[100px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                {t('tools.incident.field.immediateActions')}
              </Text>
              <TextInput
                value={immediateActions}
                onChangeText={setImmediateActions}
                multiline
                className="mb-3 min-h-[80px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                {t('tools.incident.field.witnessesOptional')}
              </Text>
              <TextInput
                value={witnesses}
                onChangeText={setWitnesses}
                multiline
                className="mb-3 min-h-[60px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                {t('tools.incident.field.reportedBy')}
              </Text>
              <TextInput
                value={reportedBy}
                onChangeText={setReportedBy}
                className="mb-4 rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
            </ScrollView>
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
