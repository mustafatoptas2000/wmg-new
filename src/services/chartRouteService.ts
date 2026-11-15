import { NAUTICAL_NAVAIDS } from '../data/nauticalChartData';
import { Marina, NauticalNavaid, RouteLegSummary, RouteWaypoint } from '../types/maritime';
import {
  calculateGreatCirclePassage,
  calculateVoyageFuel,
} from './navigationCalcService';

export interface PierToPierRouteResult {
  waypoints: RouteWaypoint[];
  legs: RouteLegSummary[];
  totalDistanceNm: number;
  totalDistanceKm: number;
  totalHours: number;
  totalEtaFormatted: string;
  arrivalTimeLabel: string;
  netFuelLiters: number;
  reserveFuelLiters: number;
  totalFuelLiters: number;
  totalFuelMetricTonnes: number;
  hasShallowWarning: boolean;
  recommendedCorridorNote: string;
}

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return calculateGreatCirclePassage(lat1, lon1, lat2, lon2, 10).distanceNm;
}

function findNearestNavaid(lat: number, lon: number, maxRangeNm = 45): NauticalNavaid | null {
  let best: NauticalNavaid | null = null;
  let bestDist = Infinity;
  for (const nav of NAUTICAL_NAVAIDS) {
    const d = haversineNm(lat, lon, nav.lat, nav.lon);
    if (d < bestDist && d <= maxRangeNm) {
      bestDist = d;
      best = nav;
    }
  }
  return best;
}

/**
 * Automatically injects maritime fairway / headland navaid waypoints when a straight line
 * between two piers would otherwise cut across major Turkish/Mediterranean capes or straits.
 */
function buildRecommendedCoastalWaypoints(
  origin: Marina,
  destination: Marina,
): { navaidWaypoints: RouteWaypoint[]; note: string } {
  const inserted: RouteWaypoint[] = [];
  const notes: string[] = [];

  const minLon = Math.min(origin.longitude, destination.longitude);
  const maxLon = Math.max(origin.longitude, destination.longitude);
  const minLat = Math.min(origin.latitude, destination.latitude);
  const maxLat = Math.max(origin.latitude, destination.latitude);

  const crossesDardanelles =
    (origin.latitude >= 40.3 && destination.latitude <= 39.8) ||
    (destination.latitude >= 40.3 && origin.latitude <= 39.8);

  if (crossesDardanelles && maxLon > 26.0 && minLon < 29.5) {
    const capeHelles = NAUTICAL_NAVAIDS.find((n) => n.id === 'nav-helles');
    if (capeHelles) {
      inserted.push({
        id: `auto-${capeHelles.id}`,
        name: `${capeHelles.name} (TSS Gate)`,
        lat: capeHelles.lat - 0.03,
        lon: capeHelles.lon - 0.03,
        kind: 'navaid',
        minDepthM: 42,
      });
      notes.push('Dardanelles Traffic Separation Scheme (TSS) waypoint inserted');
    }
  }

  // Bodrum / Didim <-> Marmaris / Fethiye / Antalya rounding Cape Krio (Knidos)
  const isNorthBodrum =
    origin.latitude > 36.9 && origin.longitude > 26.0 && origin.longitude < 27.7;
  const isSouthEastCoast =
    destination.latitude < 36.95 && destination.longitude >= 28.0 && destination.longitude <= 32.0;
  const reverseBodrumMarmaris =
    destination.latitude > 36.9 && destination.longitude > 26.0 && destination.longitude < 27.7 &&
    origin.latitude < 36.95 && origin.longitude >= 28.0 && origin.longitude <= 32.0;

  if (isNorthBodrum || reverseBodrumMarmaris) {
    if (isSouthEastCoast || reverseBodrumMarmaris) {
      const husseyin = NAUTICAL_NAVAIDS.find((n) => n.id === 'nav-bodrum-hussey');
      const knidos = NAUTICAL_NAVAIDS.find((n) => n.id === 'nav-knidos-light');

      const points: RouteWaypoint[] = [];
      if (husseyin) {
        points.push({
          id: `auto-${husseyin.id}`,
          name: `${husseyin.name} Fairway`,
          lat: husseyin.lat - 0.025,
          lon: husseyin.lon - 0.04,
          kind: 'navaid',
          minDepthM: 28,
        });
      }
      if (knidos) {
        points.push({
          id: `auto-${knidos.id}`,
          name: `${knidos.name} Offshore WP`,
          lat: knidos.lat - 0.03,
          lon: knidos.lon - 0.045,
          kind: 'navaid',
          minDepthM: 45,
        });
      }
      if (reverseBodrumMarmaris) points.reverse();
      inserted.push(...points);
      notes.push('Recommended coastal fairway clearing Cape Krio (Knidos) & Bodrum Peninsula');
    }
  }

  // Izmir / Cesme <-> Bodrum rounding Karaburun / Chios Strait
  const crossesCesmeBodrum =
    ((origin.latitude >= 38.1 && destination.latitude <= 37.5) ||
      (destination.latitude >= 38.1 && origin.latitude <= 37.5)) &&
    minLon >= 25.8 &&
    maxLon <= 28.0;

  if (crossesCesmeBodrum) {
    const cesmeCard = NAUTICAL_NAVAIDS.find((n) => n.id === 'nav-cesme-cardinal');
    if (cesmeCard) {
      inserted.push({
        id: `auto-${cesmeCard.id}`,
        name: `${cesmeCard.name} Clearance`,
        lat: cesmeCard.lat,
        lon: cesmeCard.lon - 0.06,
        kind: 'navaid',
        minDepthM: 32,
      });
      notes.push('Chios Strait West Cardinal clearance waypoint inserted');
    }
  }

  // Fethiye / Marmaris <-> Antalya rounding Cape Gelidonya
  const roundsGelidonya =
    ((origin.longitude <= 29.3 && destination.longitude >= 30.5) ||
      (destination.longitude <= 29.3 && origin.longitude >= 30.5)) &&
    minLat >= 35.8 &&
    maxLat <= 37.2;

  if (roundsGelidonya) {
    const gelidonya = NAUTICAL_NAVAIDS.find((n) => n.id === 'nav-gelidonya');
    if (gelidonya) {
      inserted.push({
        id: `auto-${gelidonya.id}`,
        name: `${gelidonya.name} Offshore`,
        lat: gelidonya.lat - 0.08,
        lon: gelidonya.lon + 0.04,
        kind: 'navaid',
        minDepthM: 60,
      });
      notes.push('Offshore clearance south of Cape Gelidonya & Beşadalar islets');
    }
  }

  if (notes.length === 0) {
    const midLat = (origin.latitude + destination.latitude) / 2;
    const midLon = (origin.longitude + destination.longitude) / 2;
    const midNav = findNearestNavaid(midLat, midLon, 55);
    if (midNav) {
      notes.push(`Direct offshore track monitored via ${midNav.name} (${midNav.lightCharacteristic})`);
    } else {
      notes.push('Direct offshore great-circle pier-to-pier track');
    }
  }

  return {
    navaidWaypoints: inserted,
    note: notes.join(' · '),
  };
}

