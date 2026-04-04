import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_HISTORY = 5;

export interface HistoryEntry<T> {
  inputs: T;
  result: unknown;
  timestamp: number;
}

export async function saveToHistory<T>(toolKey: string, inputs: T, result: unknown): Promise<void> {
  const key = `calc_history_${toolKey}`;
  const existing = await AsyncStorage.getItem(key);
  const history: HistoryEntry<T>[] = existing ? JSON.parse(existing) : [];
  history.unshift({ inputs, result, timestamp: Date.now() });
  if (history.length > MAX_HISTORY) history.pop();
  await AsyncStorage.setItem(key, JSON.stringify(history));
}

export async function getHistory<T>(toolKey: string): Promise<HistoryEntry<T>[]> {
  const key = `calc_history_${toolKey}`;
  const data = await AsyncStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}
