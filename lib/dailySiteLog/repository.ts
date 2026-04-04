import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/useAuthStore';
import {
  createBudgetProject,
  deleteBudgetProject,
  getLastSelectedProjectId,
  listBudgetProjects,
  setLastSelectedProjectId,
} from '@/lib/budget/repository';
import type { BudgetProject } from '@/lib/budget/types';
import type { DailySiteLogEntry, WeatherCondition } from './types';

const PREFIX = 'constructpro_daily_site_log_v1_';

interface Blob {
  byProject: Record<string, DailySiteLogEntry[]>;
}

function uid(): string {
  const s = useAuthStore.getState();
  const u = s.user?.uid ?? s.offlinePreviewUid;
  if (!u) throw new Error('Sign in required.');
  return u;
}

function rid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

async function loadBlob(u: string): Promise<Blob> {
  const raw = await AsyncStorage.getItem(PREFIX + u);
  if (!raw) return { byProject: {} };
  try {
    const b = JSON.parse(raw) as Blob;
    return b.byProject ? b : { byProject: {} };
  } catch {
    return { byProject: {} };
  }
}

async function saveBlob(u: string, b: Blob): Promise<void> {
  await AsyncStorage.setItem(PREFIX + u, JSON.stringify(b));
}

function sortLogs(list: DailySiteLogEntry[]): DailySiteLogEntry[] {
  return [...list].sort((a, b) => {
    if (a.logDate !== b.logDate) return b.logDate.localeCompare(a.logDate);
    return b.createdAt - a.createdAt;
  });
}

function normalize(e: DailySiteLogEntry): DailySiteLogEntry {
  const w = e.weatherCondition as WeatherCondition | undefined;
  return {
    ...e,
    photoUrls: Array.isArray(e.photoUrls) ? e.photoUrls : [],
    weatherCondition: w ?? 'clear',
    workforce: e.workforce ?? '',
    workPerformed: e.workPerformed ?? '',
    deliveries: e.deliveries ?? '',
    visitors: e.visitors ?? '',
    safetyNotes: e.safetyNotes ?? '',
    signedBy: e.signedBy ?? '',
    signedDate: e.signedDate ?? '',
    weatherNotes: e.weatherNotes ?? '',
  };
}

export async function listDailySiteLogs(projectId: string): Promise<DailySiteLogEntry[]> {
  const u = uid();
  const b = await loadBlob(u);
  const raw = b.byProject[projectId] ?? [];
  return sortLogs(raw.map(normalize));
}

export async function addDailySiteLog(
  projectId: string,
  row: Omit<DailySiteLogEntry, 'id' | 'createdAt'>
): Promise<DailySiteLogEntry> {
  const u = uid();
  const blob = await loadBlob(u);
  if (!blob.byProject[projectId]) blob.byProject[projectId] = [];
  const item: DailySiteLogEntry = {
    ...row,
    photoUrls: Array.isArray(row.photoUrls) ? row.photoUrls : [],
    id: rid(),
    createdAt: Date.now(),
  };
  blob.byProject[projectId].push(item);
  await saveBlob(u, blob);
  return item;
}

export async function updateDailySiteLog(
  projectId: string,
  id: string,
  patch: Partial<Omit<DailySiteLogEntry, 'id' | 'createdAt'>>
): Promise<void> {
  const u = uid();
  const blob = await loadBlob(u);
  const list = blob.byProject[projectId];
  if (!list) return;
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return;
  const next = { ...list[i], ...patch };
  if (patch.photoUrls !== undefined) next.photoUrls = patch.photoUrls;
  list[i] = next;
  await saveBlob(u, blob);
}

export async function deleteDailySiteLog(projectId: string, id: string): Promise<void> {
  const u = uid();
  const blob = await loadBlob(u);
  const list = blob.byProject[projectId];
  if (!list) return;
  blob.byProject[projectId] = list.filter((x) => x.id !== id);
  await saveBlob(u, blob);
}

export {
  listBudgetProjects,
  createBudgetProject,
  deleteBudgetProject,
  getLastSelectedProjectId,
  setLastSelectedProjectId,
};
export type { BudgetProject };
