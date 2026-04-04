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
import type { TaskRow } from './types';

const PREFIX = 'constructpro_tasks_v1_';

interface Blob {
  byProject: Record<string, TaskRow[]>;
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

async function nextOrder(projectId: string): Promise<number> {
  const list = await listTasks(projectId);
  if (list.length === 0) return 0;
  return Math.max(...list.map((t) => t.order)) + 1;
}

export async function listTasks(projectId: string): Promise<TaskRow[]> {
  const u = uid();
  const b = await loadBlob(u);
  return [...(b.byProject[projectId] ?? [])].sort((a, b) => a.order - b.order);
}

export async function addTask(projectId: string, title: string, dueDate: string): Promise<TaskRow> {
  const u = uid();
  const b = await loadBlob(u);
  if (!b.byProject[projectId]) b.byProject[projectId] = [];
  const order = await nextOrder(projectId);
  const row: TaskRow = {
    id: rid(),
    title: title.trim(),
    done: false,
    dueDate: dueDate.trim(),
    order,
  };
  b.byProject[projectId].push(row);
  await saveBlob(u, b);
  return row;
}

export async function updateTask(
  projectId: string,
  id: string,
  patch: Partial<Pick<TaskRow, 'title' | 'done' | 'dueDate'>>
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

export async function deleteTask(projectId: string, id: string): Promise<void> {
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
