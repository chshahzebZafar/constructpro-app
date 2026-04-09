import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { awaitFirestoreMutation, getDocForConnectivity, getDocsForConnectivity } from '@/lib/firebase/firestoreConnectivity';
import { getIsOnline } from '@/lib/network/connectivity';
import { tFor } from '@/lib/i18n/translations';
import { getDb, isFirestoreReady } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import {
  getLastSelectedProjectId,
  getBudgetStorageMode,
  listBudgetProjects,
  createBudgetProject,
  deleteBudgetProject,
  setLastSelectedProjectId,
} from '@/lib/budget/repository';
import type { BudgetProject } from '@/lib/budget/types';
import { MAX_PUNCH_PHOTOS, deleteStoragePaths, uploadPunchImage } from './storageUpload';
import type { PunchItem, PunchItemInput, PunchStatus } from './types';

const LOCAL_KEY_PREFIX = 'constructpro_punch_v1_';

interface LocalPunchBlob {
  itemsByProject: Record<string, PunchItem[]>;
}

function useCloudPunch(): boolean {
  const s = useAuthStore.getState();
  return Boolean(isFirestoreReady() && getDb() && s.user?.uid && !s.temporaryDevLogin);
}

export function getPunchStorageMode(): 'cloud' | 'device' {
  return getBudgetStorageMode();
}

function requireUid(): string {
  const s = useAuthStore.getState();
  const uid = s.user?.uid ?? s.offlinePreviewUid;
  if (!uid) throw new Error('You need to be signed in to use the punch list.');
  return uid;
}

function punchT(key: 'tools.punch.error.photosNeedOnlineCreate' | 'tools.punch.error.photosNeedOnlineAdd'): string {
  return tFor(useAuthStore.getState().languageCode, key);
}

function randomId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
}

function tsToMs(v: unknown): number {
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return Date.now();
}

async function loadLocalBlob(uid: string): Promise<LocalPunchBlob> {
  const raw = await AsyncStorage.getItem(LOCAL_KEY_PREFIX + uid);
  if (!raw) return { itemsByProject: {} };
  try {
    const parsed = JSON.parse(raw) as LocalPunchBlob;
    if (!parsed.itemsByProject) return { itemsByProject: {} };
    return parsed;
  } catch {
    return { itemsByProject: {} };
  }
}

async function saveLocalBlob(uid: string, blob: LocalPunchBlob): Promise<void> {
  await AsyncStorage.setItem(LOCAL_KEY_PREFIX + uid, JSON.stringify(blob));
}

function punchCol(uid: string, projectId: string) {
  return collection(getDb()!, `users/${uid}/projects/${projectId}/punchItems`);
}

function docToItem(id: string, data: Record<string, unknown>): PunchItem {
  const urls = Array.isArray(data.photoUrls) ? (data.photoUrls as string[]) : [];
  const paths = Array.isArray(data.photoPaths) ? (data.photoPaths as string[]) : [];
  const st = data.status as string;
  const status: PunchStatus =
    st === 'in_progress' || st === 'done' || st === 'verified' ? st : 'open';
  return {
    id,
    title: String(data.title ?? ''),
    detail: String(data.detail ?? ''),
    status,
    assignee: String(data.assignee ?? ''),
    photoUrls: urls,
    photoPaths: paths,
    order: Number(data.order ?? 0) || 0,
    createdAt: tsToMs(data.createdAt),
  };
}

async function listItemsFirestore(uid: string, projectId: string): Promise<PunchItem[]> {
  const snap = await getDocsForConnectivity(punchCol(uid, projectId));
  const items = snap.docs.map((d) => docToItem(d.id, d.data() as Record<string, unknown>));
  items.sort((a, b) => a.order - b.order || b.createdAt - a.createdAt);
  return items;
}

async function nextOrderFirestore(uid: string, projectId: string): Promise<number> {
  const items = await listItemsFirestore(uid, projectId);
  if (items.length === 0) return 0;
  return Math.max(...items.map((i) => i.order)) + 1;
}

async function nextOrderLocal(uid: string, projectId: string): Promise<number> {
  const items = await listItemsLocal(uid, projectId);
  if (items.length === 0) return 0;
  return Math.max(...items.map((i) => i.order)) + 1;
}

async function listItemsLocal(uid: string, projectId: string): Promise<PunchItem[]> {
  const blob = await loadLocalBlob(uid);
  const items = blob.itemsByProject[projectId] ?? [];
  return [...items].sort((a, b) => a.order - b.order || b.createdAt - a.createdAt);
}

