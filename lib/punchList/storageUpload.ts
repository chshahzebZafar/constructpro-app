import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getStorageInstance } from '@/lib/firebase/config';

export const MAX_PUNCH_PHOTOS = 6;

export async function uploadPunchImage(
  uid: string,
  projectId: string,
  itemId: string,
  localUri: string,
  mimeType: string
): Promise<{ downloadUrl: string; storagePath: string }> {
  const storage = getStorageInstance();
  if (!storage) throw new Error('Storage is not available.');
  const safeMime = mimeType || 'image/jpeg';
  const ext = safeMime.includes('png') ? 'png' : 'jpg';
  const storagePath = `users/${uid}/projects/${projectId}/punchItems/${itemId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const storageRef = ref(storage, storagePath);
  const response = await fetch(localUri);
  const blob = await response.blob();
  await uploadBytes(storageRef, blob, { contentType: safeMime });
  const downloadUrl = await getDownloadURL(storageRef);
  return { downloadUrl, storagePath };
}

export async function deleteStoragePaths(paths: string[]): Promise<void> {
  const storage = getStorageInstance();
  if (!storage || paths.length === 0) return;
  for (const p of paths) {
    try {
      await deleteObject(ref(storage, p));
    } catch {
      /* stale or already deleted */
    }
  }
}
