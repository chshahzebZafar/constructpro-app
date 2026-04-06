import { useCallback } from 'react';
import type { ComponentProps } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/store/useAuthStore';
import { loadProjectAnalytics } from '@/lib/analytics/metrics';
import { listBudgetProjects, setLastSelectedProjectId } from '@/lib/budget/repository';
import { PROJECT_HUB_SHORTCUTS } from '@/lib/projects/hubShortcuts';
import { invalidateSharedProjectQueries } from '@/lib/query/invalidateSharedProjectQueries';
import { formatCurrency } from '@/lib/profile/currency';

export default function ProjectDetailScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');
  const currencyCode = useAuthStore((s) => s.currencyCode);

  const projectsQuery = useQuery({
    queryKey: ['budget-projects', uid],
    queryFn: listBudgetProjects,
    enabled: Boolean(uid),
  });

  const project = (projectsQuery.data ?? []).find((p) => p.id === projectId);

  const analyticsQuery = useQuery({
    queryKey: ['project-hub-analytics', uid, projectId],
    queryFn: () => loadProjectAnalytics(projectId!, project?.name ?? 'Project'),
    enabled: Boolean(uid && projectId && project),
  });

  useFocusEffect(
    useCallback(() => {
      if (projectId) void setLastSelectedProjectId(projectId);
    }, [projectId])
  );

  if (!projectId) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <View className="flex-row items-center border-b border-neutral-200 bg-white px-3 pb-3 pt-1">
        <Pressable onPress={() => router.back()} className="p-2" hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={Colors.brand[900]} />
        </Pressable>
        <View className="min-w-0 flex-1 pl-1">
          <Text className="text-lg text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }} numberOfLines={2}>
            {project?.name ?? '…'}
          </Text>
        </View>
      </View>

      {!uid ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            Sign in to view project details.
          </Text>
        </View>
      ) : projectsQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.brand[700]} />
        </View>
      ) : !project ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            Project not found.
          </Text>
          <Pressable onPress={() => router.back()} className="mt-4">
            <Text className="text-brand-700" style={{ fontFamily: 'Inter_500Medium' }}>
              Go back
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5 pt-4"
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={projectsQuery.isFetching || analyticsQuery.isFetching}
              onRefresh={() => {
                invalidateSharedProjectQueries(queryClient, uid);
              }}
            />
          }
        >
          <Text className="mb-2 text-sm text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
            Snapshot
          </Text>
          {analyticsQuery.isLoading ? (
            <ActivityIndicator color={Colors.brand[700]} className="py-4" />
          ) : analyticsQuery.data ? (
            <View className="mb-6 rounded-2xl border border-neutral-200 bg-white p-4">
              <Text className="text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Budget · planned {formatMoney(analyticsQuery.data.budget.planned, currencyCode)} · actual{' '}
                {formatMoney(analyticsQuery.data.budget.actual, currencyCode)} · variance {formatMoney(analyticsQuery.data.budget.variance, currencyCode)}
              </Text>
              <Text className="mt-2 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Tasks · {analyticsQuery.data.tasks.done}/{analyticsQuery.data.tasks.total} done ·{' '}
                {analyticsQuery.data.tasks.overdue} overdue
              </Text>
              <Text className="mt-2 text-xs text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
                Milestones · {analyticsQuery.data.milestones.completed}/{analyticsQuery.data.milestones.total} done ·{' '}
                {analyticsQuery.data.milestones.atRisk} at risk
              </Text>
            </View>
          ) : null}

          <Text className="mb-2 text-sm text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
            Open in tool
          </Text>
          <Text className="mb-3 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
            This project is pre-selected when each screen loads.
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {PROJECT_HUB_SHORTCUTS.map((s) => (
              <Pressable
                key={s.title}
                onPress={() => router.push(s.href)}
                className="mb-2 min-w-[46%] flex-1 flex-row items-center rounded-xl border border-neutral-200 bg-white px-3 py-3 active:opacity-90"
                style={{ maxWidth: '48%' }}
              >
                <Ionicons name={s.icon as ComponentProps<typeof Ionicons>['name']} size={20} color={Colors.brand[700]} />
                <Text
                  className="ml-2 flex-1 text-sm text-brand-900"
                  style={{ fontFamily: 'Inter_500Medium' }}
                  numberOfLines={2}
                >
                  {s.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function formatMoney(n: number, currencyCode: string): string {
  return formatCurrency(n, currencyCode, { maximumFractionDigits: 0 });
}