async function uploadPhotosForItem(
  uid: string,
  projectId: string,
  itemId: string,
  localUris: string[],
  mimeTypes: string[]
): Promise<{ photoUrls: string[]; photoPaths: string[] }> {
  const photoUrls: string[] = [];
  const photoPaths: string[] = [];
  for (let i = 0; i < localUris.length; i++) {
    const uri = localUris[i];
    const mime = mimeTypes[i] ?? 'image/jpeg';
    const { downloadUrl, storagePath } = await uploadPunchImage(uid, projectId, itemId, uri, mime);
    photoUrls.push(downloadUrl);
    photoPaths.push(storagePath);
  }
  return { photoUrls, photoPaths };
}

export async function listPunchItems(projectId: string): Promise<PunchItem[]> {
  const uid = requireUid();
  if (useCloudPunch()) return listItemsFirestore(uid, projectId);
  return listItemsLocal(uid, projectId);
}

export async function createPunchItem(
  projectId: string,
  input: PunchItemInput,
  options?: { localPhotoUris?: string[]; mimeTypes?: string[] }
): Promise<PunchItem> {
  const uid = requireUid();
  const title = input.title.trim();
  if (!title) throw new Error('Enter a title.');

  const localUris = options?.localPhotoUris ?? [];
  const mimeTypes = options?.mimeTypes ?? [];
  if (localUris.length > MAX_PUNCH_PHOTOS) {
    throw new Error(`You can attach up to ${MAX_PUNCH_PHOTOS} photos.`);
  }

  if (useCloudPunch()) {
    if (localUris.length > 0 && !getIsOnline()) {
      throw new Error('Connect to the internet to attach photos to punch items.');
    }
    const order = await nextOrderFirestore(uid, projectId);
    const itemId = randomId();
    const itemRef = doc(getDb()!, `users/${uid}/projects/${projectId}/punchItems`, itemId);
    await awaitFirestoreMutation(
      setDoc(itemRef, {
        title,
        detail: input.detail.trim(),
        status: input.status,
        assignee: input.assignee.trim(),
        photoUrls: [],
        photoPaths: [],
        order,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    let photoUrls: string[] = [];
    let photoPaths: string[] = [];
    if (localUris.length > 0) {
      const up = await uploadPhotosForItem(uid, projectId, itemId, localUris, mimeTypes);
      photoUrls = up.photoUrls;
      photoPaths = up.photoPaths;
      await awaitFirestoreMutation(
        updateDoc(itemRef, {
          photoUrls,
          photoPaths,
          updatedAt: serverTimestamp(),
        })
      );
    }
    await awaitFirestoreMutation(
      updateDoc(doc(getDb()!, `users/${uid}/projects`, projectId), {
        updatedAt: serverTimestamp(),
      })
    );
    return {
      id: itemId,
      title,
      detail: input.detail.trim(),
      status: input.status,
      assignee: input.assignee.trim(),
      photoUrls,
      photoPaths,
      order,
      createdAt: Date.now(),
    };
  }

  const order = await nextOrderLocal(uid, projectId);
  const blob = await loadLocalBlob(uid);
  if (!blob.itemsByProject[projectId]) blob.itemsByProject[projectId] = [];
  const itemId = randomId();
  const photoUrls = [...localUris];
  const item: PunchItem = {
    id: itemId,
    title,
    detail: input.detail.trim(),
    status: input.status,
    assignee: input.assignee.trim(),
    photoUrls,
    photoPaths: [],
    order,
    createdAt: Date.now(),
  };
  blob.itemsByProject[projectId].push(item);
  await saveLocalBlob(uid, blob);
  return item;
}

export async function updatePunchItem(
  projectId: string,
  itemId: string,
  patch: Partial<PunchItemInput> & { status?: PunchStatus },
  options?: { newLocalPhotoUris?: string[]; mimeTypes?: string[]; removePhotoIndexes?: number[] }
): Promise<void> {
  const uid = requireUid();
  const removeIdx = options?.removePhotoIndexes;
  const newUris = options?.newLocalPhotoUris ?? [];
  const mimeTypes = options?.mimeTypes ?? [];

  if (useCloudPunch()) {
    const itemRef = doc(getDb()!, `users/${uid}/projects/${projectId}/punchItems`, itemId);
    const snap = await getDocForConnectivity(itemRef);
    if (!snap.exists()) throw new Error('Item not found.');
    const cur = docToItem(snap.id, snap.data() as Record<string, unknown>);

    let photoUrls = [...cur.photoUrls];
    let photoPaths = [...cur.photoPaths];

    if (removeIdx && removeIdx.length > 0) {
      const toDeletePaths: string[] = [];
      for (const i of removeIdx) {
        if (i >= 0 && i < photoPaths.length) toDeletePaths.push(photoPaths[i]);
      }
      if (getIsOnline()) await deleteStoragePaths(toDeletePaths);
      const sorted = [...new Set(removeIdx)].sort((a, b) => b - a);
      for (const i of sorted) {
        if (i >= 0 && i < photoUrls.length) {
          photoUrls.splice(i, 1);
          photoPaths.splice(i, 1);
        }
      }
    }

    if (newUris.length > 0) {
      if (!getIsOnline()) {
        throw new Error(punchT('tools.punch.error.photosNeedOnlineAdd'));
      }
      const remaining = MAX_PUNCH_PHOTOS - photoUrls.length;
      const take = newUris.slice(0, Math.max(0, remaining));
      const up = await uploadPhotosForItem(uid, projectId, itemId, take, mimeTypes);
      photoUrls = [...photoUrls, ...up.photoUrls];
      photoPaths = [...photoPaths, ...up.photoPaths];
    }

    const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (patch.title !== undefined) data.title = patch.title.trim();
    if (patch.detail !== undefined) data.detail = patch.detail.trim();
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.assignee !== undefined) data.assignee = patch.assignee.trim();
    data.photoUrls = photoUrls;
    data.photoPaths = photoPaths;
    await awaitFirestoreMutation(updateDoc(itemRef, data));
    await awaitFirestoreMutation(
      updateDoc(doc(getDb()!, `users/${uid}/projects`, projectId), {
        updatedAt: serverTimestamp(),
      })
    );
    return;
  }

  const blob = await loadLocalBlob(uid);
  const list = blob.itemsByProject[projectId];
  if (!list) return;
  const idx = list.findIndex((x) => x.id === itemId);
  if (idx < 0) return;
  const cur = list[idx];
  let photoUrls = [...cur.photoUrls];

  if (removeIdx && removeIdx.length > 0) {
    const sorted = [...new Set(removeIdx)].sort((a, b) => b - a);
    for (const i of sorted) {
      if (i >= 0 && i < photoUrls.length) photoUrls.splice(i, 1);
    }
  }
  if (newUris.length > 0) {
    const remaining = MAX_PUNCH_PHOTOS - photoUrls.length;
    photoUrls = [...photoUrls, ...newUris.slice(0, Math.max(0, remaining))];
  }

  list[idx] = {
    ...cur,
    title: patch.title !== undefined ? patch.title.trim() : cur.title,
    detail: patch.detail !== undefined ? patch.detail.trim() : cur.detail,
    status: patch.status !== undefined ? patch.status : cur.status,
    assignee: patch.assignee !== undefined ? patch.assignee.trim() : cur.assignee,
    photoUrls,
    photoPaths: [],
  };
  await saveLocalBlob(uid, blob);
}

export async function deletePunchItem(projectId: string, itemId: string): Promise<void> {
  const uid = requireUid();
  if (useCloudPunch()) {
    const itemRef = doc(getDb()!, `users/${uid}/projects/${projectId}/punchItems`, itemId);
    const itemSnap = await getDocForConnectivity(itemRef);
    if (itemSnap.exists()) {
      const data = itemSnap.data() as { photoPaths?: string[] };
      if (getIsOnline()) await deleteStoragePaths(data.photoPaths ?? []);
    }
    await awaitFirestoreMutation(deleteDoc(itemRef));
    await awaitFirestoreMutation(
      updateDoc(doc(getDb()!, `users/${uid}/projects`, projectId), {
        updatedAt: serverTimestamp(),
      })
    );
    return;
  }
  const blob = await loadLocalBlob(uid);
  const list = blob.itemsByProject[projectId];
  if (!list) return;
  blob.itemsByProject[projectId] = list.filter((x) => x.id !== itemId);
  await saveLocalBlob(uid, blob);
}

export {
  listBudgetProjects,
  createBudgetProject,
  deleteBudgetProject,
  getLastSelectedProjectId,
  setLastSelectedProjectId,
};
export type { BudgetProject };
