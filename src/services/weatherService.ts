import { DEMO_WEATHER_REPORTS } from '../data/weatherDemo';
import { Marina, MarineWeatherReport, WeatherSourceMode } from '../types/maritime';
import { degreesToCardinal } from './navigationCalcService';

export interface IMarineWeatherProvider {
  readonly mode: WeatherSourceMode;
  getWeatherForMarina(marina: Marina): Promise<MarineWeatherReport>;
}

function mapWmoWeatherCode(code: number): {
  weatherCode: MarineWeatherReport['weatherCode'];
  description: string;
} {
  if (code === 0) {
    return { weatherCode: 'clear', description: 'Clear marine sky with unimpeded horizon visibility.' };
  }
  if (code <= 3) {
    return { weatherCode: 'partly_cloudy', description: 'Partly cloudy coastal conditions with steady light-to-moderate airflow.' };
  }
  if (code >= 45 && code <= 48) {
    return { weatherCode: 'overcast', description: 'Coastal mist or fog bank reducing surface visibility.' };
  }
  if (code >= 51 && code <= 67) {
    return { weatherCode: 'overcast', description: 'Passing maritime rain showers and overcast cloud ceiling.' };
  }
  if (code >= 80) {
    return { weatherCode: 'squall', description: 'Unstable marine squall activity with variable gusts.' };
  }
  return { weatherCode: 'breezy', description: 'Active coastal breeze and developing sea state.' };
}

function enrichWeatherMetrics(report: MarineWeatherReport): MarineWeatherReport {
  const hash = report.marinaId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const isSquall = report.weatherCode === 'squall';
  const isOvercast = report.weatherCode === 'overcast';
  const isBreezy = report.weatherCode === 'breezy' || report.weatherCode === 'swell';

  const humidityPct =
    report.humidityPct ??
    Math.min(96, Math.max(48, (isSquall ? 86 : isOvercast ? 82 : isBreezy ? 68 : 61) + (hash % 11) - 5));
  const rainMmPerHr =
    report.rainMmPerHr ??
    (isSquall ? Number((4.8 + (hash % 5) * 0.9).toFixed(1)) : isOvercast ? Number((1.1 + (hash % 4) * 0.4).toFixed(1)) : 0.0);
  const lightningRisk: MarineWeatherReport['lightningRisk'] =
    report.lightningRisk ??
    (isSquall ? 'High' : isOvercast && report.barometricPressureHpa < 1010 ? 'Moderate' : 'Low');
  const cloudCoverPct =
    report.cloudCoverPct ??
    (isSquall ? 92 : isOvercast ? 84 : report.weatherCode === 'partly_cloudy' ? 45 : isBreezy ? 32 : 14);
  const dewPointC =
    report.dewPointC ??
    Number((report.airTemperatureC - (100 - humidityPct) / 5).toFixed(1));

  return {
    ...report,
    humidityPct,
    rainMmPerHr,
    lightningRisk,
    cloudCoverPct,
    dewPointC,
  };
}

export class DemoMarineWeatherProvider implements IMarineWeatherProvider {
  readonly mode = WeatherSourceMode.DEMONSTRATION;

