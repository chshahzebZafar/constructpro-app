import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { CurrentWeatherSnapshot } from './openMeteo';

type IonName = ComponentProps<typeof Ionicons>['name'];

export type WeatherHeroTheme = {
  /** Main hero background */
  bg: string;
  /** Decorative orb (top-right) */
  orbTop: string;
  /** Decorative orb (bottom-left) */
  orbBottom: string;
  /** Subtle rim light behind icons */
  glow: string;
  primaryIcon: IonName;
  /** Wind / extra cue */
  secondaryIcon?: IonName;
  /** Short condition label */
  conditionLabel: string;
  /** e.g. "NW" */
  windCompass: string;
};

function windCompassFromDegrees(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const i = Math.round(((deg % 360) / 45) % 8);
  return dirs[i] ?? 'N';
}

/** WMO code interpretation (Open-Meteo). */
function baseFromWmo(code: number, isDay: boolean): { label: string; icon: IonName } {
  if (code === 0) {
    return isDay
      ? { label: 'Clear skies', icon: 'sunny-outline' }
      : { label: 'Clear night', icon: 'moon-outline' };
  }
  if (code <= 3) {
    if (code === 1) return { label: 'Mostly clear', icon: isDay ? 'partly-sunny-outline' : 'cloudy-night-outline' };
    if (code === 2) return { label: 'Partly cloudy', icon: 'partly-sunny-outline' };
    return { label: 'Overcast', icon: 'cloud-outline' };
  }
  if (code === 45 || code === 48) return { label: 'Fog', icon: 'cloud-outline' };
  if (code >= 51 && code <= 57) return { label: 'Drizzle', icon: 'rainy-outline' };
  if (code >= 61 && code <= 67) return { label: 'Rain', icon: 'rainy-outline' };
  if (code >= 71 && code <= 77) return { label: 'Snow', icon: 'snow-outline' };
  if (code >= 80 && code <= 82) return { label: 'Showers', icon: 'rainy-outline' };
  if (code >= 85 && code <= 86) return { label: 'Snow showers', icon: 'snow-outline' };
  if (code >= 95) return { label: 'Thunderstorm', icon: 'thunderstorm-outline' };
  return { label: 'Weather', icon: 'partly-sunny-outline' };
}

const DEFAULT_THEME: Omit<WeatherHeroTheme, 'conditionLabel' | 'windCompass'> = {
  bg: '#1B3A5C',
  orbTop: 'rgba(255,255,255,0.07)',
  orbBottom: 'rgba(255,255,255,0.05)',
  glow: 'rgba(255,255,255,0.12)',
  primaryIcon: 'partly-sunny-outline',
};

export function buildWeatherHeroTheme(w: CurrentWeatherSnapshot): WeatherHeroTheme {
  const { label, icon } = baseFromWmo(w.weatherCode, w.isDay);
  const windy = w.windMph >= 18;
  const veryWindy = w.windMph >= 28;

  let bg = DEFAULT_THEME.bg;
  let orbTop = DEFAULT_THEME.orbTop;
  let orbBottom = DEFAULT_THEME.orbBottom;

  if (!w.isDay && w.weatherCode === 0) {
    bg = '#0F1729';
    orbTop = 'rgba(147,197,253,0.12)';
    orbBottom = 'rgba(45,95,138,0.35)';
  } else if (w.weatherCode === 45 || w.weatherCode === 48) {
    bg = '#2D3748';
    orbTop = 'rgba(203,213,225,0.15)';
    orbBottom = 'rgba(100,116,139,0.2)';
  } else if ((w.weatherCode >= 61 && w.weatherCode <= 67) || (w.weatherCode >= 80 && w.weatherCode <= 82)) {
    bg = '#1E3A5F';
    orbTop = 'rgba(96,165,250,0.15)';
    orbBottom = 'rgba(30,58,95,0.5)';
  } else if (w.weatherCode >= 95) {
    bg = '#1A1F2E';
    orbTop = 'rgba(251,191,36,0.12)';
    orbBottom = 'rgba(71,85,105,0.35)';
  } else if (w.weatherCode >= 71 && w.weatherCode <= 77) {
    bg = '#1E3D52';
    orbTop = 'rgba(224,242,254,0.18)';
    orbBottom = 'rgba(56,189,248,0.12)';
  } else if (w.weatherCode <= 3 && w.weatherCode > 0) {
    bg = '#243B53';
    orbTop = 'rgba(255,255,255,0.08)';
    orbBottom = 'rgba(148,163,184,0.12)';
  }

  const secondaryIcon: IonName | undefined = veryWindy
    ? 'flag-outline'
    : windy
      ? 'navigate-outline'
      : undefined;

  return {
    bg,
    orbTop,
    orbBottom,
    glow: w.isDay ? 'rgba(255,255,255,0.14)' : 'rgba(147,197,253,0.12)',
    primaryIcon: icon,
    secondaryIcon,
    conditionLabel: label,
    windCompass: windCompassFromDegrees(w.windDirectionDeg),
  };
}

export function defaultHeroTheme(): WeatherHeroTheme {
  return {
    ...DEFAULT_THEME,
    conditionLabel: 'Local weather',
    windCompass: '—',
  };
}
