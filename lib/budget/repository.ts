import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { awaitFirestoreMutation, getDocsForConnectivity } from '@/lib/firebase/firestoreConnectivity';
import { getDb, isFirestoreReady, requireFirestore } from '@/lib/firebase/config';
import {
  projectBudgetLinesRef,
  userProjectDocRef,
  userProjectsRef,
} from '@/lib/firebase/firestorePaths';
import { deleteToolSnapshotsForProject } from '@/lib/firestore/toolSnapshot';
import { deleteAuxiliaryLocalProjectData } from '@/lib/projects/localAuxiliaryCleanup';
import { deletePunchDataForProject } from '@/lib/punchList/projectCleanup';
import { useAuthStore } from '@/store/useAuthStore';
import type { BudgetLine, BudgetLineInput, BudgetProject } from './types';

const LOCAL_KEY_PREFIX = 'constructpro_budget_v1_';
const LAST_PROJECT_KEY = 'constructpro_budget_last_project_';

interface LocalBudgetBlob {
  projects: BudgetProject[];
  linesByProject: Record<string, BudgetLine[]>;
}

function useCloudBudget(): boolean {
  const s = useAuthStore.getState();
  return Boolean(isFirestoreReady() && getDb() && s.user?.uid && !s.temporaryDevLogin);
}

export function getBudgetStorageMode(): 'cloud' | 'device' {
  return useCloudBudget() ? 'cloud' : 'device';
}

function requireUid(): string {
  const s = useAuthStore.getState();
  const uid = s.user?.uid ?? s.offlinePreviewUid;
  if (!uid) throw new Error('You need to be signed in to use the budget tracker.');
  return uid;
}

function randomId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
}

function tsToMs(v: unknown): number {
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return Date.now();
}

async function loadLocalBlob(uid: string): Promise<LocalBudgetBlob> {
  const raw = await AsyncStorage.getItem(LOCAL_KEY_PREFIX + uid);
  if (!raw) return { projects: [], linesByProject: {} };
  try {
    const parsed = JSON.parse(raw) as LocalBudgetBlob;
    if (!parsed.projects || !parsed.linesByProject) return { projects: [], linesByProject: {} };
    return parsed;
  } catch {
    return { projects: [], linesByProject: {} };
  }
}

async function saveLocalBlob(uid: string, blob: LocalBudgetBlob): Promise<void> {
  await AsyncStorage.setItem(LOCAL_KEY_PREFIX + uid, JSON.stringify(blob));
}

// ——— Firestore ———

function projectsCol(uid: string) {
  const db = requireFirestore();
  return userProjectsRef(db, uid);
}

function linesCol(uid: string, projectId: string) {
  const db = requireFirestore();
  return projectBudgetLinesRef(db, uid, projectId);
}

async function listProjectsFirestore(uid: string): Promise<BudgetProject[]> {
  const snap = await getDocsForConnectivity(projectsCol(uid));
  const list: BudgetProject[] = snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      name: String(x.name ?? 'Project'),
      createdAt: tsToMs(x.createdAt),
    };
  });
  list.sort((a, b) => b.createdAt - a.createdAt);
  return list;
}

