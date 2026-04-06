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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/store/useAuthStore';
import {
  addBudgetLine,
  createBudgetProject,
  deleteBudgetLine,
  deleteBudgetProject,
  getBudgetStorageMode,
  getLastSelectedProjectId,
  listBudgetLines,
  listBudgetProjects,
  setLastSelectedProjectId,
  updateBudgetLine,
} from '@/lib/budget/repository';
import {
  BUDGET_CATEGORY_PRESETS,
  computeBudgetTotals,
  type BudgetLine,
  type BudgetLineInput,
  type BudgetProject,
} from '@/lib/budget/types';
import { invalidateSharedProjectQueries } from '@/lib/query/invalidateSharedProjectQueries';
import { currencySymbol, formatCurrency } from '@/lib/profile/currency';

function fmtMoney(n: number, currencyCode: string) {
  return formatCurrency(n, currencyCode, { maximumFractionDigits: 0 });
}

function parseMoney(s: string): number {
  const v = parseFloat(s.replace(/,/g, ''));
  return Number.isFinite(v) ? v : 0;
}

export default function BudgetTrackerScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');
  const currencyCode = useAuthStore((s) => s.currencyCode);
  const storageMode = getBudgetStorageMode();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectModal, setProjectModal] = useState(false);
  const [lineModal, setLineModal] = useState(false);
  const [editingLine, setEditingLine] = useState<BudgetLine | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [lineCategory, setLineCategory] = useState('Materials');
  const [lineLabel, setLineLabel] = useState('');
  const [linePlanned, setLinePlanned] = useState('');
  const [lineActual, setLineActual] = useState('');

  const projectsQuery = useQuery({
    queryKey: ['budget-projects', uid],
    queryFn: listBudgetProjects,
    enabled: Boolean(uid),
  });

  const projects = projectsQuery.data ?? [];

  const linesQuery = useQuery({
    queryKey: ['budget-lines', uid, selectedProjectId],
    queryFn: () => listBudgetLines(selectedProjectId!),
    enabled: Boolean(uid && selectedProjectId),
  });

  const lines = linesQuery.data ?? [];
  const totals = useMemo(() => computeBudgetTotals(lines), [lines]);

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

  const invalidateBudget = useCallback(() => {
    invalidateSharedProjectQueries(queryClient, uid);
    void queryClient.invalidateQueries({ queryKey: ['budget-lines', uid] });
  }, [queryClient, uid]);

  const createProjectMut = useMutation({
    mutationFn: (name: string) => createBudgetProject(name),
    onSuccess: (p) => {
      invalidateBudget();
      setSelectedProjectId(p.id);
      setProjectModal(false);
      setNewProjectName('');
    },
  });

  const deleteProjectMut = useMutation({
    mutationFn: (id: string) => deleteBudgetProject(id),
    onSuccess: (_, id) => {
      invalidateBudget();
      if (selectedProjectId === id) setSelectedProjectId(null);
    },
  });

  const saveLineMut = useMutation({
    mutationFn: async () => {
      if (!selectedProjectId) throw new Error('Select a project.');
      const input: BudgetLineInput = {
        category: lineCategory,
        label: lineLabel,
        planned: parseMoney(linePlanned),
        actual: parseMoney(lineActual),
      };
      if (editingLine) {
        await updateBudgetLine(selectedProjectId, editingLine.id, input);
      } else {
        await addBudgetLine(selectedProjectId, input);
      }
    },
    onSuccess: () => {
      invalidateBudget();
      closeLineModal();
    },
  });

  const removeLineMut = useMutation({
    mutationFn: ({ projectId, lineId }: { projectId: string; lineId: string }) =>
      deleteBudgetLine(projectId, lineId),
    onSuccess: invalidateBudget,
  });

  const openAddLine = () => {
    setEditingLine(null);
    setLineCategory('Materials');
    setLineLabel('');
    setLinePlanned('');
    setLineActual('');
    setLineModal(true);
  };

  const openEditLine = (line: BudgetLine) => {
    setEditingLine(line);
    setLineCategory(line.category);
    setLineLabel(line.label);
    setLinePlanned(line.planned === 0 ? '' : String(line.planned));
    setLineActual(line.actual === 0 ? '' : String(line.actual));
    setLineModal(true);
  };

  const closeLineModal = () => {
    setLineModal(false);
    setEditingLine(null);
  };

  const confirmDeleteProject = (p: BudgetProject) => {
    Alert.alert('Delete project', `Delete “${p.name}” and all budget lines?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteProjectMut.mutate(p.id),
      },
    ]);
  };

  const confirmDeleteLine = (line: BudgetLine) => {
    if (!selectedProjectId) return;
    Alert.alert('Delete line', 'Remove this budget line?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeLineMut.mutate({ projectId: selectedProjectId, lineId: line.id }),
      },
    ]);
  };

  const header = (
    <View className="pb-2">
      <View className="mb-3 flex-row flex-wrap items-center gap-2">
        <Text className="text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
          {storageMode === 'cloud' ? 'Synced with cloud' : 'Stored on this device'}
        </Text>
      </View>

      <View className="mb-3 flex-row items-center justify-between">
        <Text
          className="text-sm text-brand-900"
          style={{ fontFamily: 'Poppins_700Bold' }}
        >
          Project
        </Text>
        <Pressable
          onPress={() => setProjectModal(true)}
          className="flex-row items-center rounded-lg bg-brand-100 px-3 py-2"
        >
          <Ionicons name="add" size={18} color={Colors.brand[900]} />
          <Text className="ml-1 text-sm text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
            New
          </Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
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
                <Pressable
                  onPress={() => confirmDeleteProject(p)}
                  hitSlop={8}
                  className="ml-1 p-1"
                  accessibilityLabel="Delete project"
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.neutral[500]} />
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {selectedProjectId ? (
        <>
          <View className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4">
            <Text className="mb-3 text-sm text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
              Totals
            </Text>
            <View className="flex-row justify-between">
              <View>
                <Text className="text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                  Planned
                </Text>
                <Text className="text-lg text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                  {fmtMoney(totals.planned, currencyCode)}
                </Text>
              </View>
              <View>
                <Text className="text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                  Actual
                </Text>
                <Text className="text-lg text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                  {fmtMoney(totals.actual, currencyCode)}
                </Text>
              </View>
              <View>
                <Text className="text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                  Variance
                </Text>
                <Text
                  className="text-lg"
                  style={{
                    fontFamily: 'Inter_500Medium',
                    color: totals.variance >= 0 ? Colors.success[600] : Colors.danger[600],
                  }}
                >
                  {fmtMoney(totals.variance, currencyCode)}
                </Text>
              </View>
            </View>
            <Text className="mt-2 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
              Positive variance = under budget (planned − actual).
            </Text>
          </View>

          {Object.keys(totals.byCategory).length > 0 ? (
            <View className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4">
              <Text className="mb-2 text-sm text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
                By category
              </Text>
              {Object.entries(totals.byCategory)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([cat, v]) => (
                  <View
                    key={cat}
                    className="mb-2 flex-row items-center justify-between border-b border-neutral-100 pb-2 last:mb-0 last:border-b-0"
                  >
                    <Text className="flex-1 text-sm text-neutral-800" style={{ fontFamily: 'Inter_500Medium' }}>
                      {cat}
                    </Text>
                    <Text className="text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                      {fmtMoney(v.planned, currencyCode)} / {fmtMoney(v.actual, currencyCode)}
                    </Text>
                  </View>
                ))}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="Budget tracker" level="Mid" />
      {!uid ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            Sign in to use the budget tracker.
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={lines}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={projectsQuery.isFetching || linesQuery.isFetching}
                onRefresh={() => {
                  void projectsQuery.refetch();
                  void linesQuery.refetch();
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
                    Create a project to add planned and actual amounts by category.
                  </Text>
                  <Button title="Create project" onPress={() => setProjectModal(true)} />
                </View>
              ) : (
                header
              )
            }
            ListEmptyComponent={
              projects.length === 0 ? null : linesQuery.isLoading && selectedProjectId ? (
                <View className="py-6">
                  <ActivityIndicator color={Colors.brand[700]} />
                </View>
              ) : selectedProjectId ? (
                <Text
                  className="px-5 pt-2 text-center text-sm text-neutral-500"
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
                  No lines yet. Tap “Add line” below.
                </Text>
              ) : null
            }
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 8 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => openEditLine(item)}
                className="mb-2 rounded-2xl border border-neutral-200 bg-white p-4 active:opacity-90"
              >
                <View className="flex-row items-start justify-between">
                  <View className="mr-2 flex-1">
                    <Text className="text-xs uppercase text-neutral-500" style={{ fontFamily: 'Inter_500Medium' }}>
                      {item.category}
                    </Text>
                    <Text className="text-base text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                      {item.label || '—'}
                    </Text>
                    <Text className="mt-1 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                      Planned {fmtMoney(item.planned, currencyCode)} · Actual {fmtMoney(item.actual, currencyCode)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => confirmDeleteLine(item)}
                    hitSlop={10}
                    accessibilityLabel="Delete line"
                  >
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
              <Button title="Add line" onPress={openAddLine} />
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
              New project
            </Text>
            <Text className="mb-1 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
              Name
            </Text>
            <TextInput
              value={newProjectName}
              onChangeText={setNewProjectName}
              placeholder="e.g. Riverside build"
              className="mb-4 min-h-[48px] rounded-xl border border-neutral-300 px-3 text-neutral-900"
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

      <Modal visible={lineModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/40"
        >
          <Pressable className="flex-1" onPress={closeLineModal} />
          <View className="max-h-[85%] rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <Text className="mb-3 text-lg text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
              {editingLine ? 'Edit line' : 'Add line'}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text className="mb-1 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Category
              </Text>
              <View className="mb-3 flex-row flex-wrap gap-2">
                {BUDGET_CATEGORY_PRESETS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setLineCategory(c)}
                    className="rounded-full border px-3 py-1.5"
                    style={{
                      borderColor: lineCategory === c ? Colors.brand[700] : Colors.neutral[300],
                      backgroundColor: lineCategory === c ? Colors.brand[100] : Colors.white,
                    }}
                  >
                    <Text className="text-xs text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text className="mb-1 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Custom category (optional)
              </Text>
              <TextInput
                value={lineCategory}
                onChangeText={setLineCategory}
                className="mb-3 min-h-[44px] rounded-xl border border-neutral-300 px-3 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Label
              </Text>
              <TextInput
                value={lineLabel}
                onChangeText={setLineLabel}
                placeholder="e.g. Foundation pour"
                className="mb-3 min-h-[44px] rounded-xl border border-neutral-300 px-3 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Planned ({currencySymbol(currencyCode)})
              </Text>
              <TextInput
                value={linePlanned}
                onChangeText={setLinePlanned}
                keyboardType="decimal-pad"
                className="mb-3 min-h-[44px] rounded-xl border border-neutral-300 px-3 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              <Text className="mb-1 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Actual ({currencySymbol(currencyCode)})
              </Text>
              <TextInput
                value={lineActual}
                onChangeText={setLineActual}
                keyboardType="decimal-pad"
                className="mb-4 min-h-[44px] rounded-xl border border-neutral-300 px-3 text-neutral-900"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
            </ScrollView>
            <Button
              title={editingLine ? 'Save' : 'Add'}
              loading={saveLineMut.isPending}
              onPress={() => saveLineMut.mutate()}
            />
            <Pressable onPress={closeLineModal} className="mt-3 items-center py-2">
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
