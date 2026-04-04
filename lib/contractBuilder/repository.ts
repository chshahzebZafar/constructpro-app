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
import type { ContractDraft, ContractTemplateId } from './types';

const PREFIX = 'constructpro_contracts_v1_';

interface Blob {
  byProject: Record<string, ContractDraft[]>;
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

function normalizeFields(e: Omit<ContractDraft, 'id' | 'createdAt'>): Omit<ContractDraft, 'id' | 'createdAt'> {
  const tid = e.templateId as ContractTemplateId | undefined;
  const templateId: ContractTemplateId =
    tid === 'time_and_materials' || tid === 'subcontract' || tid === 'fixed_price' ? tid : 'fixed_price';
  return {
    ...e,
    templateId,
    effectiveDate: e.effectiveDate ?? '',
    partyClientName: e.partyClientName ?? '',
    partyContractorName: e.partyContractorName ?? '',
    projectTitle: e.projectTitle ?? '',
    siteAddress: e.siteAddress ?? '',
    scopeOfWork: e.scopeOfWork ?? '',
    contractPrice: e.contractPrice ?? '',
    paymentTerms: e.paymentTerms ?? '',
    scheduleCompletion: e.scheduleCompletion ?? '',
    notToExceed: e.notToExceed ?? '',
    primeContractRef: e.primeContractRef ?? '',
    changeOrderPolicy: e.changeOrderPolicy ?? '',
    warrantyNotes: e.warrantyNotes ?? '',
    additionalTerms: e.additionalTerms ?? '',
  };
}

function normalize(e: ContractDraft): ContractDraft {
  return {
    ...e,
    ...normalizeFields(e),
  };
}

function sortDrafts(list: ContractDraft[]): ContractDraft[] {
  return [...list].sort((a, b) => b.createdAt - a.createdAt);
}

export async function listContractDrafts(projectId: string): Promise<ContractDraft[]> {
  const u = uid();
  const b = await loadBlob(u);
  const raw = b.byProject[projectId] ?? [];
  return sortDrafts(raw.map(normalize));
}

export async function addContractDraft(
  projectId: string,
  row: Omit<ContractDraft, 'id' | 'createdAt'>
): Promise<ContractDraft> {
  const u = uid();
  const blob = await loadBlob(u);
  if (!blob.byProject[projectId]) blob.byProject[projectId] = [];
  const item: ContractDraft = {
    id: rid(),
    createdAt: Date.now(),
    ...normalizeFields(row),
  };
  blob.byProject[projectId].push(item);
  await saveBlob(u, blob);
  return item;
}

export async function updateContractDraft(
  projectId: string,
  id: string,
  patch: Partial<Omit<ContractDraft, 'id' | 'createdAt'>>
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

export async function deleteContractDraft(projectId: string, id: string): Promise<void> {
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