  async getWeatherForMarina(marina: Marina): Promise<MarineWeatherReport> {
    const existing = DEMO_WEATHER_REPORTS[marina.id];
    if (existing) {
      return enrichWeatherMetrics(existing);
    }

    // Deterministic station-level simulated demonstration telemetry (clearly labeled)
    const hash = marina.id
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const regionLower = `${marina.region} ${marina.seaBasin}`.toLowerCase();
    const isNorthEurope =
      regionLower.includes('north sea') ||
      regionLower.includes('baltic') ||
      regionLower.includes('channel') ||
      regionLower.includes('norwegian');
    const isBlackSea = regionLower.includes('black sea');
    const isMarmara =
      regionLower.includes('marmara') ||
      regionLower.includes('bosphorus') ||
      regionLower.includes('dardanelles');
    const isMed =
      regionLower.includes('mediterranean') ||
      regionLower.includes('levantine') ||
      regionLower.includes('adriatic') ||
      regionLower.includes('ligurian') ||
      regionLower.includes('balearic') ||
      regionLower.includes('tyrrhenian') ||
      regionLower.includes('cilician');

    const baseWind = isNorthEurope ? 16.2 : isBlackSea ? 14.0 : isMarmara ? 12.2 : isMed ? 10.6 : 12.0;
    const windSpeedKnots = Number((baseWind + ((hash % 9) - 4) * 0.6).toFixed(1));
    const windDirectionDeg = (isNorthEurope ? 255 : isBlackSea ? 35 : isMarmara ? 45 : isMed ? 210 : 315) + ((hash % 5) - 2) * 10;
    const normalizedDir = ((windDirectionDeg % 360) + 360) % 360;
    const waveHeightMeters = Number(
      Math.max(0.2, (isNorthEurope ? 1.35 : isBlackSea ? 1.05 : isMarmara ? 0.6 : 0.75) + ((hash % 7) - 3) * 0.08).toFixed(2),
    );
    const seaTemperatureC = Number(
      ((isNorthEurope ? 13.5 : isBlackSea ? 17.2 : isMarmara ? 18.9 : isMed ? 22.8 : 21.6) + ((hash % 5) - 2) * 0.4).toFixed(1),
    );
    const airTemperatureC = Number((seaTemperatureC + (isNorthEurope ? 1.8 : 3.1)).toFixed(1));
    const visibilityNm = Number((9.0 + (hash % 6) * 0.5).toFixed(1));
    const visibilityKm = Number((visibilityNm * 1.852).toFixed(1));

    const weatherCode: MarineWeatherReport['weatherCode'] =
      isNorthEurope ? 'overcast' : isBlackSea ? 'breezy' : 'clear';
    const barometricPressureHpa = 1012 + (hash % 8);

    return enrichWeatherMetrics({
      marinaId: marina.id,
      sourceMode: WeatherSourceMode.DEMONSTRATION,
      sourceLabel: 'Demonstration Data — Simulated Telemetry',
      isDemonstration: true,
      observedLabel: 'Simulated Demonstration Profile',
      windSpeedKnots,
      windDirectionDeg: normalizedDir,
      windDirectionCardinal: degreesToCardinal(normalizedDir),
      windGustsKnots: Number((windSpeedKnots * 1.34).toFixed(1)),
      waveHeightMeters,
      wavePeriodSeconds: Number((isNorthEurope ? 6.4 : isBlackSea ? 5.1 : 4.5 + (hash % 4) * 0.3).toFixed(1)),
      seaTemperatureC,
      airTemperatureC,
      visibilityNm,
      visibilityKm,
      weatherCode,
      weatherDescription: `Simulated demonstration weather profile for ${marina.seaBasin} (${marina.city}). Clearly labeled demonstration data — not live telemetry.`,
      barometricPressureHpa,
    });
  }
}

export class OpenMeteoMarineWeatherProvider implements IMarineWeatherProvider {
  readonly mode = WeatherSourceMode.OPEN_METEO_API;

