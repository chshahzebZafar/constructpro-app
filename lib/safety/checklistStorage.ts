import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'constructpro_safety_checklist_v1_';

export interface SafetyChecklistPersist {
  /** item id -> checked */
  checked: Record<string, boolean>;
  /** ISO date of last reset or first use */
  inspectionDate: string;
}

export async function loadChecklist(uid: string): Promise<SafetyChecklistPersist | null> {
  const raw = await AsyncStorage.getItem(PREFIX + uid);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SafetyChecklistPersist;
  } catch {
    return null;
  }
}

export async function saveChecklist(uid: string, data: SafetyChecklistPersist): Promise<void> {
  await AsyncStorage.setItem(PREFIX + uid, JSON.stringify(data));
}

export function computeScore(
  checked: Record<string, boolean>,
  allIds: string[]
): { passed: number; total: number; percent: number } {
  const total = allIds.length;
  if (total === 0) return { passed: 0, total: 0, percent: 100 };
  const passed = allIds.filter((id) => checked[id]).length;
  const percent = Math.round((passed / total) * 1000) / 10;
  return { passed, total, percent };
}
