import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { CATEGORY_LABELS, type ToolEntry } from '@/lib/tools/allTools';
import { Colors } from '@/constants/colors';

const PHASE_LABEL: Record<ToolEntry['phase'], string> = {
  basic: 'Basic',
  mid: 'Mid',
  advanced: 'Advanced',
};

export function ToolPlaceholderScreen({ tool }: { tool: ToolEntry }) {
  const level = tool.phase === 'basic' ? 'Basic' : tool.phase === 'mid' ? 'Mid' : 'Advanced';
  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title={tool.title} level={level} />
      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        <View
          className="mb-4 self-start rounded-full px-3 py-1"
          style={{ backgroundColor: Colors.accent[100] }}
        >
          <Text className="text-xs text-accent-600" style={{ fontFamily: 'Inter_500Medium' }}>
            {CATEGORY_LABELS[tool.category]} · {PHASE_LABEL[tool.phase]}
          </Text>
        </View>
        <Text className="text-base text-neutral-700" style={{ fontFamily: 'Inter_400Regular' }}>
          {tool.description}
        </Text>
        <Text
          className="mt-6 text-sm text-brand-900"
          style={{ fontFamily: 'Poppins_700Bold' }}
        >
          Coming next
        </Text>
        <Text className="mt-2 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
          This tool is on the roadmap. Full spec includes forms, Firestore sync, PDF export, and
          device features (camera, GPS, notifications) where applicable — rolled out in phases after
          core project data lands in the app.
        </Text>
        <Text
          className="mt-4 text-sm text-neutral-500"
          style={{ fontFamily: 'Inter_400Regular' }}
        >
          Offline calculators ship first; cloud-backed tools follow the same UI patterns as Cost
          Estimator and Material Quantity.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
