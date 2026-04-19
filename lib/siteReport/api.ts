import { getAuth } from 'firebase/auth';

const BASE_URL = (process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8080').replace(/\/$/, '');

async function authHeaders(): Promise<HeadersInit> {
  const user = getAuth().currentUser;
  const token = user ? await user.getIdToken() : 'dev-test';
  return { Authorization: `Bearer ${token}` };
}

export interface SiteReport {
  id: string;
  user_id: string;
  title: string;
  project_id: string | null;
  author: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportStep {
  id: string;
  report_id: string;
  step_index: number;
  image_url: string | null;
  image_path: string | null;
  description: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_name: string | null;
  optional_field: string | null;
  created_at: string;
}

// ── Reports ──────────────────────────────────────────────────────────────────

export async function listReports(): Promise<SiteReport[]> {
  const res = await fetch(`${BASE_URL}/api/v1/reports`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to list reports');
  const json = await res.json();
  return json.reports as SiteReport[];
}

export async function getReport(id: string): Promise<{ report: SiteReport; steps: ReportStep[] }> {
  const res = await fetch(`${BASE_URL}/api/v1/reports/${id}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to get report');
  return res.json();
}

export async function createReport(data: {
  title: string;
  author?: string;
  project_id?: string;
}): Promise<SiteReport> {
  const res = await fetch(`${BASE_URL}/api/v1/reports`, {
    method: 'POST',
    headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to create report');
  const json = await res.json();
  return json.report as SiteReport;
}

export async function updateReport(
  id: string,
  data: { title?: string; author?: string; project_id?: string }
): Promise<SiteReport> {
  const res = await fetch(`${BASE_URL}/api/v1/reports/${id}`, {
    method: 'PATCH',
    headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to update report');
  const json = await res.json();
  return json.report as SiteReport;
}

export async function deleteReport(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/v1/reports/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete report');
}

// ── Steps ─────────────────────────────────────────────────────────────────────

export async function addStep(
  reportId: string,
  params: {
    imageUri: string;
    mimeType?: string;
    locationLat?: number;
    locationLng?: number;
    locationName?: string;
    optionalField?: string;
  }
): Promise<ReportStep> {
  const form = new FormData();
  form.append('image', {
    uri: params.imageUri,
    type: params.mimeType ?? 'image/jpeg',
    name: 'photo.jpg',
  } as unknown as Blob);
  if (params.locationLat != null) form.append('location_lat', String(params.locationLat));
  if (params.locationLng != null) form.append('location_lng', String(params.locationLng));
  if (params.locationName) form.append('location_name', params.locationName);
  if (params.optionalField) form.append('optional_field', params.optionalField);

  const res = await fetch(`${BASE_URL}/api/v1/reports/${reportId}/steps`, {
    method: 'POST',
    headers: await authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to add step');
  const json = await res.json();
  return json.step as ReportStep;
}

export async function updateStep(
  reportId: string,
  stepId: string,
  data: {
    description?: string;
    location_lat?: number;
    location_lng?: number;
    location_name?: string;
    optional_field?: string;
  }
): Promise<ReportStep> {
  const res = await fetch(`${BASE_URL}/api/v1/reports/${reportId}/steps/${stepId}`, {
    method: 'PATCH',
    headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to update step');
  const json = await res.json();
  return json.step as ReportStep;
}

export async function deleteStep(reportId: string, stepId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/v1/reports/${reportId}/steps/${stepId}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok && res.status !== 204) throw new Error('Failed to delete step');
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function fetchReportHtml(reportId: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/v1/reports/${reportId}/export?format=html`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to export report');
  return res.text();
}
