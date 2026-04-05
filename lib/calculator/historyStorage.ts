import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@constructpro/calculator_history_v1';
export const MAX_HISTORY_ITEMS = 50;

export interface CalcHistoryEntry {
  id: string;
  expression: string;
  result: string;
  at: number;
}

export async function loadCalcHistory(): Promise<CalcHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is CalcHistoryEntry =>
        typeof x === 'object' &&
        x !== null &&
        typeof (x as CalcHistoryEntry).id === 'string' &&
        typeof (x as CalcHistoryEntry).expression === 'string' &&
        typeof (x as CalcHistoryEntry).result === 'string'
    );
  } catch {
    return [];
  }
}

export async function saveCalcHistory(entries: CalcHistoryEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY_ITEMS)));
}

export function newHistoryId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
