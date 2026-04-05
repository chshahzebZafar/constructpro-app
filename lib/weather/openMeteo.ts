/** Open-Meteo — no API key. https://open-meteo.com/en/docs */

export interface CurrentWeatherSnapshot {
  temperatureF: number;
  apparentF: number;
  weatherCode: number;
  isDay: boolean;
  windMph: number;
  windDirectionDeg: number;
  humidityPct: number | null;
}

interface OpenMeteoCurrentResponse {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    is_day?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    relative_humidity_2m?: number;
  };
}

export async function fetchCurrentWeather(
  latitude: number,
  longitude: number
): Promise<CurrentWeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'is_day',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
    ].join(','),
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    timezone: 'auto',
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!res.ok) throw new Error(`Weather HTTP ${res.status}`);
  const json = (await res.json()) as OpenMeteoCurrentResponse;
  const c = json.current;
  if (!c) throw new Error('No current weather in response');

  return {
    temperatureF: Math.round(Number(c.temperature_2m ?? 0)),
    apparentF: Math.round(Number(c.apparent_temperature ?? c.temperature_2m ?? 0)),
    weatherCode: Number(c.weather_code ?? 0),
    isDay: Number(c.is_day ?? 1) === 1,
    windMph: Math.round(Number(c.wind_speed_10m ?? 0)),
    windDirectionDeg: Math.round(Number(c.wind_direction_10m ?? 0)),
    humidityPct:
      c.relative_humidity_2m !== undefined ? Math.round(Number(c.relative_humidity_2m)) : null,
  };
}
