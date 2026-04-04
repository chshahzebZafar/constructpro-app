export type WeatherCondition =
  | 'clear'
  | 'partly_cloudy'
  | 'cloudy'
  | 'rain'
  | 'storm'
  | 'snow'
  | 'wind'
  | 'fog'
  | 'other';

export interface DailySiteLogEntry {
  id: string;
  createdAt: number;
  /** YYYY-MM-DD — calendar day this log covers */
  logDate: string;
  weatherCondition: WeatherCondition;
  weatherNotes: string;
  /** Workforce on site (counts, trades, subs) */
  workforce: string;
  workPerformed: string;
  deliveries: string;
  visitors: string;
  safetyNotes: string;
  /** Supervisor / authorizer name */
  signedBy: string;
  /** YYYY-MM-DD sign-off */
  signedDate: string;
  /** Local file URIs (device storage; same pattern as on-device punch) */
  photoUrls: string[];
}

export const WEATHER_CONDITION_LABELS: Record<WeatherCondition, string> = {
  clear: 'Clear',
  partly_cloudy: 'Partly cloudy',
  cloudy: 'Cloudy',
  rain: 'Rain',
  storm: 'Storm',
  snow: 'Snow',
  wind: 'Wind',
  fog: 'Fog',
  other: 'Other',
};

export const WEATHER_CONDITIONS: WeatherCondition[] = [
  'clear',
  'partly_cloudy',
  'cloudy',
  'rain',
  'storm',
  'snow',
  'wind',
  'fog',
  'other',
];

export const MAX_DAILY_LOG_PHOTOS = 6;
