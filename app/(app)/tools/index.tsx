import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ALL_TOOLS,
  CATEGORY_LABELS,
  type ToolCategoryId,
} from '@/lib/tools/allTools';
import { Colors } from '@/constants/colors';

const CATEGORIES: (ToolCategoryId | 'all')[] = [
  'all',
  'estimation',
  'projects',
  'engineering',
  'safety',
  'documents',
  'analytics',
];

export default function ToolsHubScreen() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ToolCategoryId | 'all'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_TOOLS.filter((t) => {
      if (category !== 'all' && t.category !== category) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        CATEGORY_LABELS[t.category].toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  const liveCount = ALL_TOOLS.filter((t) => t.implementation === 'live').length;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top', 'left', 'right']}>
      <View className="border-b border-neutral-200 bg-white px-5 pb-3 pt-2">
        <Text
          className="text-2xl text-brand-900"
          style={{ fontFamily: 'Poppins_700Bold' }}
        >
          Tools
        </Text>
        <Text className="mt-1 text-sm text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
          {liveCount} calculators live · {ALL_TOOLS.length - liveCount} coming — works offline where noted
        </Text>
        <View className="mt-4 flex-row items-center rounded-xl border border-neutral-300 bg-white px-3">
          <Ionicons name="search-outline" size={20} color={Colors.neutral[500]} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search all 32 tools…"
            placeholderTextColor="#9CA3AF"
            className="ml-2 min-h-[48px] flex-1 text-base text-neutral-900"
            style={{ fontFamily: 'Inter_400Regular' }}
            accessibilityLabel="Search tools"
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3 -mx-1"
          contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
        >
          {CATEGORIES.map((c) => {
            const selected = category === c;
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                className={`rounded-full px-4 py-2 ${
                  selected ? 'bg-brand-900' : 'border border-neutral-300 bg-white'
                }`}
              >
                <Text
                  className={`text-sm ${selected ? 'text-white' : 'text-neutral-700'}`}
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  {CATEGORY_LABELS[c]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        ListEmptyComponent={
          <Text className="py-8 text-center text-neutral-500" style={{ fontFamily: 'Inter_400Regular' }}>
            No tools match your search.
          </Text>
        }
        renderItem={({ item }) => (
          <Link href={item.href} asChild>
            <Pressable className="mb-3 flex-row items-center rounded-2xl border border-neutral-200 bg-white p-4 active:opacity-90">
              <View
                className="mr-4 h-14 w-14 items-center justify-center rounded-xl"
                style={{ backgroundColor: Colors.brand[100] }}
              >
                <Ionicons name={item.icon} size={28} color={Colors.brand[900]} />
              </View>
              <View className="flex-1">
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text
                    className="text-base text-brand-900"
                    style={{ fontFamily: 'Poppins_700Bold' }}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  {item.implementation === 'live' ? (
                    <View className="rounded bg-success-100 px-2 py-0.5">
                      <Text className="text-[10px] text-success-600" style={{ fontFamily: 'Inter_500Medium' }}>
                        Live
                      </Text>
                    </View>
                  ) : (
                    <View className="rounded bg-neutral-100 px-2 py-0.5">
                      <Text className="text-[10px] text-neutral-500" style={{ fontFamily: 'Inter_500Medium' }}>
                        Soon
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  className="mt-0.5 text-xs text-neutral-500"
                  style={{ fontFamily: 'Inter_400Regular' }}
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
                <Text
                  className="mt-1 text-[11px] text-accent-600"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  {CATEGORY_LABELS[item.category]}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral[500]} />
            </Pressable>
          </Link>
        )}
      />
    </SafeAreaView>
  );
}