export function buildPierToPierRoute(params: {
  origin: Marina;
  destination: Marina;
  customWaypoints: RouteWaypoint[];
  useRecommendedWaypoints: boolean;
  speedKnots: number;
  vesselDraftM: number;
  burnRateLph: number;
  reservePct: number;
  departureDate?: Date;
}): PierToPierRouteResult {
  const {
    origin,
    destination,
    customWaypoints,
    useRecommendedWaypoints,
    speedKnots,
    vesselDraftM,
    burnRateLph,
    reservePct,
    departureDate = new Date(),
  } = params;

  const startWp: RouteWaypoint = {
    id: `pier-${origin.id}`,
    name: `${origin.name} (Pier)`,
    lat: origin.latitude,
    lon: origin.longitude,
    kind: 'pier',
    minDepthM: origin.maxDraftMeters,
  };

  const endWp: RouteWaypoint = {
    id: `pier-${destination.id}`,
    name: `${destination.name} (Pier)`,
    lat: destination.latitude,
    lon: destination.longitude,
    kind: 'pier',
    minDepthM: destination.maxDraftMeters,
  };

  const recommended = useRecommendedWaypoints
    ? buildRecommendedCoastalWaypoints(origin, destination)
    : { navaidWaypoints: [], note: 'Manual waypoint track' };

  const middleWaypoints =
    customWaypoints.length > 0 ? customWaypoints : recommended.navaidWaypoints;

  const waypoints: RouteWaypoint[] = [startWp, ...middleWaypoints, endWp];
  const legs: RouteLegSummary[] = [];

  let totalDistanceNm = 0;
  let totalDistanceKm = 0;
  let cumulativeHours = 0;
  let hasShallowWarning = false;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const seg = calculateGreatCirclePassage(a.lat, a.lon, b.lat, b.lon, speedKnots);
    const legFuel = calculateVoyageFuel(seg.distanceNm, speedKnots, burnRateLph, 0);

    totalDistanceNm += seg.distanceNm;
    totalDistanceKm += seg.distanceKm;
    cumulativeHours += seg.etaHours;

    const legMinDepth = Number(Math.min(a.minDepthM, b.minDepthM).toFixed(1));
    // Require at least 0.5m under-keel clearance safety margin
    const depthSafe = legMinDepth >= vesselDraftM + 0.5;
    if (!depthSafe) hasShallowWarning = true;

    const midLat = (a.lat + b.lat) / 2;
    const midLon = (a.lon + b.lon) / 2;
    const nearNav = findNearestNavaid(midLat, midLon, 60);

    legs.push({
      legIndex: i + 1,
      fromName: a.name,
      toName: b.name,
      distanceNm: seg.distanceNm,
      distanceKm: seg.distanceKm,
      bearingDeg: seg.initialBearingDeg,
      bearingCardinal: seg.initialBearingCardinal,
      legHours: Number(seg.etaHours.toFixed(2)),
      cumulativeHours: Number(cumulativeHours.toFixed(2)),
      fuelLiters: legFuel.netFuelLiters,
      minDepthM: legMinDepth,
      depthSafe,
      nearbyNavaid: nearNav ? `${nearNav.name} (${nearNav.lightCharacteristic})` : undefined,
    });
  }

  const totalFuel = calculateVoyageFuel(totalDistanceNm, speedKnots, burnRateLph, reservePct);
  const totalMinutes = Math.round(cumulativeHours * 60);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;
  const totalEtaFormatted = days > 0 ? `${days}d ${hours}h ${mins}m` : `${hours}h ${mins}m`;

  const etaDate = new Date(departureDate.getTime() + totalMinutes * 60 * 1000);
  const arrivalTimeLabel = etaDate.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    waypoints,
    legs,
    totalDistanceNm: Number(totalDistanceNm.toFixed(1)),
    totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
    totalHours: Number(cumulativeHours.toFixed(2)),
    totalEtaFormatted,
    arrivalTimeLabel,
    netFuelLiters: totalFuel.netFuelLiters,
    reserveFuelLiters: totalFuel.reserveFuelLiters,
    totalFuelLiters: totalFuel.totalFuelLiters,
    totalFuelMetricTonnes: totalFuel.totalFuelMetricTonnes,
    hasShallowWarning,
    recommendedCorridorNote:
      customWaypoints.length > 0
        ? `Custom chart track (${customWaypoints.length} user waypoints)`
        : recommended.note,
  };
}
