export enum NavigationSection {
  HOME = 'home',
  NAUTICAL_CHART = 'nautical_chart',
  WEATHER = 'weather',
  MARINAS = 'marinas',
  FLEET = 'fleet',
  SERVICES = 'services',
  TOOLS = 'tools',
  DOCUMENTS = 'documents',
}

export enum LanguageCode {
  EN = 'en',
  TR = 'tr',
  RU = 'ru',
  AR = 'ar',
  FR = 'fr',
  EL = 'el',
}

export enum VesselStatus {
  MOORED = 'moored',
  UNDERWAY = 'underway',
  ANCHORED = 'anchored',
  MAINTENANCE = 'maintenance',
}

export enum WeatherSourceMode {
  DEMONSTRATION = 'demonstration',
  OPEN_METEO_API = 'open_meteo_api',
}

export interface Marina {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  seaBasin: string;
  latitude: number;
  longitude: number;
  coordinates: string;
  vhfChannel: string;
  maxLoaMeters: number;
  maxDraftMeters: number;
  berths: number;
  portOfEntry: boolean;
  amenities: string[];
  summary: string;
  popularity?: number;
  spotType?: 'marina' | 'wind_spot';
}

export interface MarineWeatherReport {
  marinaId: string;
  sourceMode: WeatherSourceMode;
  sourceLabel: string;
  isDemonstration: boolean;
  observedLabel: string;
  windSpeedKnots: number;
  windDirectionDeg: number;
  windDirectionCardinal: string;
  windGustsKnots: number;
  waveHeightMeters: number;
  wavePeriodSeconds: number;
  seaTemperatureC: number;
  airTemperatureC: number;
  visibilityNm: number;
  visibilityKm: number;
  weatherCode: 'clear' | 'partly_cloudy' | 'breezy' | 'swell' | 'overcast' | 'squall';
  weatherDescription: string;
  barometricPressureHpa: number;
  humidityPct?: number;
  rainMmPerHr?: number;
  lightningRisk?: 'Low' | 'Moderate' | 'High';
  cloudCoverPct?: number;
  dewPointC?: number;
}

export type MaritimeWeatherLayer =
  | 'wind'
  | 'waves'
  | 'rain_lightning'
  | 'radar'
  | 'satellite'
  | 'temperature'
  | 'humidity'
  | 'hurricane';

export interface StormForecastPoint {
  lon: number;
  lat: number;
  etaHours: number;
  windKnots: number;
  pressureHpa: number;
}

export interface StormSystem {
  id: string;
  name: string;
  basin: string;
  categoryLabel: string;
  severity: 'tropical_storm' | 'hurricane' | 'medicane' | 'gale_low';
  currentLat: number;
  currentLon: number;
  pressureHpa: number;
  maxWindKnots: number;
  gustKnots: number;
  movementDir: string;
  movementKnots: number;
  pastTrack: [number, number][]; // [lon, lat]
  forecastTrack: StormForecastPoint[];
  advisory: string;
}

export interface ForecastSlot {
  isoTime: string;
  dayLabel: string;
  hourLabel: string;
  windKnots: number;
  gustKnots: number;
  windDirDeg: number;
  windDirCardinal: string;
  waveHeightM: number;
  wavePeriodS: number;
  tideHeightM: number;
  tempDayC: number;
  tempNightC: number;
  pressureHpa: number;
  condition: string;
}

export interface TideEvent {
  timeLabel: string;
  type: 'High' | 'Low';
  heightM: number;
}

export interface WeatherStationReading {
  id: string;
  stationName: string;
  distanceNm: number;
  windKnots: number;
  gustKnots: number;
  windDirDeg: number;
  windDirCardinal: string;
  pressureHpa: number;
  updatedAgo: string;
}

export interface MonthlyClimateStat {
  monthIndex: number;
  monthLabel: string;
  avgWindKnots: number;
  tempDayC: number;
  tempNightC: number;
  seaTempC: number;
  pressureHpa: number;
  goodWindDays: number;
}

export interface SpotOffer {
  id: string;
  marinaId: string;
  title: string;
  partner: string;
  discountBadge: string;
  description: string;
  validUntil: string;
}

export interface SpotChatMessage {
  id: string;
  marinaId: string;
  author: string;
  role: 'Local Sailor' | 'Harbor Crew' | 'Kiter' | 'Captain';
  text: string;
  timestamp: string;
}

export interface Vessel {
  id: string;
  name: string;
  imo: string;
  mmsi: string;
  callSign: string;
  flag: string;
  vesselType: string;
  loaMeters: number;
  beamMeters: number;
  draftMeters: number;
  homePort: string;
  assignedMarinaId: string;
  status: VesselStatus;
  captain: string;
  crewCount: number;
  lastPositionLat: number;
  lastPositionLon: number;
}

export type ServiceCategory =
  | 'berthing'
  | 'bunkering'
  | 'customs'
  | 'shipyard'
  | 'provisioning'
  | 'safety';

export interface MaritimeService {
  id: string;
  marinaId: string;
  category: ServiceCategory;
  title: string;
  provider: string;
  availability: string;
  vhfOrContact: string;
  specifications: string;
  portInfo: string;
}

export type DocumentCategory =
  | 'clearance'
  | 'safety'
  | 'navigation'
  | 'compliance';

export interface MaritimeDocument {
  id: string;
  code: string;
  title: string;
  category: DocumentCategory;
  authority: string;
  updatedDate: string;
  summary: string;
  sections: {
    heading: string;
    items: string[];
  }[];
}

export type NavaidKind =
  | 'lighthouse'
  | 'cardinal_n'
  | 'cardinal_e'
  | 'cardinal_s'
  | 'cardinal_w'
  | 'lateral_port'
  | 'lateral_starboard'
  | 'racon'
  | 'danger';

export interface NauticalNavaid {
  id: string;
  name: string;
  kind: NavaidKind;
  lat: number;
  lon: number;
  lightCharacteristic: string;
  rangeNm: number;
  seaBasin: string;
  notes: string;
}

export interface NauticalAnchorage {
  id: string;
  name: string;
  city: string;
  country: string;
  seaBasin: string;
  lat: number;
  lon: number;
  minDepthM: number;
  maxDepthM: number;
  seabed: 'Sand' | 'Mud' | 'Sand & Weed' | 'Rock & Sand';
  holdingRating: 'Excellent' | 'Good' | 'Fair';
  shelterFrom: string;
  capacityVessels: number;
  notes: string;
}

export interface WeatherBuoy {
  id: string;
  name: string;
  seaBasin: string;
  lat: number;
  lon: number;
  windKnots: number;
  gustKnots: number;
  windDirDeg: number;
  waveHeightM: number;
  wavePeriodS: number;
  seaTempC: number;
  pressureHpa: number;
  currentKnots: number;
  currentDirDeg: number;
}

export interface SeaCurrentStream {
  id: string;
  name: string;
  seaBasin: string;
  lat: number;
  lon: number;
  speedKnots: number;
  directionDeg: number;
  type: 'Surface Outflow' | 'Tidal Stream' | 'Coastal Drift' | 'Gyre';
  notes: string;
}

export interface RouteWaypoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind: 'pier' | 'navaid' | 'custom';
  minDepthM: number;
}

export interface RouteLegSummary {
  legIndex: number;
  fromName: string;
  toName: string;
  distanceNm: number;
  distanceKm: number;
  bearingDeg: number;
  bearingCardinal: string;
  legHours: number;
  cumulativeHours: number;
  fuelLiters: number;
  minDepthM: number;
  depthSafe: boolean;
  nearbyNavaid?: string;
}

