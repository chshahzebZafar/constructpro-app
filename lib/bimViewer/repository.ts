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
import type { BimLink } from './types';

const PREFIX = 'constructpro_bim_links_v1_';

interface Blob {
  byProject: Record<string, BimLink[]>;
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

function sortLinks(list: BimLink[]): BimLink[] {
  return [...list].sort((a, b) => b.createdAt - a.createdAt);
}

export async function listBimLinks(projectId: string): Promise<BimLink[]> {
  const u = uid();
  const b = await loadBlob(u);
  return sortLinks(b.byProject[projectId] ?? []);
}

export async function addBimLink(projectId: string, row: Omit<BimLink, 'id' | 'createdAt'>): Promise<BimLink> {
  const u = uid();
  const blob = await loadBlob(u);
  if (!blob.byProject[projectId]) blob.byProject[projectId] = [];
  const item: BimLink = {
    id: rid(),
    createdAt: Date.now(),
    title: row.title.trim(),
    url: row.url.trim(),
    notes: row.notes.trim(),
  };
  blob.byProject[projectId].push(item);
  await saveBlob(u, blob);
  return item;
}

export async function updateBimLink(projectId: string, id: string, patch: Partial<Omit<BimLink, 'id' | 'createdAt'>>): Promise<void> {
  const u = uid();
  const blob = await loadBlob(u);
  const list = blob.byProject[projectId];
  if (!list) return;
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return;
  list[i] = {
    ...list[i],
    ...patch,
    title: patch.title !== undefined ? patch.title.trim() : list[i].title,
    url: patch.url !== undefined ? patch.url.trim() : list[i].url,
    notes: patch.notes !== undefined ? patch.notes.trim() : list[i].notes,
  };
  await saveBlob(u, blob);
}

export async function deleteBimLink(projectId: string, id: string): Promise<void> {
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
