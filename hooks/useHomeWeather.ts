import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { fetchCurrentWeather, type CurrentWeatherSnapshot } from '@/lib/weather/openMeteo';
import { buildWeatherHeroTheme, defaultHeroTheme, type WeatherHeroTheme } from '@/lib/weather/heroTheme';

export type HomeWeatherState =
  | { status: 'loading' }
  | { status: 'denied' }
  | { status: 'error'; message: string }
  | { status: 'ready'; snapshot: CurrentWeatherSnapshot; theme: WeatherHeroTheme };

async function loadWeather(): Promise<HomeWeatherState> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== Location.PermissionStatus.GRANTED) {
    return { status: 'denied' };
  }

  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const snapshot = await fetchCurrentWeather(pos.coords.latitude, pos.coords.longitude);
    return {
      status: 'ready',
      snapshot,
      theme: buildWeatherHeroTheme(snapshot),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Weather unavailable';
    return { status: 'error', message };
  }
}

export function useHomeWeather() {
  const q = useQuery({
    queryKey: ['home-weather'],
    queryFn: loadWeather,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const state: HomeWeatherState = q.isPending
    ? { status: 'loading' }
    : (q.data ?? { status: 'error', message: 'Unknown' });

  const theme: WeatherHeroTheme =
    state.status === 'ready' ? state.theme : defaultHeroTheme();

  return {
    query: q,
    state,
    theme,
    refetch: q.refetch,
  };
}
