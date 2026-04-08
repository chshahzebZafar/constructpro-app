import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/tools/ScreenHeader';
import { CATEGORY_LABELS, type ToolEntry } from '@/lib/tools/allTools';
import { Colors } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';

const PHASE_LABEL: Record<ToolEntry['phase'], string> = {
  basic: 'Basic',
  mid: 'Mid',
  advanced: 'Advanced',
};

export function ToolPlaceholderScreen({ tool }: { tool: ToolEntry }) {
  const { t } = useI18n();
  const level = tool.phase === 'basic' ? 'Basic' : tool.phase === 'mid' ? 'Mid' : 'Advanced';
  const trTitle = t(`tools.item.${tool.id}.title`);
  const safeTitle = trTitle === `tools.item.${tool.id}.title` ? tool.title : trTitle;
  const trCategory = t(`tools.category.${tool.category}`);
  const safeCategory = trCategory === `tools.category.${tool.category}` ? CATEGORY_LABELS[tool.category] : trCategory;
  const trPhase = t(`tools.level.${tool.phase}`);
  const safePhase = trPhase === `tools.level.${tool.phase}` ? PHASE_LABEL[tool.phase] : trPhase;
  const trDesc = t(`tools.item.${tool.id}.desc`);
  const safeDesc = trDesc === `tools.item.${tool.id}.desc` ? tool.description : trDesc;
  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScreenHeader title={safeTitle} level={level} />
      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        <View className="mb-3 flex-row flex-wrap gap-2">
          <View
            className="rounded-full px-3 py-1"
            style={{ backgroundColor: Colors.brand[100] }}
          >
            <Text className="text-xs text-brand-900" style={{ fontFamily: 'Inter_500Medium' }}>
              {t('common.comingSoon')}
            </Text>
          </View>
          <View
            className="rounded-full px-3 py-1"
            style={{ backgroundColor: Colors.accent[100] }}
          >
            <Text className="text-xs text-accent-600" style={{ fontFamily: 'Inter_500Medium' }}>
              {safeCategory} · {safePhase}
            </Text>
          </View>
        </View>
        <Text className="text-base text-neutral-700" style={{ fontFamily: 'Inter_400Regular' }}>
          {safeDesc}
        </Text>
        <Text
          className="mt-6 text-sm text-brand-900"
          style={{ fontFamily: 'Poppins_700Bold' }}
        >
          {t('tools.placeholder.whatToExpect')}
        </Text>
        <Text className="mt-2 text-sm text-neutral-600" style={{ fontFamily: 'Inter_400Regular' }}>
          {t('tools.placeholder.body')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
