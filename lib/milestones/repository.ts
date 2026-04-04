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
import type { Milestone } from './types';

const PREFIX = 'constructpro_milestones_v1_';

interface Blob {
  byProject: Record<string, Milestone[]>;
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

export async function listMilestones(projectId: string): Promise<Milestone[]> {
  const u = uid();
  const b = await loadBlob(u);
  const list = b.byProject[projectId] ?? [];
  return [...list].sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));
}

export async function addMilestone(projectId: string, m: Omit<Milestone, 'id'>): Promise<Milestone> {
  const u = uid();
  const b = await loadBlob(u);
  if (!b.byProject[projectId]) b.byProject[projectId] = [];
  const row: Milestone = { ...m, id: rid() };
  b.byProject[projectId].push(row);
  await saveBlob(u, b);
  return row;
}

export async function updateMilestone(
  projectId: string,
  id: string,
  patch: Partial<Omit<Milestone, 'id'>>
): Promise<void> {
  const u = uid();
  const b = await loadBlob(u);
  const list = b.byProject[projectId];
  if (!list) return;
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return;
  list[i] = { ...list[i], ...patch };
  await saveBlob(u, b);
}

export async function deleteMilestone(projectId: string, id: string): Promise<void> {
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
