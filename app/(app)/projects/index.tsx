import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/store/useAuthStore';
import {
  createBudgetProject,
  deleteBudgetProject,
  getBudgetStorageMode,
  listBudgetProjects,
  updateBudgetProjectName,
} from '@/lib/budget/repository';
import type { BudgetProject } from '@/lib/budget/types';
import { invalidateSharedProjectQueries } from '@/lib/query/invalidateSharedProjectQueries';
import { useI18n } from '@/hooks/useI18n';

export default function ProjectsListScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');
  const storageMode = getBudgetStorageMode();
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [renameTarget, setRenameTarget] = useState<BudgetProject | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const projectsQuery = useQuery({
    queryKey: ['budget-projects', uid],
    queryFn: listBudgetProjects,
    enabled: Boolean(uid),
  });

  const invalidate = useCallback(() => {
    invalidateSharedProjectQueries(queryClient, uid);
  }, [queryClient, uid]);

  const createMut = useMutation({
    mutationFn: (name: string) => createBudgetProject(name),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setNewName('');
    },
  });

  const renameMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateBudgetProjectName(id, name),
    onSuccess: () => {
      invalidate();
      setRenameOpen(false);
      setRenameTarget(null);
      setRenameValue('');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteBudgetProject(id),
    onSuccess: invalidate,
  });

  const openRename = (p: BudgetProject) => {
    setRenameTarget(p);
    setRenameValue(p.name);
    setRenameOpen(true);
  };

  const confirmDelete = (p: BudgetProject) => {
    Alert.alert(t('projects.deleteTitle'), t('projects.deleteBody').replace('{name}', p.name), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteMut.mutate(p.id) },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <View className="border-b border-neutral-200 bg-white px-5 pb-4 pt-2">
        <Text className="text-2xl text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
          {t('projects.title')}
        </Text>
        <Text className="mt-1 text-sm text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
          {t('projects.subtitle')}{' '}
          {storageMode === 'cloud' ? t('projects.storage.cloud') : t('projects.storage.device')}
        </Text>
      </View>

      {!uid ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            {t('projects.signInManage')}
          </Text>
        </View>
      ) : projectsQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.brand[700]} />
        </View>
      ) : (
        <FlatList
          data={projectsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={projectsQuery.isFetching} onRefresh={() => void projectsQuery.refetch()} />
          }
          contentContainerStyle={{ padding: 20, paddingBottom: 120 + insets.bottom }}
          ListEmptyComponent={
            <Text className="py-8 text-center text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
              {t('projects.emptyUseAcrossTools')}
            </Text>
          }
          renderItem={({ item }) => (
            <View className="mb-3 flex-row items-center rounded-2xl border border-neutral-200 bg-white pl-4 pr-2 py-3">
              <Pressable
                onPress={() => router.push(`/(app)/projects/${item.id}`)}
                className="min-w-0 flex-1 flex-row items-center py-1 active:opacity-90"
              >
                <View className="min-w-0 flex-1 pr-2">
                  <Text className="text-base text-brand-900" style={{ fontFamily: 'Inter_500Medium' }} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text className="mt-1 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                    {t('projects.createdOn')} {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.neutral[500]} />
              </Pressable>
              <Pressable
                onPress={() => openRename(item)}
                hitSlop={8}
                className="p-2"
                accessibilityLabel={t('projects.renameProject')}
              >
                <Ionicons name="pencil-outline" size={20} color={Colors.neutral[500]} />
              </Pressable>
              <Pressable onPress={() => confirmDelete(item)} hitSlop={8} className="p-2">
                <Ionicons name="trash-outline" size={20} color={Colors.neutral[500]} />
              </Pressable>
            </View>
          )}
        />
      )}

      {uid ? (
        <View
          className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 bg-white px-5 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <Pressable
            onPress={() => setCreateOpen(true)}
            className="items-center rounded-xl bg-brand-700 py-3 active:opacity-90"
          >
            <Text className="text-base text-white" style={{ fontFamily: 'Inter_500Medium' }}>
              {t('projects.newProject')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <Modal visible={createOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/40"
        >
          <Pressable className="flex-1" onPress={() => setCreateOpen(false)} />
          <View className="rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <Text className="mb-2 text-lg text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
              {t('projects.newProject')}
            </Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder={t('projects.projectNamePlaceholder')}
              className="mb-4 rounded-xl border border-neutral-300 px-3 py-3 text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
              autoFocus
            />
            <Pressable
              onPress={() => createMut.mutate(newName)}
              disabled={createMut.isPending}
              className="items-center rounded-xl bg-brand-700 py-3 opacity-100 disabled:opacity-50"
            >
              {createMut.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base text-white" style={{ fontFamily: 'Inter_500Medium' }}>
                  {t('common.create')}
                </Text>
              )}
            </Pressable>
            <Pressable onPress={() => setCreateOpen(false)} className="mt-3 items-center py-2">
              <Text className="text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>
                {t('common.cancel')}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={renameOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/40"
        >
          <Pressable className="flex-1" onPress={() => setRenameOpen(false)} />
          <View className="rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <Text className="mb-2 text-lg text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
              {t('projects.renameProject')}
            </Text>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder={t('projects.projectNamePlaceholder')}
              className="mb-4 rounded-xl border border-neutral-300 px-3 py-3 text-neutral-900"
              style={{ fontFamily: 'Inter_400Regular' }}
              autoFocus
            />
            <Pressable
              onPress={() => {
                if (renameTarget) renameMut.mutate({ id: renameTarget.id, name: renameValue });
              }}
              disabled={renameMut.isPending}
              className="items-center rounded-xl bg-brand-700 py-3 disabled:opacity-50"
            >
              {renameMut.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base text-white" style={{ fontFamily: 'Inter_500Medium' }}>
                  {t('common.save')}
                </Text>
              )}
            </Pressable>
            <Pressable onPress={() => setRenameOpen(false)} className="mt-3 items-center py-2">
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
