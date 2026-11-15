import {
  ForecastSlot,
  Marina,
  MonthlyClimateStat,
  SpotOffer,
  TideEvent,
  WeatherSourceMode,
  WeatherStationReading,
} from '../types/maritime';
import { degreesToCardinal } from './navigationCalcService';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getMarinaPopularity(marina: Marina): number {
  if (typeof marina.popularity === 'number') return marina.popularity;
  const hash = marina.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const base = marina.portOfEntry ? 82 : 70;
  return Math.min(99, base + (hash % 18));
}

export function recommendKiteSize(windKnots: number, riderWeightKg = 75): {
  primarySizeM: number;
  rangeLabel: string;
  suitability: 'Too Light' | 'Light Wind' | 'Ideal' | 'Powered' | 'Strong / Small Kite';
} {
  const weightFactor = riderWeightKg / 75;
  const effectiveWind = Math.max(4, windKnots / Math.sqrt(weightFactor));

  if (effectiveWind < 9) {
    return { primarySizeM: 17, rangeLabel: '15m - 17m / Foil', suitability: 'Too Light' };
  }
  if (effectiveWind < 13) {
    return { primarySizeM: 14, rangeLabel: '13m - 15m', suitability: 'Light Wind' };
  }
  if (effectiveWind < 17) {
    return { primarySizeM: 12, rangeLabel: '11m - 12m', suitability: 'Ideal' };
  }
  if (effectiveWind < 22) {
    return { primarySizeM: 9, rangeLabel: '9m - 10m', suitability: 'Ideal' };
  }
  if (effectiveWind < 28) {
    return { primarySizeM: 7, rangeLabel: '7m - 8m', suitability: 'Powered' };
  }
  return { primarySizeM: 5, rangeLabel: '5m - 6m', suitability: 'Strong / Small Kite' };
}

export function generateGfs10DayForecast(
  marina: Marina,
  stepHours: 1 | 3,
): ForecastSlot[] {
  const hash = marina.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const regionLower = `${marina.region} ${marina.seaBasin}`.toLowerCase();
  const isNorth = regionLower.includes('north sea') || regionLower.includes('baltic') || regionLower.includes('norwegian');
  const isMed = regionLower.includes('mediterranean') || regionLower.includes('aegean') || regionLower.includes('adriatic');

  const baseWind = isNorth ? 16 : isMed ? 13 : 11;
  const baseTemp = isNorth ? 14 : isMed ? 24 : 21;

  const slots: ForecastSlot[] = [];
  const now = new Date();
  now.setMinutes(0, 0, 0);

  const totalHours = 240; // 10 days
  for (let h = 0; h < totalHours; h += stepHours) {
    const dt = new Date(now.getTime() + h * 3600 * 1000);
    const hourOfDay = dt.getUTCHours();
    const dayIdx = Math.floor(h / 24);

    // Thermal diurnal boost in afternoon (12:00-18:00)
    const thermalBoost = Math.max(0, Math.sin(((hourOfDay - 9) / 12) * Math.PI)) * 5.2;
    const synopticWave = Math.sin((h / 36) + (hash % 7)) * 4.1;
    const windKnots = Number(Math.max(4.5, baseWind + thermalBoost + synopticWave).toFixed(1));
    const gustKnots = Number((windKnots * 1.28 + 1.5).toFixed(1));

    const windDirDeg = Math.round(
      (((isNorth ? 260 : 315) + Math.sin(h / 28 + hash) * 35) % 360 + 360) % 360,
    );

    const waveHeightM = Number(Math.max(0.2, (windKnots / 16) * 0.95).toFixed(2));
    const wavePeriodS = Number((3.6 + waveHeightM * 2.1).toFixed(1));
    // Semi-diurnal tidal harmonic (~12.42h period)
    const tideHeightM = Number((0.35 + Math.sin((h / 12.42) * Math.PI * 2 + (hash % 5)) * 0.28).toFixed(2));

    const tempDayC = Number((baseTemp + 3.2 + Math.sin(dayIdx + hash) * 1.6).toFixed(1));
    const tempNightC = Number((baseTemp - 3.8 + Math.cos(dayIdx + hash) * 1.3).toFixed(1));
    const pressureHpa = Math.round(1014 + Math.cos(h / 42 + hash) * 6);

    const condition =
      windKnots >= 22
        ? 'Strong Breeze'
        : windKnots >= 14
          ? 'Fresh Thermal Wind'
          : windKnots >= 8
            ? 'Moderate Sea Breeze'
            : 'Light Air';

    slots.push({
      isoTime: dt.toISOString(),
      dayLabel: dt.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }),
      hourLabel: `${String(hourOfDay).padStart(2, '0')}:00`,
      windKnots,
      gustKnots,
      windDirDeg,
      windDirCardinal: degreesToCardinal(windDirDeg),
      waveHeightM,
      wavePeriodS,
      tideHeightM,
      tempDayC,
      tempNightC,
      pressureHpa,
      condition,
    });
  }

  return slots;
}

