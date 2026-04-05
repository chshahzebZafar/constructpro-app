import { View, Text, Pressable, ActivityIndicator, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { HomeWeatherState } from '@/hooks/useHomeWeather';
import type { WeatherHeroTheme } from '@/lib/weather/heroTheme';

type Props = {
  state: HomeWeatherState;
  theme: WeatherHeroTheme;
};

export function DashboardWeatherRow({ state, theme }: Props) {
  if (state.status === 'loading') {
    return (
      <View className="mt-3 flex-row items-center gap-2">
        <ActivityIndicator size="small" color="rgba(255,255,255,0.85)" />
        <Text className="text-xs text-white/60" style={{ fontFamily: 'Inter_400Regular' }}>
          Loading local weather…
        </Text>
      </View>
    );
  }

  if (state.status === 'denied') {
    return (
      <Pressable
        onPress={() => {
          void Linking.openSettings();
        }}
        className="mt-3 flex-row items-center gap-2 self-start rounded-full px-3 py-1.5 active:opacity-90"
        style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
        accessibilityRole="button"
        accessibilityLabel="Open settings to allow location for weather"
      >
        <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.9)" />
        <Text className="text-xs text-white/85" style={{ fontFamily: 'Inter_500Medium' }}>
          Enable location for live weather
        </Text>
        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.6)" />
      </Pressable>
    );
  }

  if (state.status === 'error') {
    return (
      <View className="mt-3 flex-row items-center gap-2">
        <Ionicons name="cloud-outline" size={18} color="rgba(255,255,255,0.65)" />
        <Text className="flex-1 text-xs text-white/65" style={{ fontFamily: 'Inter_400Regular' }}>
          Weather unavailable{Platform.OS === 'web' ? ' (check browser location)' : ''}
        </Text>
      </View>
    );
  }

  const { snapshot } = state;
  const feels =
    snapshot.apparentF !== snapshot.temperatureF
      ? ` · Feels ${snapshot.apparentF}°`
      : '';
  const humiditySuffix =
    snapshot.humidityPct !== null ? ` · ${snapshot.humidityPct}% humidity` : '';

  return (
    <View className="mt-3">
      <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
        <View
          className="h-9 w-9 items-center justify-center rounded-2xl"
          style={{ backgroundColor: theme.glow }}
        >
          <Ionicons name={theme.primaryIcon} size={22} color="#FFFFFF" />
        </View>
        {theme.secondaryIcon ? (
          <View
            className="h-9 w-9 items-center justify-center rounded-2xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <Ionicons name={theme.secondaryIcon} size={18} color="rgba(255,255,255,0.95)" />
          </View>
        ) : null}
        <Text
          className="text-lg text-white"
          style={{ fontFamily: 'Poppins_700Bold' }}
          accessibilityLabel={`Temperature ${snapshot.temperatureF} degrees`}
        >
          {snapshot.temperatureF}°
        </Text>
        <Text className="text-xs text-white/75" style={{ fontFamily: 'Inter_500Medium' }}>
          {theme.conditionLabel}
          {feels}
        </Text>
      </View>
      <View className="mt-1.5 flex-row items-center gap-1.5">
        <Ionicons name="swap-vertical-outline" size={14} color="rgba(255,255,255,0.65)" />
        <Text className="text-[11px] text-white/65" style={{ fontFamily: 'Inter_400Regular' }}>
          Wind {snapshot.windMph} mph {theme.windCompass}
          {humiditySuffix}
        </Text>
      </View>
    </View>
  );
}
