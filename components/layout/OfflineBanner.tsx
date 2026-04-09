import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useI18n } from '@/hooks/useI18n';

type Props = {
  /**
   * Use under tab stacks (Tools / Me) so the bar clears the status bar; omit on Home where the banner
   * sits below the hero header.
   */
  padStackSafeTop?: boolean;
};

export function OfflineBanner({ padStackSafeTop = false }: Props) {
  const { t } = useI18n();
  const { isOffline } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const uid = useAuthStore((s) => s.user?.uid ?? s.offlinePreviewUid ?? '');

  if (!uid || !isOffline) return null;

  const bar = (
    <View
      className="border-b border-amber-700/20 bg-amber-500 px-5 py-2.5"
      accessibilityRole="text"
      accessibilityLabel={t('home.offline.banner')}
    >
      <View className="flex-row items-center gap-2">
        <Ionicons name="cloud-offline-outline" size={20} color="#422006" />
        <Text
          className="flex-1 text-[13px] leading-[18px] text-amber-950"
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          {t('home.offline.banner')}
        </Text>
      </View>
    </View>
  );

  if (padStackSafeTop) {
    return (
      <View className="bg-amber-500" style={{ paddingTop: insets.top }}>
        {bar}
      </View>
    );
  }

  return bar;
}