export async function fetchOpenMeteo10DayForecast(
  marina: Marina,
  stepHours: 1 | 3,
): Promise<{ slots: ForecastSlot[]; mode: WeatherSourceMode }> {
  try {
    const lat = marina.latitude.toFixed(4);
    const lon = marina.longitude.toFixed(4);
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&hourly=temperature_2m,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
      `&wind_speed_unit=kn&forecast_days=10`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('API error');
    const json = await res.json();
    const hourly = json.hourly;
    if (!hourly || !Array.isArray(hourly.time)) throw new Error('Invalid payload');

    const slots: ForecastSlot[] = [];
    for (let i = 0; i < hourly.time.length; i += stepHours) {
      const iso = String(hourly.time[i]);
      const dt = new Date(iso);
      const windKnots = Number((hourly.wind_speed_10m[i] ?? 10).toFixed(1));
      const gustKnots = Number((hourly.wind_gusts_10m[i] ?? windKnots * 1.25).toFixed(1));
      const windDirDeg = Math.round(hourly.wind_direction_10m[i] ?? 0);
      const tempC = Number((hourly.temperature_2m[i] ?? 20).toFixed(1));
      const pressureHpa = Math.round(hourly.surface_pressure[i] ?? 1015);
      const waveHeightM = Number(Math.max(0.2, (windKnots / 16) * 0.9).toFixed(2));
      const tideHeightM = Number((0.35 + Math.sin((i / 12.42) * Math.PI * 2) * 0.25).toFixed(2));

      slots.push({
        isoTime: iso,
        dayLabel: dt.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }),
        hourLabel: iso.slice(11, 16),
        windKnots,
        gustKnots,
        windDirDeg,
        windDirCardinal: degreesToCardinal(windDirDeg),
        waveHeightM,
        wavePeriodS: Number((3.6 + waveHeightM * 2.0).toFixed(1)),
        tideHeightM,
        tempDayC: tempC,
        tempNightC: Number((tempC - 4.5).toFixed(1)),
        pressureHpa,
        condition: windKnots >= 18 ? 'Fresh Breeze' : windKnots >= 10 ? 'Moderate Wind' : 'Light Breeze',
      });
    }

    return { slots, mode: WeatherSourceMode.OPEN_METEO_API };
  } catch {
    return { slots: generateGfs10DayForecast(marina, stepHours), mode: WeatherSourceMode.DEMONSTRATION };
  }
}

export function getDailyTideSchedule(marina: Marina): TideEvent[] {
  const hash = marina.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const shift = hash % 3;
  return [
    { timeLabel: `0${2 + shift}:18`, type: 'High', heightM: 0.64 },
    { timeLabel: `0${8 + shift}:32`, type: 'Low', heightM: 0.14 },
    { timeLabel: `${14 + shift}:44`, type: 'High', heightM: 0.68 },
    { timeLabel: `${20 + shift}:55`, type: 'Low', heightM: 0.12 },
  ];
}

export function getNearbyWeatherStations(marina: Marina): WeatherStationReading[] {
  const hash = marina.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return [
    {
      id: `${marina.id}-st1`,
      stationName: `${marina.city} Harbour Anemometer`,
      distanceNm: 0.8,
      windKnots: Number((12.4 + (hash % 6)).toFixed(1)),
      gustKnots: Number((16.2 + (hash % 7)).toFixed(1)),
      windDirDeg: 315,
      windDirCardinal: 'NW',
      pressureHpa: 1015,
      updatedAgo: 'Demo Baseline',
    },
    {
      id: `${marina.id}-st2`,
      stationName: `${marina.seaBasin} Offshore Buoy`,
      distanceNm: 4.6,
      windKnots: Number((14.8 + (hash % 5)).toFixed(1)),
      gustKnots: Number((19.1 + (hash % 6)).toFixed(1)),
      windDirDeg: 325,
      windDirCardinal: 'NW',
      pressureHpa: 1014,
      updatedAgo: 'Demo Baseline',
    },
    {
      id: `${marina.id}-st3`,
      stationName: `${marina.city} Headland Beacon`,
      distanceNm: 7.2,
      windKnots: Number((15.5 + (hash % 4)).toFixed(1)),
      gustKnots: Number((20.4 + (hash % 5)).toFixed(1)),
      windDirDeg: 305,
      windDirCardinal: 'WNW',
      pressureHpa: 1015,
      updatedAgo: 'Demo Baseline',
    },
  ];
}

