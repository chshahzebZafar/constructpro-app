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
import type { ResourceBooking, ResourceKind } from './types';

const PREFIX = 'constructpro_resource_scheduler_v1_';

interface Blob {
  byProject: Record<string, ResourceBooking[]>;
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

function normalizeKind(k: unknown): ResourceKind {
  if (k === 'person' || k === 'plant' || k === 'material') return k;
  return 'person';
}

function normalize(e: ResourceBooking): ResourceBooking {
  return {
    ...e,
    kind: normalizeKind(e.kind),
    name: e.name ?? '',
    quantityLabel: e.quantityLabel ?? '',
    startDate: e.startDate ?? '',
    endDate: e.endDate ?? '',
    notes: e.notes ?? '',
  };
}

function sortBookings(list: ResourceBooking[]): ResourceBooking[] {
  return [...list].sort((a, b) => {
    if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
    return a.name.localeCompare(b.name);
  });
}

export async function listResourceBookings(projectId: string): Promise<ResourceBooking[]> {
  const u = uid();
  const b = await loadBlob(u);
  return sortBookings((b.byProject[projectId] ?? []).map(normalize));
}

export async function addResourceBooking(
  projectId: string,
  row: Omit<ResourceBooking, 'id' | 'createdAt'>
): Promise<ResourceBooking> {
  const u = uid();
  const blob = await loadBlob(u);
  if (!blob.byProject[projectId]) blob.byProject[projectId] = [];
  const item: ResourceBooking = normalize({
    id: rid(),
    createdAt: Date.now(),
    kind: row.kind,
    name: row.name,
    quantityLabel: row.quantityLabel,
    startDate: row.startDate,
    endDate: row.endDate,
    notes: row.notes,
  });
  blob.byProject[projectId].push(item);
  await saveBlob(u, blob);
  return item;
}

export async function updateResourceBooking(
  projectId: string,
  id: string,
  patch: Partial<Omit<ResourceBooking, 'id' | 'createdAt'>>
): Promise<void> {
  const u = uid();
  const blob = await loadBlob(u);
  const list = blob.byProject[projectId];
  if (!list) return;
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return;
  list[i] = normalize({ ...list[i], ...patch });
  await saveBlob(u, blob);
}

export async function deleteResourceBooking(projectId: string, id: string): Promise<void> {
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
