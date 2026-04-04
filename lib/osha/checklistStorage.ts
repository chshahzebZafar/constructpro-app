import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'constructpro_osha_checklist_v1_';

export interface OshaChecklistPersist {
  checked: Record<string, boolean>;
  inspectionDate: string;
}

export async function loadOshaChecklist(uid: string): Promise<OshaChecklistPersist | null> {
  const raw = await AsyncStorage.getItem(PREFIX + uid);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OshaChecklistPersist;
  } catch {
    return null;
  }
}

export async function saveOshaChecklist(uid: string, data: OshaChecklistPersist): Promise<void> {
  await AsyncStorage.setItem(PREFIX + uid, JSON.stringify(data));
}
