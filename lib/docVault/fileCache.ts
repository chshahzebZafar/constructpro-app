import { File, Directory, Paths } from 'expo-file-system';

function getCacheDir(): Directory {
  return new Directory(Paths.cache, 'doc-vault');
}

function getCachedFile(fileId: string, ext: string): File {
  return new File(getCacheDir(), `${fileId}.${ext}`);
}

export function getCachedPathSync(fileId: string, ext: string): string | null {
  const f = getCachedFile(fileId, ext);
  return f.exists ? f.uri : null;
}

export async function getCachedPath(fileId: string, ext: string): Promise<string | null> {
  return getCachedPathSync(fileId, ext);
}

export async function downloadToCache(
  fileId: string,
  ext: string,
  remoteUrl: string,
): Promise<string> {
  const dir = getCacheDir();
  if (!dir.exists) dir.create();

  const dest = getCachedFile(fileId, ext);
  const downloaded = await File.downloadFileAsync(remoteUrl, dest, { idempotent: true });
  return downloaded.uri;
}

export function deleteFromCache(fileId: string, ext: string): void {
  const f = getCachedFile(fileId, ext);
  if (f.exists) f.delete();
}

export function getCacheSize(): number {
  try {
    const dir = getCacheDir();
    if (!dir.exists) return 0;
    return dir.list().reduce((total, item) => {
      if (item instanceof File) return total + (item.size ?? 0);
      return total;
    }, 0);
  } catch {
    return 0;
  }
}

export function clearAllCache(): void {
  const dir = getCacheDir();
  if (dir.exists) dir.delete();
}
