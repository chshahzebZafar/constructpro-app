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
import type { IncidentReport } from './types';

const PREFIX = 'constructpro_incidents_v1_';

interface Blob {
  byProject: Record<string, IncidentReport[]>;
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

function sortIncidents(list: IncidentReport[]): IncidentReport[] {
  return [...list].sort((a, b) => {
    if (a.dateOccurred !== b.dateOccurred) return b.dateOccurred.localeCompare(a.dateOccurred);
    return b.createdAt - a.createdAt;
  });
}

export async function listIncidents(projectId: string): Promise<IncidentReport[]> {
  const u = uid();
  if (getBudgetStorageMode() !== 'cloud') {
    const b = await loadBlob(u);
    return sortIncidents(b.byProject[projectId] ?? []);
  }
  const rows = await loadProjectArrayOrMigrate<IncidentReport>(u, projectId, TOOL_KEYS.incidents, loadBlob, saveBlob);
  return sortIncidents(rows);
}

export async function addIncident(
  projectId: string,
  row: Omit<IncidentReport, 'id' | 'createdAt'>
): Promise<IncidentReport> {
  const u = uid();
  const item: IncidentReport = {
    ...row,
    id: rid(),
    createdAt: Date.now(),
  };

  if (getBudgetStorageMode() !== 'cloud') {
    const blob = await loadBlob(u);
    if (!blob.byProject[projectId]) blob.byProject[projectId] = [];
    blob.byProject[projectId].push(item);
    await saveBlob(u, blob);
    return item;
  }

  const rows = await loadProjectArrayOrMigrate<IncidentReport>(u, projectId, TOOL_KEYS.incidents, loadBlob, saveBlob);
  rows.push(item);
  await saveProjectArraySnapshot(u, projectId, TOOL_KEYS.incidents, rows);
  return item;
}

export async function updateIncident(
  projectId: string,
  id: string,
  patch: Partial<Omit<IncidentReport, 'id' | 'createdAt'>>
): Promise<void> {
  const u = uid();
  if (getBudgetStorageMode() !== 'cloud') {
    const blob = await loadBlob(u);
    const list = blob.byProject[projectId];
    if (!list) return;
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return;
    list[i] = { ...list[i], ...patch };
    await saveBlob(u, blob);
    return;
  }

  const rows = await loadProjectArrayOrMigrate<IncidentReport>(u, projectId, TOOL_KEYS.incidents, loadBlob, saveBlob);
  const i = rows.findIndex((x) => x.id === id);
  if (i < 0) return;
  rows[i] = { ...rows[i], ...patch };
  await saveProjectArraySnapshot(u, projectId, TOOL_KEYS.incidents, rows);
}

export async function deleteIncident(projectId: string, id: string): Promise<void> {
  const u = uid();
  if (getBudgetStorageMode() !== 'cloud') {
    const blob = await loadBlob(u);
    const list = blob.byProject[projectId];
    if (!list) return;
    blob.byProject[projectId] = list.filter((x) => x.id !== id);
    await saveBlob(u, blob);
    return;
  }

  const rows = await loadProjectArrayOrMigrate<IncidentReport>(u, projectId, TOOL_KEYS.incidents, loadBlob, saveBlob);
  await saveProjectArraySnapshot(
    u,
    projectId,
    TOOL_KEYS.incidents,
    rows.filter((x) => x.id !== id)
  );
}

export {
  listBudgetProjects,
  createBudgetProject,
  deleteBudgetProject,
  getLastSelectedProjectId,
  setLastSelectedProjectId,
};
export type { BudgetProject };
