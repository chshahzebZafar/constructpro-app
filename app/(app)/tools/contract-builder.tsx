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
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/store/useAuthStore';
import { exportContractPdf } from '@/lib/pdf/generateContractPdf';
import {
  addContractDraft,
  createBudgetProject,
  deleteBudgetProject,
  deleteContractDraft,
  getLastSelectedProjectId,
  listBudgetProjects,
  listContractDrafts,
  setLastSelectedProjectId,
  updateContractDraft,
} from '@/lib/contractBuilder/repository';
import {
  CONTRACT_TEMPLATE_IDS,
  CONTRACT_TEMPLATE_LABELS,
  type ContractDraft,
  type ContractTemplateId,
} from '@/lib/contractBuilder/types';
import { invalidateSharedProjectQueries } from '@/lib/query/invalidateSharedProjectQueries';

export default function ContractBuilderScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectModal, setProjectModal] = useState(false);
  const [formModal, setFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [templateId, setTemplateId] = useState<ContractTemplateId>('fixed_price');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [partyClientName, setPartyClientName] = useState('');
  const [partyContractorName, setPartyContractorName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [contractPrice, setContractPrice] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [scheduleCompletion, setScheduleCompletion] = useState('');
  const [notToExceed, setNotToExceed] = useState('');
  const [primeContractRef, setPrimeContractRef] = useState('');
  const [changeOrderPolicy, setChangeOrderPolicy] = useState('');
  const [warrantyNotes, setWarrantyNotes] = useState('');
  const [additionalTerms, setAdditionalTerms] = useState('');
  const [exportingId, setExportingId] = useState<string | null>(null);

  const projectsQuery = useQuery({
    queryKey: ['budget-projects', uid],
    queryFn: listBudgetProjects,
    enabled: Boolean(uid),
  });
  const projects = projectsQuery.data ?? [];
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const itemsQuery = useQuery({
    queryKey: ['contract-builder', uid, selectedProjectId],
    queryFn: () => listContractDrafts(selectedProjectId!),
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
    void queryClient.invalidateQueries({ queryKey: ['contract-builder', uid] });
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

  const rowPayload = (): Omit<ContractDraft, 'id' | 'createdAt'> => ({
    templateId,
    effectiveDate: effectiveDate.trim(),
    partyClientName: partyClientName.trim(),
    partyContractorName: partyContractorName.trim(),
    projectTitle: projectTitle.trim(),
    siteAddress: siteAddress.trim(),
    scopeOfWork: scopeOfWork.trim(),
    contractPrice: contractPrice.trim(),
    paymentTerms: paymentTerms.trim(),
    scheduleCompletion: scheduleCompletion.trim(),
    notToExceed: notToExceed.trim(),
    primeContractRef: primeContractRef.trim(),
    changeOrderPolicy: changeOrderPolicy.trim(),
    warrantyNotes: warrantyNotes.trim(),
    additionalTerms: additionalTerms.trim(),
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!selectedProjectId) throw new Error('Select a project.');
      if (
        !effectiveDate.trim() ||
        !partyClientName.trim() ||
        !partyContractorName.trim() ||
        !projectTitle.trim() ||
        !scopeOfWork.trim() ||
        !contractPrice.trim() ||
        !paymentTerms.trim() ||
        !scheduleCompletion.trim()
      ) {
        throw new Error('Fill effective date, both parties, agreement title, scope, price, payment, and schedule.');
      }
      const payload = rowPayload();
      if (editingId) await updateContractDraft(selectedProjectId, editingId, payload);
      else await addContractDraft(selectedProjectId, payload);
    },
    onSuccess: () => {
      invalidate();
      closeForm();
    },
  });

  const deleteMut = useMutation({
    mutationFn: ({ pid, id }: { pid: string; id: string }) => deleteContractDraft(pid, id),
    onSuccess: invalidate,
  });

  const openAdd = () => {
    setEditingId(null);
    setTemplateId('fixed_price');
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    setPartyClientName('');
    setPartyContractorName('');
    setProjectTitle('');
    setSiteAddress('');
    setScopeOfWork('');
    setContractPrice('');
    setPaymentTerms('');
    setScheduleCompletion('');
    setNotToExceed('');
    setPrimeContractRef('');
    setChangeOrderPolicy('');
    setWarrantyNotes('');
    setAdditionalTerms('');
    setFormModal(true);
  };

  const openEdit = (r: ContractDraft) => {
    setEditingId(r.id);
    setTemplateId(r.templateId);
    setEffectiveDate(r.effectiveDate);
    setPartyClientName(r.partyClientName);
    setPartyContractorName(r.partyContractorName);
    setProjectTitle(r.projectTitle);
    setSiteAddress(r.siteAddress);
    setScopeOfWork(r.scopeOfWork);
    setContractPrice(r.contractPrice);
    setPaymentTerms(r.paymentTerms);
    setScheduleCompletion(r.scheduleCompletion);
    setNotToExceed(r.notToExceed);
    setPrimeContractRef(r.primeContractRef);
    setChangeOrderPolicy(r.changeOrderPolicy);
    setWarrantyNotes(r.warrantyNotes);
    setAdditionalTerms(r.additionalTerms);
    setFormModal(true);
  };

  const closeForm = () => {
    setFormModal(false);
    setEditingId(null);
  };

  const exportPdf = async (r: ContractDraft) => {
    if (!selectedProject) return;
    setExportingId(r.id);
    try {
      await exportContractPdf(r, selectedProject.name);
    } finally {
      setExportingId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="Contract builder" level="Mid" />
      {!uid ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            Sign in to draft agreements.
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
                    Create a project to store contract drafts.
                  </Text>
                  <Button title="New project" onPress={() => setProjectModal(true)} />
                </View>
              ) : (
                <View className="pb-3">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-sm text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
                      Project
                    </Text>
                    <Pressable onPress={() => setProjectModal(true)} className="rounded-lg bg-brand-100 px-3 py-2">
                      <Text className="text-sm text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                        + New
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
                              Alert.alert('Delete project?', p.name, [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => deleteProjectMut.mutate(p.id) },
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
                    Templates are indicative — obtain legal review before signing
                  </Text>
                </View>
              )
            }
            ListEmptyComponent={
              projects.length === 0 || !selectedProjectId ? null : itemsQuery.isLoading ? (
                <ActivityIndicator color={Colors.brand[700]} />
              ) : (
                <Text className="py-4 text-center text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                  No drafts yet.
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
                      {CONTRACT_TEMPLATE_LABELS[item.templateId]}
                    </Text>
                    <Text className="mt-1 text-base text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                      {item.projectTitle || 'Untitled'}
                    </Text>
                    <Text className="text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                      Effective {item.effectiveDate} · {item.partyClientName} ↔ {item.partyContractorName}
                    </Text>
                  </Pressable>
                  <View className="flex-row items-center">
                    <Pressable
                      onPress={() => exportPdf(item)}
                      disabled={exportingId === item.id}
                      className="p-2"
                      accessibilityLabel="Export PDF"
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
              <Button title="New draft" onPress={openAdd} />
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
              New project
            </Text>
            <TextInput
              value={newProjectName}
              onChangeText={setNewProjectName}
              placeholder="Name"
              className="mb-4 rounded-xl border border-neutral-300 px-3 py-3 text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
            />
            <Button
              title="Create"
              loading={createProjectMut.isPending}
              onPress={() => createProjectMut.mutate(newProjectName)}
            />
            <Pressable onPress={() => setProjectModal(false)} className="mt-3 items-center py-2">
              <Text className="text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>
                Cancel
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
                {editingId ? 'Edit draft' : 'New contract draft'}
              </Text>
              <Text className="mb-2 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Template
              </Text>
              <View className="mb-3 flex-row flex-wrap gap-2">
                {CONTRACT_TEMPLATE_IDS.map((tid) => (
                  <Pressable
                    key={tid}
                    onPress={() => setTemplateId(tid)}
                    className="rounded-full border px-3 py-1.5"
                    style={{
                      borderColor: templateId === tid ? Colors.brand[700] : Colors.neutral[300],
                      backgroundColor: templateId === tid ? Colors.brand[100] : '#fff',
                    }}
                  >
                    <Text className="text-xs text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                      {CONTRACT_TEMPLATE_LABELS[tid]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {templateId === 'time_and_materials' ? (
                <Text className="mb-3 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                  Describe rates or basis in Contract price. Optionally set a not-to-exceed cap below.
                </Text>
              ) : null}
              {templateId === 'subcontract' ? (
                <Text className="mb-3 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                  Optional: reference the prime contract. Flow-down terms should match your prime agreement.
                </Text>
              ) : null}
              {[
                ['Effective date (YYYY-MM-DD)', effectiveDate, setEffectiveDate],
                ['Client / owner name', partyClientName, setPartyClientName],
                ['Contractor name', partyContractorName, setPartyContractorName],
                ['Agreement / project title', projectTitle, setProjectTitle],
                ['Site address', siteAddress, setSiteAddress],
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
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Scope of work
              </Text>
              <TextInput
                value={scopeOfWork}
                onChangeText={setScopeOfWork}
                multiline
                className="mb-3 min-h-[120px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Contract price / compensation
              </Text>
              <TextInput
                value={contractPrice}
                onChangeText={setContractPrice}
                multiline
                className="mb-3 min-h-[72px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
                placeholder="e.g. $125,000 lump sum, or labor $85/hr + materials at cost"
              />
              {templateId === 'time_and_materials' ? (
                <>
                  <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                    Not-to-exceed (optional)
                  </Text>
                  <TextInput
                    value={notToExceed}
                    onChangeText={setNotToExceed}
                    className="mb-3 rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                    style={{ fontFamily: 'Inter_400Regular' }}
                  />
                </>
              ) : null}
              {templateId === 'subcontract' ? (
                <>
                  <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                    Prime contract reference (optional)
                  </Text>
                  <TextInput
                    value={primeContractRef}
                    onChangeText={setPrimeContractRef}
                    className="mb-3 rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                    style={{ fontFamily: 'Inter_400Regular' }}
                  />
                </>
              ) : null}
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Payment terms
              </Text>
              <TextInput
                value={paymentTerms}
                onChangeText={setPaymentTerms}
                multiline
                className="mb-3 min-h-[80px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Schedule / completion
              </Text>
              <TextInput
                value={scheduleCompletion}
                onChangeText={setScheduleCompletion}
                multiline
                className="mb-3 min-h-[80px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Change order policy (optional)
              </Text>
              <TextInput
                value={changeOrderPolicy}
                onChangeText={setChangeOrderPolicy}
                multiline
                className="mb-3 min-h-[72px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Warranty / defects (optional)
              </Text>
              <TextInput
                value={warrantyNotes}
                onChangeText={setWarrantyNotes}
                multiline
                className="mb-3 min-h-[60px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Additional terms (optional)
              </Text>
              <TextInput
                value={additionalTerms}
                onChangeText={setAdditionalTerms}
                multiline
                className="mb-4 min-h-[80px] rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
            </ScrollView>
            <Button
              title="Save"
              loading={saveMut.isPending}
              onPress={() => {
                saveMut.mutate(undefined, {
                  onError: (e) => Alert.alert('Check form', e instanceof Error ? e.message : 'Invalid'),
                });
              }}
            />
            <Pressable onPress={closeForm} className="mt-3 items-center py-2">
              <Text className="text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
