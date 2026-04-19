import { getAuth } from 'firebase/auth';

const BASE_URL = (process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8080').replace(/\/$/, '');

async function authHeaders(): Promise<HeadersInit> {
  const user = getAuth().currentUser;
  const token = user ? await user.getIdToken() : 'dev-test';
  return { Authorization: `Bearer ${token}` };
}

export type FileType = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'dwg' | 'dxf' | 'jpg' | 'png' | 'tiff' | 'unknown';

export interface ProjectFile {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  file_type: FileType;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  file_url: string;
  created_at: string;
}

export async function listFiles(projectId?: string): Promise<ProjectFile[]> {
  const params = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
  const res = await fetch(`${BASE_URL}/api/v1/files${params}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to list files');
  const json = await res.json();
  return json.files as ProjectFile[];
}

export async function uploadFile(params: {
  fileUri: string;
  fileName: string;
  mimeType: string;
  projectId?: string;
}): Promise<ProjectFile> {
  const form = new FormData();
  form.append('file', {
    uri: params.fileUri,
    type: params.mimeType,
    name: params.fileName,
  } as unknown as Blob);
  if (params.projectId) form.append('project_id', params.projectId);

  const res = await fetch(`${BASE_URL}/api/v1/files`, {
    method: 'POST',
    headers: await authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to upload file');
  const json = await res.json();
  return json.file as ProjectFile;
}

export async function getFreshUrl(fileId: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/v1/files/${fileId}/url`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to refresh URL');
  const json = await res.json();
  return json.url as string;
}

export async function deleteFile(fileId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/v1/files/${fileId}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete file');
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
