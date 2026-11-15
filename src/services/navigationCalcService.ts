import { BEAUFORT_SCALE, BeaufortEntry } from '../data/nauticalReference';

const EARTH_RADIUS_KM = 6371.0;
const KM_PER_NM = 1.852;

export function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function degreesToCardinal(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const normalized = ((deg % 360) + 360) % 360;
  return dirs[Math.round(normalized / 22.5) % 16];
}

export interface PassageCalculationResult {
  distanceNm: number;
  distanceKm: number;
  initialBearingDeg: number;
  initialBearingCardinal: string;
  etaHours: number;
  etaFormatted: string;
}

export function calculateGreatCirclePassage(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  speedKnots: number,
): PassageCalculationResult {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const dPhi = toRadians(lat2 - lat1);
  const dLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distanceKm = EARTH_RADIUS_KM * c;
  const distanceNm = distanceKm / KM_PER_NM;

  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  const initialBearingDeg = Math.round(((toDegrees(Math.atan2(y, x)) % 360) + 360) % 360);

  const safeSpeed = Math.max(speedKnots, 0.5);
  const etaHours = distanceNm / safeSpeed;
  const totalMinutes = Math.round(etaHours * 60);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;

  const etaFormatted =
    days > 0 ? `${days}d ${hours}h ${mins}m` : `${hours}h ${mins}m`;

  return {
    distanceNm: Number(distanceNm.toFixed(1)),
    distanceKm: Number(distanceKm.toFixed(1)),
    initialBearingDeg,
    initialBearingCardinal: degreesToCardinal(initialBearingDeg),
    etaHours: Number(etaHours.toFixed(2)),
    etaFormatted,
  };
}

export interface FormattedCoordinates {
  decimal: string;
  ddm: string;
  dms: string;
}

export function formatCoordinateFormats(lat: number, lon: number): FormattedCoordinates {
  const formatAxis = (value: number, isLat: boolean) => {
    const hemi = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
    const abs = Math.abs(value);
    const deg = Math.floor(abs);
    const minFloat = (abs - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = Math.round((minFloat - min) * 60);

    const adjustedMin = sec === 60 ? min + 1 : min;
    const adjustedSec = sec === 60 ? 0 : sec;

    const padDeg = isLat ? String(deg).padStart(2, '0') : String(deg).padStart(3, '0');
    const padMin = String(adjustedMin).padStart(2, '0');
    const padSec = String(adjustedSec).padStart(2, '0');

    return {
      ddm: `${padDeg}°${minFloat.toFixed(3).padStart(6, '0')}'${hemi}`,
      dms: `${padDeg}°${padMin}'${padSec}"${hemi}`,
    };
  };

  const latF = formatAxis(lat, true);
  const lonF = formatAxis(lon, false);

  return {
    decimal: `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`,
    ddm: `${latF.ddm}  ${lonF.ddm}`,
    dms: `${latF.dms}  ${lonF.dms}`,
  };
}

export function knotsToBeaufort(knots: number): BeaufortEntry {
  for (let i = BEAUFORT_SCALE.length - 1; i >= 0; i--) {
    if (knots >= BEAUFORT_SCALE[i].knotsMin) {
      return BEAUFORT_SCALE[i];
    }
  }
  return BEAUFORT_SCALE[0];
}

export interface VoyageFuelResult {
  voyageHours: number;
  netFuelLiters: number;
  reserveFuelLiters: number;
  totalFuelLiters: number;
  totalFuelMetricTonnes: number;
  dailyBurnLiters: number;
}

export function calculateVoyageFuel(
  distanceNm: number,
  speedKnots: number,
  burnRateLph: number,
  reservePct = 15,
  fuelDensityKgPerL = 0.845,
): VoyageFuelResult {
  const safeDist = Math.max(0, distanceNm);
  const safeSpeed = Math.max(0.5, speedKnots);
  const safeBurn = Math.max(0, burnRateLph);
  const safeReserve = Math.max(0, Math.min(100, reservePct));

  const voyageHours = safeDist / safeSpeed;
  const netFuelLiters = voyageHours * safeBurn;
  const reserveFuelLiters = netFuelLiters * (safeReserve / 100);
  const totalFuelLiters = netFuelLiters + reserveFuelLiters;
  const totalFuelMetricTonnes = (totalFuelLiters * fuelDensityKgPerL) / 1000;
  const dailyBurnLiters = safeBurn * 24;

  return {
    voyageHours: Number(voyageHours.toFixed(2)),
    netFuelLiters: Math.round(netFuelLiters),
    reserveFuelLiters: Math.round(reserveFuelLiters),
    totalFuelLiters: Math.round(totalFuelLiters),
    totalFuelMetricTonnes: Number(totalFuelMetricTonnes.toFixed(2)),
    dailyBurnLiters: Math.round(dailyBurnLiters),
  };
}

export interface DraftTpcResult {
  sinkageCm: number;
  sinkageMeters: number;
  fwaCm: number;
  densityCorrectionCm: number;
  newMeanDraftM: number;
  ukcMeters: number;
}

export function calculateDraftAndTpc(
  currentDraftM: number,
  weightChangeTonnes: number,
  tpc: number,
  waterDensity = 1.025,
  displacementTonnes = 1500,
  waterDepthM = 12,
): DraftTpcResult {
  const safeTpc = Math.max(0.05, tpc);
  const safeDisp = Math.max(0, displacementTonnes);
  const safeDensity = Math.max(0.99, Math.min(1.04, waterDensity));

  // Sinkage / Rise in cm = ΔW (t) / TPC (t/cm)
  const sinkageCm = weightChangeTonnes / safeTpc;
  const sinkageMeters = sinkageCm / 100;

  // Fresh Water Allowance (cm) = Displacement / (4 * TPC)
  const fwaCm = safeDisp / (4 * safeTpc);

  // Dock Water Allowance correction relative to standard seawater (1.025 t/m³)
  const densityCorrectionCm = fwaCm * ((1.025 - safeDensity) / 0.025);

  const newMeanDraftM = Math.max(0, currentDraftM + sinkageMeters + densityCorrectionCm / 100);
  const ukcMeters = waterDepthM - newMeanDraftM;

  return {
    sinkageCm: Number(sinkageCm.toFixed(2)),
    sinkageMeters: Number(sinkageMeters.toFixed(3)),
    fwaCm: Number(fwaCm.toFixed(2)),
    densityCorrectionCm: Number(densityCorrectionCm.toFixed(2)),
    newMeanDraftM: Number(newMeanDraftM.toFixed(3)),
    ukcMeters: Number(ukcMeters.toFixed(2)),
  };
}

export const METERS_PER_SECOND_PER_KNOT = 1852 / 3600; // exact: 0.514444...

export function nmToKm(nm: number): number {
  return nm * KM_PER_NM;
}

export function kmToNm(km: number): number {
  return km / KM_PER_NM;
}

export function knotsToMs(knots: number): number {
  return knots * METERS_PER_SECOND_PER_KNOT;
}

export function msToKnots(ms: number): number {
  return ms / METERS_PER_SECOND_PER_KNOT;
}

export function knotsToKmh(knots: number): number {
  return knots * KM_PER_NM;
}