async function createProjectFirestore(uid: string, name: string): Promise<BudgetProject> {
  const id = randomId();
  const ref = doc(projectsCol(uid), id);
  const trimmed = name.trim();
  await awaitFirestoreMutation(
    setDoc(ref, {
      name: trimmed,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  return { id, name: trimmed, createdAt: Date.now() };
}

async function deleteProjectFirestore(uid: string, projectId: string): Promise<void> {
  const db = requireFirestore();
  const ls = await getDocsForConnectivity(linesCol(uid, projectId));
  let batch = writeBatch(db);
  let n = 0;
  for (const d of ls.docs) {
    batch.delete(d.ref);
    n++;
    if (n >= 400) {
      await awaitFirestoreMutation(batch.commit());
      batch = writeBatch(db);
      n = 0;
    }
  }
  if (n > 0) await awaitFirestoreMutation(batch.commit());
  await deletePunchDataForProject(uid, projectId);
  await deleteToolSnapshotsForProject(uid, projectId);
  await deleteAuxiliaryLocalProjectData(uid, projectId);
  await awaitFirestoreMutation(deleteDoc(userProjectDocRef(db, uid, projectId)));
}

function docToLine(id: string, data: Record<string, unknown>): BudgetLine {
  return {
    id,
    category: String(data.category ?? 'Other'),
    label: String(data.label ?? ''),
    planned: Number(data.planned ?? 0) || 0,
    actual: Number(data.actual ?? 0) || 0,
    order: Number(data.order ?? 0) || 0,
  };
}

async function listLinesFirestore(uid: string, projectId: string): Promise<BudgetLine[]> {
  const snap = await getDocsForConnectivity(linesCol(uid, projectId));
  const lines = snap.docs.map((d) => docToLine(d.id, d.data() as Record<string, unknown>));
  lines.sort((a, b) => a.order - b.order || a.category.localeCompare(b.category));
  return lines;
}

async function addLineFirestore(uid: string, projectId: string, input: BudgetLineInput, order: number) {
  const db = requireFirestore();
  const lineId = randomId();
  const lineRef = doc(projectBudgetLinesRef(db, uid, projectId), lineId);
  await awaitFirestoreMutation(
    Promise.all([
      setDoc(lineRef, {
        category: input.category.trim() || 'Other',
        label: input.label.trim(),
        planned: input.planned,
        actual: input.actual,
        order,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      updateDoc(userProjectDocRef(db, uid, projectId), {
        updatedAt: serverTimestamp(),
      }),
    ])
  );
}

async function updateLineFirestore(
  uid: string,
  projectId: string,
  lineId: string,
  patch: Partial<BudgetLineInput>
) {
  const db = requireFirestore();
  const ref = doc(projectBudgetLinesRef(db, uid, projectId), lineId);
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.category !== undefined) data.category = patch.category.trim() || 'Other';
  if (patch.label !== undefined) data.label = patch.label.trim();
  if (patch.planned !== undefined) data.planned = patch.planned;
  if (patch.actual !== undefined) data.actual = patch.actual;
  await awaitFirestoreMutation(updateDoc(ref, data));
}

async function deleteLineFirestore(uid: string, projectId: string, lineId: string) {
  const db = requireFirestore();
  await awaitFirestoreMutation(deleteDoc(doc(projectBudgetLinesRef(db, uid, projectId), lineId)));
  await awaitFirestoreMutation(
    updateDoc(userProjectDocRef(db, uid, projectId), {
      updatedAt: serverTimestamp(),
    })
  );
}

// ——— Local ———

async function listProjectsLocal(uid: string): Promise<BudgetProject[]> {
  const blob = await loadLocalBlob(uid);
  return [...blob.projects].sort((a, b) => b.createdAt - a.createdAt);
}

async function createProjectLocal(uid: string, name: string): Promise<BudgetProject> {
  const blob = await loadLocalBlob(uid);
  const p: BudgetProject = {
    id: randomId(),
    name: name.trim(),
    createdAt: Date.now(),
  };
  blob.projects.push(p);
  blob.linesByProject[p.id] = [];
  await saveLocalBlob(uid, blob);
  return p;
}

async function deleteProjectLocal(uid: string, projectId: string): Promise<void> {
  await deletePunchDataForProject(uid, projectId);
  await deleteAuxiliaryLocalProjectData(uid, projectId);
  const blob = await loadLocalBlob(uid);
  blob.projects = blob.projects.filter((p) => p.id !== projectId);
  delete blob.linesByProject[projectId];
  await saveLocalBlob(uid, blob);
}

async function updateProjectNameFirestore(uid: string, projectId: string, name: string): Promise<void> {
  const db = requireFirestore();
  await awaitFirestoreMutation(
    updateDoc(userProjectDocRef(db, uid, projectId), {
      name: name.trim(),
      updatedAt: serverTimestamp(),
    })
  );
}

async function updateProjectNameLocal(uid: string, projectId: string, name: string): Promise<void> {
  const blob = await loadLocalBlob(uid);
  const i = blob.projects.findIndex((p) => p.id === projectId);
  if (i < 0) return;
  blob.projects[i] = { ...blob.projects[i], name: name.trim() };
  await saveLocalBlob(uid, blob);
}

async function listLinesLocal(uid: string, projectId: string): Promise<BudgetLine[]> {
  const blob = await loadLocalBlob(uid);
  const lines = blob.linesByProject[projectId] ?? [];
  return [...lines].sort((a, b) => a.order - b.order || a.category.localeCompare(b.category));
}

async function nextOrderLocal(uid: string, projectId: string): Promise<number> {
  const lines = await listLinesLocal(uid, projectId);
  if (lines.length === 0) return 0;
  return Math.max(...lines.map((l) => l.order)) + 1;
}

async function addLineLocal(uid: string, projectId: string, input: BudgetLineInput, order: number) {
  const blob = await loadLocalBlob(uid);
  if (!blob.linesByProject[projectId]) blob.linesByProject[projectId] = [];
  const line: BudgetLine = {
    id: randomId(),
    category: input.category.trim() || 'Other',
    label: input.label.trim(),
    planned: input.planned,
    actual: input.actual,
    order,
  };
  blob.linesByProject[projectId].push(line);
  await saveLocalBlob(uid, blob);
}

async function updateLineLocal(uid: string, projectId: string, lineId: string, patch: Partial<BudgetLineInput>) {
  const blob = await loadLocalBlob(uid);
  const lines = blob.linesByProject[projectId];
  if (!lines) return;
  const i = lines.findIndex((l) => l.id === lineId);
  if (i < 0) return;
  const cur = lines[i];
  lines[i] = {
    ...cur,
    category: patch.category !== undefined ? patch.category.trim() || 'Other' : cur.category,
    label: patch.label !== undefined ? patch.label.trim() : cur.label,
    planned: patch.planned !== undefined ? patch.planned : cur.planned,
    actual: patch.actual !== undefined ? patch.actual : cur.actual,
  };
  await saveLocalBlob(uid, blob);
}

async function deleteLineLocal(uid: string, projectId: string, lineId: string) {
  const blob = await loadLocalBlob(uid);
  const lines = blob.linesByProject[projectId];
  if (!lines) return;
  blob.linesByProject[projectId] = lines.filter((l) => l.id !== lineId);
  await saveLocalBlob(uid, blob);
}

async function nextOrderFirestore(uid: string, projectId: string): Promise<number> {
  const lines = await listLinesFirestore(uid, projectId);
  if (lines.length === 0) return 0;
  return Math.max(...lines.map((l) => l.order)) + 1;
}

// ——— Public API ———

export async function listBudgetProjects(): Promise<BudgetProject[]> {
  const uid = requireUid();
  if (useCloudBudget()) return listProjectsFirestore(uid);
  return listProjectsLocal(uid);
}

export async function createBudgetProject(name: string): Promise<BudgetProject> {
  const uid = requireUid();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Enter a project name.');
  if (useCloudBudget()) return createProjectFirestore(uid, trimmed);
  return createProjectLocal(uid, trimmed);
}

export async function deleteBudgetProject(projectId: string): Promise<void> {
  const uid = requireUid();
  if (useCloudBudget()) return deleteProjectFirestore(uid, projectId);
  return deleteProjectLocal(uid, projectId);
}

export async function updateBudgetProjectName(projectId: string, name: string): Promise<void> {
  const uid = requireUid();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Enter a project name.');
  if (useCloudBudget()) return updateProjectNameFirestore(uid, projectId, trimmed);
  return updateProjectNameLocal(uid, projectId, trimmed);
}

export async function listBudgetLines(projectId: string): Promise<BudgetLine[]> {
  const uid = requireUid();
  if (useCloudBudget()) return listLinesFirestore(uid, projectId);
  return listLinesLocal(uid, projectId);
}

export async function addBudgetLine(projectId: string, input: BudgetLineInput): Promise<void> {
  const uid = requireUid();
  const order = useCloudBudget()
    ? await nextOrderFirestore(uid, projectId)
    : await nextOrderLocal(uid, projectId);
  if (useCloudBudget()) return addLineFirestore(uid, projectId, input, order);
  return addLineLocal(uid, projectId, input, order);
}

export async function updateBudgetLine(
  projectId: string,
  lineId: string,
  patch: Partial<BudgetLineInput>
): Promise<void> {
  const uid = requireUid();
  if (useCloudBudget()) return updateLineFirestore(uid, projectId, lineId, patch);
  return updateLineLocal(uid, projectId, lineId, patch);
}

export async function deleteBudgetLine(projectId: string, lineId: string): Promise<void> {
  const uid = requireUid();
  if (useCloudBudget()) return deleteLineFirestore(uid, projectId, lineId);
  return deleteLineLocal(uid, projectId, lineId);
}

export async function getLastSelectedProjectId(): Promise<string | null> {
  const s = useAuthStore.getState();
  const uid = s.user?.uid ?? s.offlinePreviewUid;
  if (!uid) return null;
  return AsyncStorage.getItem(LAST_PROJECT_KEY + uid);
}

export async function setLastSelectedProjectId(projectId: string | null): Promise<void> {
  const s = useAuthStore.getState();
  const uid = s.user?.uid ?? s.offlinePreviewUid;
  if (!uid) return;
  const key = LAST_PROJECT_KEY + uid;
  if (projectId) await AsyncStorage.setItem(key, projectId);
  else await AsyncStorage.removeItem(key);
}
