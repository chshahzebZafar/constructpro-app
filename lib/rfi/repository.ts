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
import type { RfiItem } from './types';

const PREFIX = 'constructpro_rfi_v1_';

interface Blob {
  byProject: Record<string, RfiItem[]>;
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

function sortRfis(list: RfiItem[]): RfiItem[] {
  return [...list].sort((a, b) => {
    if (a.dateRaised !== b.dateRaised) return b.dateRaised.localeCompare(a.dateRaised);
    return a.rfiNumber.localeCompare(b.rfiNumber);
  });
}

export async function listRfis(projectId: string): Promise<RfiItem[]> {
  const u = uid();
  const b = await loadBlob(u);
  return sortRfis(b.byProject[projectId] ?? []);
}

export async function addRfi(projectId: string, row: Omit<RfiItem, 'id'>): Promise<RfiItem> {
  const u = uid();
  const blob = await loadBlob(u);
  if (!blob.byProject[projectId]) blob.byProject[projectId] = [];
  const item: RfiItem = { ...row, id: rid() };
  blob.byProject[projectId].push(item);
  await saveBlob(u, blob);
  return item;
}

export async function updateRfi(projectId: string, id: string, patch: Partial<Omit<RfiItem, 'id'>>): Promise<void> {
  const u = uid();
  const blob = await loadBlob(u);
  const list = blob.byProject[projectId];
  if (!list) return;
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return;
  list[i] = { ...list[i], ...patch };
  await saveBlob(u, blob);
}

export async function deleteRfi(projectId: string, id: string): Promise<void> {
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
