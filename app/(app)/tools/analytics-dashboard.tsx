import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/store/useAuthStore';
import {
  getBudgetStorageMode,
  getLastSelectedProjectId,
  listBudgetProjects,
  setLastSelectedProjectId,
} from '@/lib/budget/repository';
import { loadPortfolioAnalytics, loadProjectAnalytics } from '@/lib/analytics/metrics';
import type { BudgetProject } from '@/lib/budget/types';
import { invalidateSharedProjectQueries } from '@/lib/query/invalidateSharedProjectQueries';
import { formatCurrency } from '@/lib/profile/currency';
import { useI18n } from '@/hooks/useI18n';

type Scope = { kind: 'portfolio' } | { kind: 'project'; project: BudgetProject };

function pct(n: number | null): string {
  if (n === null || Number.isNaN(n)) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

function money(n: number, currencyCode: string): string {
  return formatCurrency(n, currencyCode, { maximumFractionDigits: 0 });
}

export default function AnalyticsDashboardScreen() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');
  const currencyCode = useAuthStore((s) => s.currencyCode);
  const storageMode = getBudgetStorageMode();
  const [scope, setScope] = useState<Scope>({ kind: 'portfolio' });

  const projectsQuery = useQuery({
    queryKey: ['budget-projects', uid],
    queryFn: listBudgetProjects,
    enabled: Boolean(uid),
  });
  const projects = projectsQuery.data ?? [];

  useEffect(() => {
    const list = projectsQuery.data;
    if (!list?.length) return;
    void (async () => {
      const last = await getLastSelectedProjectId();
      if (last && list.some((p) => p.id === last)) {
        const p = list.find((x) => x.id === last);
        if (p) setScope({ kind: 'project', project: p });
      }
    })();
  }, [projectsQuery.data]);

  const analyticsQuery = useQuery({
    queryKey: ['analytics-dashboard', uid, scope.kind === 'portfolio' ? 'all' : scope.project.id],
    queryFn: async () => {
      if (scope.kind === 'portfolio') return loadPortfolioAnalytics();
      return loadProjectAnalytics(scope.project.id, scope.project.name);
    },
    enabled: Boolean(uid) && (scope.kind === 'portfolio' || Boolean(scope.kind === 'project' && scope.project)),
  });

  const snap = analyticsQuery.data;

  const invalidate = useCallback(() => {
    invalidateSharedProjectQueries(queryClient, uid);
  }, [queryClient, uid]);

  const selectProject = (p: BudgetProject) => {
    setScope({ kind: 'project', project: p });
    void setLastSelectedProjectId(p.id);
  };

  const barWidthPct = useMemo(() => {
    if (!snap || snap.budget.planned <= 0) return null;
    return Math.min(100, Math.max(0, (snap.budget.actual / snap.budget.planned) * 100));
  }, [snap]);

  const taskDonePct = useMemo(() => {
    if (!snap || snap.tasks.total === 0) return null;
    return (snap.tasks.done / snap.tasks.total) * 100;
  }, [snap]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title="Analytics dashboard" level="Advanced" />
      {!uid ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
            {t('tools.analytics.signInViewMetrics')}
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={projectsQuery.isFetching || analyticsQuery.isFetching}
              onRefresh={() => {
                invalidate();
                void analyticsQuery.refetch();
              }}
            />
          }
        >
          <Text className="mb-1 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
            {t(storageMode === 'cloud' ? 'tools.analytics.budgetDataCloud' : 'tools.analytics.budgetDataLocal')}
          </Text>

          {projectsQuery.isLoading ? (
            <View className="py-10">
              <ActivityIndicator color={Colors.brand[700]} />
            </View>
          ) : projects.length === 0 ? (
            <Text className="py-6 text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
              {t('tools.analytics.createProjectHint')}
            </Text>
          ) : (
            <>
              <Text className="mb-2 mt-2 text-sm text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
                {t('tools.analytics.scopeHeading')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <View className="flex-row flex-wrap gap-2">
                  <Pressable
                    onPress={() => setScope({ kind: 'portfolio' })}
                    className="rounded-full border px-3 py-2"
                    style={{
                      borderColor: scope.kind === 'portfolio' ? Colors.brand[700] : Colors.neutral[300],
                      backgroundColor: scope.kind === 'portfolio' ? Colors.brand[100] : '#fff',
                    }}
                  >
                    <Text className="text-sm text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                      {t('tools.analytics.allProjects')}
                    </Text>
                  </Pressable>
                  {projects.map((p) => {
                    const active = scope.kind === 'project' && scope.project.id === p.id;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => selectProject(p)}
                        className="rounded-full border px-3 py-2"
                        style={{
                          borderColor: active ? Colors.brand[700] : Colors.neutral[300],
                          backgroundColor: active ? Colors.brand[100] : '#fff',
                        }}
                      >
                        <Text className="text-sm text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
                          {p.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              {analyticsQuery.isLoading ? (
                <ActivityIndicator color={Colors.brand[700]} className="py-8" />
              ) : snap ? (
                <>
                  <Text className="mb-3 text-lg text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
                    {scope.kind === 'portfolio' ? t('tools.analytics.allProjects') : snap.scopeLabel}
                  </Text>

                  <View className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4">
                    <Text className="mb-2 text-sm text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
                      {t('tools.analytics.budgetPlannedVsActual')}
                    </Text>
                    <Text className="text-neutral-700" style={{ fontFamily: 'Inter_400Regular' }}>
                      {t('tools.budget.planned')} {money(snap.budget.planned, currencyCode)} · {t('tools.budget.actual')}{' '}
                      {money(snap.budget.actual, currencyCode)}
                    </Text>
                    <Text className="mt-1 text-neutral-700" style={{ fontFamily: 'Inter_400Regular' }}>
                      {t('tools.budget.variance')} {money(snap.budget.variance, currencyCode)} (
                      {pct(snap.budget.variancePct)} {t('tools.analytics.ofPlanned')})
                    </Text>
                    {barWidthPct !== null ? (
                      <View className="mt-3">
                        <Text className="mb-1 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                          {t('tools.analytics.spendVsPlanned')}
                        </Text>
                        <View className="h-3 w-full overflow-hidden rounded-full bg-neutral-200">
                          <View
                            className="h-3 rounded-full bg-brand-600"
                            style={{ width: `${barWidthPct}%` }}
                          />
                        </View>
                        <Text className="mt-1 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                          {t('tools.analytics.ratioActualPlannedPrefix')}{' '}
                          {snap.budget.spendRatio !== null ? snap.budget.spendRatio.toFixed(2) : '—'}{' '}
                          {t('tools.analytics.ratioOnPlan')}
                        </Text>
                      </View>
                    ) : (
                      <Text className="mt-2 text-sm text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                        {t('tools.analytics.addBudgetLines')}
                      </Text>
                    )}
                  </View>

                  <View className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4">
                    <Text className="mb-2 text-sm text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
                      {t('tools.analytics.tasksHeading')}
                    </Text>
                    <Text className="text-neutral-700" style={{ fontFamily: 'Inter_400Regular' }}>
                      {t('tools.analytics.metricTotal')} {snap.tasks.total} · {t('common.done')} {snap.tasks.done} ·{' '}
                      {t('tools.analytics.metricOpen')} {snap.tasks.open} · {t('tools.analytics.metricOverdue')}{' '}
                      {snap.tasks.overdue}
                    </Text>
                    {taskDonePct !== null ? (
                      <View className="mt-3">
                        <View className="h-3 w-full overflow-hidden rounded-full bg-neutral-200">
                          <View
                            className="h-3 rounded-full"
                            style={{ width: `${taskDonePct}%`, backgroundColor: Colors.success[600] }}
                          />
                        </View>
                        <Text className="mt-1 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                          {t('tools.analytics.completion')} {taskDonePct.toFixed(0)}%
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4">
                    <Text className="mb-2 text-sm text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
                      {t('tools.analytics.milestonesHeading')}
                    </Text>
                    <Text className="text-neutral-700" style={{ fontFamily: 'Inter_400Regular' }}>
                      {t('tools.analytics.metricTotal')} {snap.milestones.total} · {t('tools.analytics.metricCompleted')}{' '}
                      {snap.milestones.completed} · {t('tools.analytics.forecastAtRisk')} {snap.milestones.atRisk}
                    </Text>
                    {snap.milestones.total > 0 ? (
                      <Text className="mt-2 text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                        {t('tools.analytics.atRiskExplain')}
                      </Text>
                    ) : (
                      <Text className="mt-2 text-sm text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                        {t('tools.analytics.addMilestonesHint')}
                      </Text>
                    )}
                  </View>

                  <Text className="text-xs text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
                    {t('tools.analytics.spiFootnote')}
                  </Text>
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
