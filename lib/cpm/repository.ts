import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/useAuthStore';
import {
  createBudgetProject,
  deleteBudgetProject,
  getBudgetStorageMode,
  getLastSelectedProjectId,
  listBudgetProjects,
  setLastSelectedProjectId,
} from '@/lib/budget/repository';
import { loadProjectArrayOrMigrate, saveProjectArraySnapshot } from '@/lib/firestore/syncProjectArrayBlob';
import { TOOL_KEYS } from '@/lib/firestore/toolSnapshot';
import type { BudgetProject } from '@/lib/budget/types';
import type { CpmActivity } from './types';

const PREFIX = 'constructpro_cpm_v1_';

interface Blob {
  byProject: Record<string, CpmActivity[]>;
}

function uid(): string {
  const s = useAuthStore.getState();
  const u = s.user?.uid ?? s.offlinePreviewUid;
  if (!u) throw new Error('Sign in required.');
  return u;
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

export async function listCpmActivities(projectId: string): Promise<CpmActivity[]> {
  const u = uid();
  if (getBudgetStorageMode() !== 'cloud') {
    const b = await loadBlob(u);
    const list = b.byProject[projectId] ?? [];
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }
  const rows = await loadProjectArrayOrMigrate<CpmActivity>(u, projectId, TOOL_KEYS.cpm, loadBlob, saveBlob);
  return [...rows].sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveCpmActivities(projectId: string, activities: CpmActivity[]): Promise<void> {
  const u = uid();
  if (getBudgetStorageMode() !== 'cloud') {
    const blob = await loadBlob(u);
    blob.byProject[projectId] = activities;
    await saveBlob(u, blob);
    return;
  }
  await loadProjectArrayOrMigrate<CpmActivity>(u, projectId, TOOL_KEYS.cpm, loadBlob, saveBlob);
  await saveProjectArraySnapshot(u, projectId, TOOL_KEYS.cpm, activities);
}

export {
  listBudgetProjects,
  createBudgetProject,
  deleteBudgetProject,
  getLastSelectedProjectId,
  setLastSelectedProjectId,
};
export type { BudgetProject };
