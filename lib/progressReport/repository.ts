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
import type { ProgressReportEntry } from './types';

const PREFIX = 'constructpro_progress_report_v1_';

interface Blob {
  byProject: Record<string, ProgressReportEntry[]>;
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

function sortEntries(list: ProgressReportEntry[]): ProgressReportEntry[] {
  return [...list].sort((a, b) => {
    if (a.periodEnd !== b.periodEnd) return b.periodEnd.localeCompare(a.periodEnd);
    return b.createdAt - a.createdAt;
  });
}

function normalize(e: ProgressReportEntry): ProgressReportEntry {
  return {
    ...e,
    photoUrls: Array.isArray(e.photoUrls) ? e.photoUrls : [],
    title: e.title ?? '',
    summary: e.summary ?? '',
    workCompleted: e.workCompleted ?? '',
    milestones: e.milestones ?? '',
    nextSteps: e.nextSteps ?? '',
    issuesRisks: e.issuesRisks ?? '',
    preparedBy: e.preparedBy ?? '',
    periodStart: e.periodStart ?? '',
    periodEnd: e.periodEnd ?? '',
  };
}

export async function listProgressReports(projectId: string): Promise<ProgressReportEntry[]> {
  const u = uid();
  if (getBudgetStorageMode() !== 'cloud') {
    const b = await loadBlob(u);
    const raw = b.byProject[projectId] ?? [];
    return sortEntries(raw.map(normalize));
  }
  const rows = await loadProjectArrayOrMigrate<ProgressReportEntry>(
    u,
    projectId,
    TOOL_KEYS.progressReport,
    loadBlob,
    saveBlob
  );
  return sortEntries(rows.map(normalize));
}

export async function addProgressReport(
  projectId: string,
  row: Omit<ProgressReportEntry, 'id' | 'createdAt'>
): Promise<ProgressReportEntry> {
  const u = uid();
  const item: ProgressReportEntry = {
    ...row,
    photoUrls: Array.isArray(row.photoUrls) ? row.photoUrls : [],
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

  const rows = await loadProjectArrayOrMigrate<ProgressReportEntry>(
    u,
    projectId,
    TOOL_KEYS.progressReport,
    loadBlob,
    saveBlob
  );
  rows.push(item);
  await saveProjectArraySnapshot(u, projectId, TOOL_KEYS.progressReport, rows);
  return item;
}

export async function updateProgressReport(
  projectId: string,
  id: string,
  patch: Partial<Omit<ProgressReportEntry, 'id' | 'createdAt'>>
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

  const rows = await loadProjectArrayOrMigrate<ProgressReportEntry>(
    u,
    projectId,
    TOOL_KEYS.progressReport,
    loadBlob,
    saveBlob
  );
  const i = rows.findIndex((x) => x.id === id);
  if (i < 0) return;
  rows[i] = { ...rows[i], ...patch };
  await saveProjectArraySnapshot(u, projectId, TOOL_KEYS.progressReport, rows);
}

export async function deleteProgressReport(projectId: string, id: string): Promise<void> {
  const u = uid();
  if (getBudgetStorageMode() !== 'cloud') {
    const blob = await loadBlob(u);
    const list = blob.byProject[projectId];
    if (!list) return;
    blob.byProject[projectId] = list.filter((x) => x.id !== id);
    await saveBlob(u, blob);
    return;
  }

  const rows = await loadProjectArrayOrMigrate<ProgressReportEntry>(
    u,
    projectId,
    TOOL_KEYS.progressReport,
    loadBlob,
    saveBlob
  );
  await saveProjectArraySnapshot(
    u,
    projectId,
    TOOL_KEYS.progressReport,
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
