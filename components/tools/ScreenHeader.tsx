import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Colors } from '../../constants/colors';
import { useI18n } from '@/hooks/useI18n';
import { ALL_TOOLS } from '@/lib/tools/allTools';

export type ToolLevel = 'Basic' | 'Mid' | 'Advanced';

interface ScreenHeaderProps {
  title: string;
  level: ToolLevel;
  onExportPress?: () => void;
  exportDisabled?: boolean;
}

export function ScreenHeader({ title, level, onExportPress, exportDisabled }: ScreenHeaderProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const toolId = pathname.split('/').filter(Boolean).pop() ?? '';
  const knownTool = ALL_TOOLS.find((x) => x.id === toolId);
  const translatedTitle = knownTool ? t(`tools.item.${knownTool.id}.title`) : t(title);
  const safeTitle = translatedTitle === `tools.item.${knownTool?.id}.title` || translatedTitle === title ? title : translatedTitle;
  const levelKey =
    level === 'Basic' ? 'tools.level.basic' : level === 'Mid' ? 'tools.level.mid' : 'tools.level.advanced';
  const translatedLevel = t(levelKey);
  const safeLevel = translatedLevel === levelKey ? level : translatedLevel;
  return (
    <View className="flex-row items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
      <Pressable
        onPress={() => router.replace('/(app)/tools')}
        hitSlop={12}
        className="h-12 w-12 items-center justify-center"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={24} color={Colors.brand[900]} />
      </Pressable>
      <View className="flex-1 items-center px-2">
        <Text
          className="text-center text-base text-brand-900"
          style={{ fontFamily: 'Poppins_700Bold' }}
          numberOfLines={1}
        >
          {safeTitle}
        </Text>
        <Text
          className="mt-0.5 text-[11px] text-neutral-500"
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          {safeLevel}
        </Text>
      </View>
      <View className="h-12 w-12 items-center justify-center">
        {onExportPress ? (
          <Pressable
            onPress={onExportPress}
            disabled={exportDisabled}
            hitSlop={8}
            className="h-12 w-12 items-center justify-center opacity-100 disabled:opacity-40"
            accessibilityLabel={t('tools.action.exportPdf')}
          >
            <Ionicons name="share-outline" size={22} color={Colors.brand[900]} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
