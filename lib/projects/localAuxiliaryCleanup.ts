import AsyncStorage from '@react-native-async-storage/async-storage';

const MILESTONE_PREFIX = 'constructpro_milestones_v1_';
const PPE_PREFIX = 'constructpro_ppe_v1_';
const TASK_PREFIX = 'constructpro_tasks_v1_';
const PERMIT_PREFIX = 'constructpro_permits_v1_';
const INCIDENT_PREFIX = 'constructpro_incidents_v1_';
const RFI_PREFIX = 'constructpro_rfi_v1_';
const DAILY_SITE_LOG_PREFIX = 'constructpro_daily_site_log_v1_';
const PROGRESS_REPORT_PREFIX = 'constructpro_progress_report_v1_';
const CONTRACT_BUILDER_PREFIX = 'constructpro_contracts_v1_';
const RESOURCE_SCHEDULER_PREFIX = 'constructpro_resource_scheduler_v1_';
const DRONE_REPORT_PREFIX = 'constructpro_drone_report_v1_';
const CPM_PREFIX = 'constructpro_cpm_v1_';
const GANTT_PREFIX = 'constructpro_gantt_v1_';
const BIM_LINKS_PREFIX = 'constructpro_bim_links_v1_';

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Remove project-scoped local data for tools that store AsyncStorage blobs (milestones, PPE, tasks). */
export async function deleteAuxiliaryLocalProjectData(uid: string, projectId: string): Promise<void> {
  const ops: Promise<void>[] = [];

  const mRaw = await AsyncStorage.getItem(MILESTONE_PREFIX + uid);
  const mBlob = parse(mRaw, { byProject: {} as Record<string, unknown> });
  if (mBlob.byProject && mBlob.byProject[projectId]) {
    delete mBlob.byProject[projectId];
    ops.push(AsyncStorage.setItem(MILESTONE_PREFIX + uid, JSON.stringify(mBlob)));
  }

  const pRaw = await AsyncStorage.getItem(PPE_PREFIX + uid);
  const pBlob = parse(pRaw, { byProject: {} as Record<string, unknown> });
  if (pBlob.byProject && pBlob.byProject[projectId]) {
    delete pBlob.byProject[projectId];
    ops.push(AsyncStorage.setItem(PPE_PREFIX + uid, JSON.stringify(pBlob)));
  }

  const tRaw = await AsyncStorage.getItem(TASK_PREFIX + uid);
  const tBlob = parse(tRaw, { byProject: {} as Record<string, unknown> });
  if (tBlob.byProject && tBlob.byProject[projectId]) {
    delete tBlob.byProject[projectId];
    ops.push(AsyncStorage.setItem(TASK_PREFIX + uid, JSON.stringify(tBlob)));
  }

  const permRaw = await AsyncStorage.getItem(PERMIT_PREFIX + uid);
  const permBlob = parse(permRaw, { byProject: {} as Record<string, unknown> });
  if (permBlob.byProject && permBlob.byProject[projectId]) {
    delete permBlob.byProject[projectId];
    ops.push(AsyncStorage.setItem(PERMIT_PREFIX + uid, JSON.stringify(permBlob)));
  }

  const incRaw = await AsyncStorage.getItem(INCIDENT_PREFIX + uid);
  const incBlob = parse(incRaw, { byProject: {} as Record<string, unknown> });
  if (incBlob.byProject && incBlob.byProject[projectId]) {
    delete incBlob.byProject[projectId];
    ops.push(AsyncStorage.setItem(INCIDENT_PREFIX + uid, JSON.stringify(incBlob)));
  }

  const rfiRaw = await AsyncStorage.getItem(RFI_PREFIX + uid);
  const rfiBlob = parse(rfiRaw, { byProject: {} as Record<string, unknown> });
  if (rfiBlob.byProject && rfiBlob.byProject[projectId]) {
    delete rfiBlob.byProject[projectId];
    ops.push(AsyncStorage.setItem(RFI_PREFIX + uid, JSON.stringify(rfiBlob)));
  }

  const dslRaw = await AsyncStorage.getItem(DAILY_SITE_LOG_PREFIX + uid);
  const dslBlob = parse(dslRaw, { byProject: {} as Record<string, unknown> });
  if (dslBlob.byProject && dslBlob.byProject[projectId]) {
    delete dslBlob.byProject[projectId];
    ops.push(AsyncStorage.setItem(DAILY_SITE_LOG_PREFIX + uid, JSON.stringify(dslBlob)));
  }

  const prRaw = await AsyncStorage.getItem(PROGRESS_REPORT_PREFIX + uid);
  const prBlob = parse(prRaw, { byProject: {} as Record<string, unknown> });
  if (prBlob.byProject && prBlob.byProject[projectId]) {
    delete prBlob.byProject[projectId];
    ops.push(AsyncStorage.setItem(PROGRESS_REPORT_PREFIX + uid, JSON.stringify(prBlob)));
  }

  const cbRaw = await AsyncStorage.getItem(CONTRACT_BUILDER_PREFIX + uid);
  const cbBlob = parse(cbRaw, { byProject: {} as Record<string, unknown> });
  if (cbBlob.byProject && cbBlob.byProject[projectId]) {
    delete cbBlob.byProject[projectId];
    ops.push(AsyncStorage.setItem(CONTRACT_BUILDER_PREFIX + uid, JSON.stringify(cbBlob)));
  }

  const rsRaw = await AsyncStorage.getItem(RESOURCE_SCHEDULER_PREFIX + uid);
  const rsBlob = parse(rsRaw, { byProject: {} as Record<string, unknown> });
  if (rsBlob.byProject && rsBlob.byProject[projectId]) {
    delete rsBlob.byProject[projectId];
    ops.push(AsyncStorage.setItem(RESOURCE_SCHEDULER_PREFIX + uid, JSON.stringify(rsBlob)));
  }

  const drRaw = await AsyncStorage.getItem(DRONE_REPORT_PREFIX + uid);
  const drBlob = parse(drRaw, { byProject: {} as Record<string, unknown> });
  if (drBlob.byProject && drBlob.byProject[projectId]) {
    delete drBlob.byProject[projectId];
    ops.push(AsyncStorage.setItem(DRONE_REPORT_PREFIX + uid, JSON.stringify(drBlob)));
  }

  const cpmRaw = await AsyncStorage.getItem(CPM_PREFIX + uid);
  const cpmBlob = parse(cpmRaw, { byProject: {} as Record<string, unknown> });
  if (cpmBlob.byProject && cpmBlob.byProject[projectId]) {
    delete cpmBlob.byProject[projectId];
    ops.push(AsyncStorage.setItem(CPM_PREFIX + uid, JSON.stringify(cpmBlob)));
  }

  const ganttRaw = await AsyncStorage.getItem(GANTT_PREFIX + uid);
  const ganttBlob = parse(ganttRaw, { byProject: {} as Record<string, unknown> });
  if (ganttBlob.byProject && ganttBlob.byProject[projectId]) {
    delete ganttBlob.byProject[projectId];
    ops.push(AsyncStorage.setItem(GANTT_PREFIX + uid, JSON.stringify(ganttBlob)));
  }

  const bimRaw = await AsyncStorage.getItem(BIM_LINKS_PREFIX + uid);
  const bimBlob = parse(bimRaw, { byProject: {} as Record<string, unknown> });
  if (bimBlob.byProject && bimBlob.byProject[projectId]) {
    delete bimBlob.byProject[projectId];
    ops.push(AsyncStorage.setItem(BIM_LINKS_PREFIX + uid, JSON.stringify(bimBlob)));
  }

  await Promise.all(ops);
}