export function get10DayHistorySummary(marina: Marina): {
  dateLabel: string;
  avgWindKnots: number;
  maxGustKnots: number;
  tempDayC: number;
  tempNightC: number;
  pressureHpa: number;
  waveMaxM: number;
}[] {
  const hash = marina.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const days: ReturnType<typeof get10DayHistorySummary> = [];
  const baseDate = new Date();

  for (let i = 10; i >= 1; i--) {
    const dt = new Date(baseDate.getTime() - i * 86400 * 1000);
    const avgWindKnots = Number((10.5 + ((hash + i * 3) % 10)).toFixed(1));
    const maxGustKnots = Number((avgWindKnots * 1.35 + 1.8).toFixed(1));
    days.push({
      dateLabel: dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      avgWindKnots,
      maxGustKnots,
      tempDayC: Number((23 + ((hash + i) % 6)).toFixed(1)),
      tempNightC: Number((16 + ((hash + i) % 4)).toFixed(1)),
      pressureHpa: 1011 + ((hash + i) % 8),
      waveMaxM: Number((0.4 + (avgWindKnots / 18) * 0.9).toFixed(2)),
    });
  }
  return days;
}

export function getAnnualWeatherArchive(marina: Marina): {
  months: MonthlyClimateStat[];
  bestMonth: MonthlyClimateStat;
} {
  const hash = marina.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const isNorth = marina.latitude > 47;

  const months: MonthlyClimateStat[] = MONTH_NAMES.map((label, idx) => {
    const summerPeak = Math.sin(((idx - 1) / 11) * Math.PI);
    const windSeasonal = idx >= 5 && idx <= 8 ? 16.5 : idx >= 3 && idx <= 9 ? 13.0 : 11.2;
    const avgWindKnots = Number((windSeasonal + ((hash + idx) % 4) * 0.7).toFixed(1));
    const tempDayC = Number(((isNorth ? 8 : 14) + summerPeak * (isNorth ? 14 : 18)).toFixed(1));
    const tempNightC = Number((tempDayC - 6.8).toFixed(1));
    const seaTempC = Number(((isNorth ? 7 : 15) + summerPeak * (isNorth ? 10 : 12)).toFixed(1));
    const goodWindDays = Math.min(28, Math.round(11 + summerPeak * 13 + (idx >= 5 && idx <= 8 ? 3 : 0)));

    return {
      monthIndex: idx,
      monthLabel: label,
      avgWindKnots,
      tempDayC,
      tempNightC,
      seaTempC,
      pressureHpa: 1013 + ((idx + hash) % 5),
      goodWindDays,
    };
  });

  const bestMonth = months.reduce((best, cur) =>
    cur.goodWindDays + cur.avgWindKnots * 0.4 > best.goodWindDays + best.avgWindKnots * 0.4 ? cur : best,
  );

  return { months, bestMonth };
}

export function getSpotSpecialOffers(marina: Marina): SpotOffer[] {
  return [
    {
      id: `offer-${marina.id}-1`,
      marinaId: marina.id,
      title: 'Transient Berth & Shore Power Package',
      partner: `${marina.name} Dockmaster`,
      discountBadge: '-15% Off-Peak',
      description: `Complimentary water hookup and 15% discount on 7+ night transit berthing in ${marina.city}.`,
      validUntil: '2026-12-31',
    },
    {
      id: `offer-${marina.id}-2`,
      marinaId: marina.id,
      title: 'Sailing & Kite Rental / Rigging Check',
      partner: `${marina.city} Watersports & Chandlery`,
      discountBadge: '20% Member Rate',
      description: `Pre-booked kite equipment storage, rigging inspection, and marine weather briefing in ${marina.seaBasin}.`,
      validUntil: '2026-12-31',
    },
  ];
}
