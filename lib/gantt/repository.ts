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
import type { GanttBar } from './types';

const PREFIX = 'constructpro_gantt_v1_';

interface Blob {
  byProject: Record<string, GanttBar[]>;
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

function normalize(e: GanttBar): GanttBar {
  return {
    ...e,
    name: e.name ?? '',
    startDate: e.startDate ?? '',
    endDate: e.endDate ?? '',
    notes: e.notes ?? '',
  };
}

function sortBars(list: GanttBar[]): GanttBar[] {
  return [...list].sort((a, b) => {
    if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
    return a.name.localeCompare(b.name);
  });
}

export async function listGanttBars(projectId: string): Promise<GanttBar[]> {
  const u = uid();
  if (getBudgetStorageMode() !== 'cloud') {
    const b = await loadBlob(u);
    return sortBars((b.byProject[projectId] ?? []).map(normalize));
  }
  const rows = await loadProjectArrayOrMigrate<GanttBar>(u, projectId, TOOL_KEYS.gantt, loadBlob, saveBlob);
  return sortBars(rows.map(normalize));
}

export async function addGanttBar(projectId: string, row: Omit<GanttBar, 'id'>): Promise<GanttBar> {
  const u = uid();
  const item: GanttBar = normalize({ ...row, id: rid() });

  if (getBudgetStorageMode() !== 'cloud') {
    const blob = await loadBlob(u);
    if (!blob.byProject[projectId]) blob.byProject[projectId] = [];
    blob.byProject[projectId].push(item);
    await saveBlob(u, blob);
    return item;
  }

  const rows = await loadProjectArrayOrMigrate<GanttBar>(u, projectId, TOOL_KEYS.gantt, loadBlob, saveBlob);
  rows.push(item);
  await saveProjectArraySnapshot(u, projectId, TOOL_KEYS.gantt, rows);
  return item;
}

export async function updateGanttBar(projectId: string, id: string, patch: Partial<Omit<GanttBar, 'id'>>): Promise<void> {
  const u = uid();
  if (getBudgetStorageMode() !== 'cloud') {
    const blob = await loadBlob(u);
    const list = blob.byProject[projectId];
    if (!list) return;
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return;
    list[i] = normalize({ ...list[i], ...patch });
    await saveBlob(u, blob);
    return;
  }

  const rows = await loadProjectArrayOrMigrate<GanttBar>(u, projectId, TOOL_KEYS.gantt, loadBlob, saveBlob);
  const i = rows.findIndex((x) => x.id === id);
  if (i < 0) return;
  rows[i] = normalize({ ...rows[i], ...patch });
  await saveProjectArraySnapshot(u, projectId, TOOL_KEYS.gantt, rows);
}

export async function deleteGanttBar(projectId: string, id: string): Promise<void> {
  const u = uid();
  if (getBudgetStorageMode() !== 'cloud') {
    const blob = await loadBlob(u);
    const list = blob.byProject[projectId];
    if (!list) return;
    blob.byProject[projectId] = list.filter((x) => x.id !== id);
    await saveBlob(u, blob);
    return;
  }

  const rows = await loadProjectArrayOrMigrate<GanttBar>(u, projectId, TOOL_KEYS.gantt, loadBlob, saveBlob);
  await saveProjectArraySnapshot(
    u,
    projectId,
    TOOL_KEYS.gantt,
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