  async getWeatherForMarina(marina: Marina): Promise<MarineWeatherReport> {
    const lat = marina.latitude.toFixed(4);
    const lon = marina.longitude.toFixed(4);

    const forecastUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,cloud_cover,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
      `&hourly=visibility&wind_speed_unit=kn&forecast_days=1`;

    const marineUrl =
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}` +
      `&current=wave_height,wave_period,sea_surface_temperature`;

    const [forecastRes, marineRes] = await Promise.all([
      fetch(forecastUrl),
      fetch(marineUrl),
    ]);

    if (!forecastRes.ok) {
      throw new Error(`Weather API responded with status ${forecastRes.status}`);
    }

    const forecastData = await forecastRes.json();
    const marineData = marineRes.ok ? await marineRes.json() : null;

    const current = forecastData.current ?? {};
    const marineCurrent = marineData?.current ?? {};

    const windSpeedKnots = Number((current.wind_speed_10m ?? 0).toFixed(1));
    const windDirectionDeg = Math.round(current.wind_direction_10m ?? 0);
    const windGustsKnots = Number((current.wind_gusts_10m ?? windSpeedKnots).toFixed(1));
    const airTemperatureC = Number((current.temperature_2m ?? 20).toFixed(1));
    const barometricPressureHpa = Math.round(current.surface_pressure ?? 1013);
    const humidityPct = Math.round(current.relative_humidity_2m ?? 65);
    const rainMmPerHr = Number((current.precipitation ?? 0).toFixed(1));
    const cloudCoverPct = Math.round(current.cloud_cover ?? 20);
    const dewPointC = Number((current.dew_point_2m ?? airTemperatureC - 4).toFixed(1));

    const waveHeightMeters = Number((marineCurrent.wave_height ?? 0.5).toFixed(2));
    const wavePeriodSeconds = Number((marineCurrent.wave_period ?? 4.0).toFixed(1));
    const seaTemperatureC =
      typeof marineCurrent.sea_surface_temperature === 'number'
        ? Number(marineCurrent.sea_surface_temperature.toFixed(1))
        : Number((airTemperatureC - 2.2).toFixed(1));

    const visibilityMeters = Array.isArray(forecastData.hourly?.visibility)
      ? forecastData.hourly.visibility[0] ?? 18520
      : 18520;
    const visibilityKm = Number((visibilityMeters / 1000).toFixed(1));
    const visibilityNm = Number((visibilityKm / 1.852).toFixed(1));

    const wmoCode = Number(current.weather_code ?? 0);
    const mapped = mapWmoWeatherCode(wmoCode);
    const lightningRisk: MarineWeatherReport['lightningRisk'] =
      wmoCode >= 95 ? 'High' : wmoCode >= 80 || rainMmPerHr >= 2.5 ? 'Moderate' : 'Low';

    return {
      marinaId: marina.id,
      sourceMode: WeatherSourceMode.OPEN_METEO_API,
      sourceLabel: 'Open-Meteo Marine & Forecast API',
      isDemonstration: false,
      observedLabel: current.time ? `Updated ${current.time.replace('T', ' ')} UTC` : 'API Response',
      windSpeedKnots,
      windDirectionDeg,
      windDirectionCardinal: degreesToCardinal(windDirectionDeg),
      windGustsKnots,
      waveHeightMeters,
      wavePeriodSeconds,
      seaTemperatureC,
      airTemperatureC,
      visibilityNm,
      visibilityKm,
      weatherCode: mapped.weatherCode,
      weatherDescription: mapped.description,
      barometricPressureHpa,
      humidityPct,
      rainMmPerHr,
      lightningRisk,
      cloudCoverPct,
      dewPointC,
    };
  }
}

export const demoWeatherProvider = new DemoMarineWeatherProvider();
export const openMeteoWeatherProvider = new OpenMeteoMarineWeatherProvider();

export async function getMarineWeather(
  marina: Marina,
  mode: WeatherSourceMode,
): Promise<{ report: MarineWeatherReport; apiFallbackReason?: string }> {
  if (mode === WeatherSourceMode.OPEN_METEO_API) {
    try {
      const report = await openMeteoWeatherProvider.getWeatherForMarina(marina);
      return { report };
    } catch (error) {
      const fallback = await demoWeatherProvider.getWeatherForMarina(marina);
      return {
        report: fallback,
        apiFallbackReason: error instanceof Error ? error.message : 'Unable to reach external weather API',
      };
    }
  }

  const report = await demoWeatherProvider.getWeatherForMarina(marina);
  return { report };
}
