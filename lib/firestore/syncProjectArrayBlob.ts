import { getBudgetStorageMode } from '@/lib/budget/repository';
import { getToolSnapshot, setToolSnapshot, toolSnapshotDocExists, type ToolSnapshotKey } from '@/lib/firestore/toolSnapshot';

interface ByProjectBlob<T> {
  byProject: Record<string, T[]>;
}

/**
 * Loads a `byProject[projectId]` array from Firestore tool snapshot when cloud,
 * otherwise from the provided local blob helpers. Migrates local → Firestore once.
 */
export async function loadProjectArrayOrMigrate<T>(
  uid: string,
  projectId: string,
  key: ToolSnapshotKey,
  loadBlob: (u: string) => Promise<ByProjectBlob<T>>,
  saveBlob: (u: string, b: ByProjectBlob<T>) => Promise<void>
): Promise<T[]> {
  if (getBudgetStorageMode() !== 'cloud') {
    const b = await loadBlob(uid);
    return [...(b.byProject[projectId] ?? [])];
  }

  const exists = await toolSnapshotDocExists(uid, projectId, key);
  if (!exists) {
    const b = await loadBlob(uid);
    const rows = [...(b.byProject[projectId] ?? [])];
    await setToolSnapshot(uid, projectId, key, rows);
    if (b.byProject[projectId]) {
      delete b.byProject[projectId];
      await saveBlob(uid, b);
    }
  }

  const data = await getToolSnapshot<T[]>(uid, projectId, key);
  return Array.isArray(data) ? [...data] : [];
}

export async function saveProjectArraySnapshot<T>(
  uid: string,
  projectId: string,
  key: ToolSnapshotKey,
  rows: T[]
): Promise<void> {
  await setToolSnapshot(uid, projectId, key, rows);
}
