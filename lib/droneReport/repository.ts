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
import type { DroneReportEntry } from './types';

const PREFIX = 'constructpro_drone_report_v1_';

interface Blob {
  byProject: Record<string, DroneReportEntry[]>;
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

function normalize(e: DroneReportEntry): DroneReportEntry {
  return {
    ...e,
    photoUrls: Array.isArray(e.photoUrls) ? e.photoUrls : [],
    title: e.title ?? '',
    reportDate: e.reportDate ?? '',
    locationNotes: e.locationNotes ?? '',
    description: e.description ?? '',
  };
}

function sortEntries(list: DroneReportEntry[]): DroneReportEntry[] {
  return [...list].sort((a, b) => {
    if (a.reportDate !== b.reportDate) return b.reportDate.localeCompare(a.reportDate);
    return b.createdAt - a.createdAt;
  });
}

export async function listDroneReports(projectId: string): Promise<DroneReportEntry[]> {
  const u = uid();
  if (getBudgetStorageMode() !== 'cloud') {
    const b = await loadBlob(u);
    return sortEntries((b.byProject[projectId] ?? []).map(normalize));
  }
  const rows = await loadProjectArrayOrMigrate<DroneReportEntry>(
    u,
    projectId,
    TOOL_KEYS.droneReport,
    loadBlob,
    saveBlob
  );
  return sortEntries(rows.map(normalize));
}

export async function addDroneReport(
  projectId: string,
  row: Omit<DroneReportEntry, 'id' | 'createdAt'>
): Promise<DroneReportEntry> {
  const u = uid();
  const item: DroneReportEntry = normalize({
    id: rid(),
    createdAt: Date.now(),
    title: row.title,
    reportDate: row.reportDate,
    locationNotes: row.locationNotes,
    description: row.description,
    photoUrls: row.photoUrls ?? [],
  });

  if (getBudgetStorageMode() !== 'cloud') {
    const blob = await loadBlob(u);
    if (!blob.byProject[projectId]) blob.byProject[projectId] = [];
    blob.byProject[projectId].push(item);
    await saveBlob(u, blob);
    return item;
  }

  const rows = await loadProjectArrayOrMigrate<DroneReportEntry>(
    u,
    projectId,
    TOOL_KEYS.droneReport,
    loadBlob,
    saveBlob
  );
  rows.push(item);
  await saveProjectArraySnapshot(u, projectId, TOOL_KEYS.droneReport, rows);
  return item;
}

export async function updateDroneReport(
  projectId: string,
  id: string,
  patch: Partial<Omit<DroneReportEntry, 'id' | 'createdAt'>>
): Promise<void> {
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

  const rows = await loadProjectArrayOrMigrate<DroneReportEntry>(
    u,
    projectId,
    TOOL_KEYS.droneReport,
    loadBlob,
    saveBlob
  );
  const i = rows.findIndex((x) => x.id === id);
  if (i < 0) return;
  rows[i] = normalize({ ...rows[i], ...patch });
  await saveProjectArraySnapshot(u, projectId, TOOL_KEYS.droneReport, rows);
}

export async function deleteDroneReport(projectId: string, id: string): Promise<void> {
  const u = uid();
  if (getBudgetStorageMode() !== 'cloud') {
    const blob = await loadBlob(u);
    const list = blob.byProject[projectId];
    if (!list) return;
    blob.byProject[projectId] = list.filter((x) => x.id !== id);
    await saveBlob(u, blob);
    return;
  }

  const rows = await loadProjectArrayOrMigrate<DroneReportEntry>(
    u,
    projectId,
    TOOL_KEYS.droneReport,
    loadBlob,
    saveBlob
  );
  await saveProjectArraySnapshot(
    u,
    projectId,
    TOOL_KEYS.droneReport,
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
