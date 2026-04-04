import { View, Text, Pressable, ScrollView } from 'react-native';
import type { HistoryEntry } from '../../lib/storage/calculatorHistory';

interface HistoryCardProps<T> {
  entries: HistoryEntry<T>[];
  onSelect: (entry: HistoryEntry<T>) => void;
  formatSummary: (entry: HistoryEntry<T>) => string;
}

export function HistoryCard<T>({ entries, onSelect, formatSummary }: HistoryCardProps<T>) {
  if (entries.length === 0) return null;
  return (
    <View className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4">
      <Text className="mb-2 text-sm text-brand-900" style={{ fontFamily: 'Poppins_700Bold' }}>
        Recent (last 5)
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
        <View className="flex-row flex-wrap gap-2 pb-1">
          {entries.map((e, i) => (
            <Pressable
              key={e.timestamp + String(i)}
              onPress={() => onSelect(e)}
              className="max-w-[220px] rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 active:opacity-80"
            >
              <Text
                className="text-xs text-neutral-600"
                style={{ fontFamily: 'Inter_400Regular' }}
                numberOfLines={3}
              >
                {formatSummary(e)}
              </Text>
              <Text className="mt-1 text-[10px] text-neutral-400" style={{ fontFamily: 'Inter_400Regular' }}>
                {new Date(e.timestamp).toLocaleString()}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
