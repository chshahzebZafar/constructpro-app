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
import type { PpeItem } from './types';

const PREFIX = 'constructpro_ppe_v1_';

interface Blob {
  byProject: Record<string, PpeItem[]>;
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

export async function listPpe(projectId: string): Promise<PpeItem[]> {
  const u = uid();
  const b = await loadBlob(u);
  return [...(b.byProject[projectId] ?? [])].sort((a, b) => a.name.localeCompare(b.name));
}

export async function addPpe(projectId: string, row: Omit<PpeItem, 'id'>): Promise<PpeItem> {
  const u = uid();
  const b = await loadBlob(u);
  if (!b.byProject[projectId]) b.byProject[projectId] = [];
  const item: PpeItem = { ...row, id: rid() };
  b.byProject[projectId].push(item);
  await saveBlob(u, b);
  return item;
}

export async function updatePpe(projectId: string, id: string, patch: Partial<Omit<PpeItem, 'id'>>): Promise<void> {
  const u = uid();
  const b = await loadBlob(u);
  const list = b.byProject[projectId];
  if (!list) return;
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return;
  list[i] = { ...list[i], ...patch };
  await saveBlob(u, b);
}

export async function deletePpe(projectId: string, id: string): Promise<void> {
  const u = uid();
  const b = await loadBlob(u);
  const list = b.byProject[projectId];
  if (!list) return;
  b.byProject[projectId] = list.filter((x) => x.id !== id);
  await saveBlob(u, b);
}

export {
  listBudgetProjects,
  createBudgetProject,
  deleteBudgetProject,
  getLastSelectedProjectId,
  setLastSelectedProjectId,
};
export type { BudgetProject };
