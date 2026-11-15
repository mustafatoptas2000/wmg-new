import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CloudLightning,
  Compass,
  Droplets,
  Eye,
  Gauge,
  History,
  Radio,
  RefreshCw,
  Satellite,
  Thermometer,
  Waves,
  Wind,
} from 'lucide-react';
import { CoordinateDisplay } from '../components/common/CoordinateDisplay';
import { DemoDataNotice } from '../components/common/DemoDataNotice';
import { SectionHeader } from '../components/common/SectionHeader';
import { StatTile } from '../components/common/StatTile';
import { MaritimeWeatherMap } from '../components/weather/MaritimeWeatherMap';
import { useLanguage } from '../i18n/LanguageContext';
import {
  fetchOpenMeteo10DayForecast,
  generateGfs10DayForecast,
  get10DayHistorySummary,
  getAnnualWeatherArchive,
  getDailyTideSchedule,
  getNearbyWeatherStations,
  recommendKiteSize,
} from '../services/forecastService';
import { knotsToBeaufort } from '../services/navigationCalcService';
import {
  ForecastSlot,
  Marina,
  MarineWeatherReport,
  WeatherSourceMode,
} from '../types/maritime';

interface MarineWeatherViewProps {
  marinas: Marina[];
  selectedMarina: Marina;
  onSelectMarina: (marina: Marina) => void;
  weatherReport: MarineWeatherReport | null;
  weatherSourceMode: WeatherSourceMode;
  onChangeSourceMode: (mode: WeatherSourceMode) => void;
  onRefreshWeather: () => void;
  loading: boolean;
  apiFallbackNote?: string;
}

type WeatherTab = 'overview' | 'forecast' | 'tides' | 'archive';

export const MarineWeatherView: React.FC<MarineWeatherViewProps> = ({
  marinas,
  selectedMarina,
  onSelectMarina,
  weatherReport,
  weatherSourceMode,
  onChangeSourceMode,
  onRefreshWeather,
  loading,
  apiFallbackNote,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<WeatherTab>('overview');
  const [stepHours, setStepHours] = useState<1 | 3>(3);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [riderWeightKg, setRiderWeightKg] = useState(75);
  const [forecastSlots, setForecastSlots] = useState<ForecastSlot[]>([]);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastModeUsed, setForecastModeUsed] = useState<WeatherSourceMode>(
    WeatherSourceMode.DEMONSTRATION,
  );

  const beaufort = weatherReport ? knotsToBeaufort(weatherReport.windSpeedKnots) : null;

  useEffect(() => {
    let active = true;
    setSelectedDayIdx(0);

    if (weatherSourceMode === WeatherSourceMode.OPEN_METEO_API) {
      setForecastLoading(true);
      fetchOpenMeteo10DayForecast(selectedMarina, stepHours)
        .then(({ slots, mode }) => {
          if (!active) return;
          setForecastSlots(slots);
          setForecastModeUsed(mode);
        })
        .finally(() => {
          if (active) setForecastLoading(false);
        });
    } else {
      setForecastSlots(generateGfs10DayForecast(selectedMarina, stepHours));
      setForecastModeUsed(WeatherSourceMode.DEMONSTRATION);
    }

    return () => {
      active = false;
    };
  }, [selectedMarina, stepHours, weatherSourceMode]);

  // Group 10-day forecast slots by dayLabel
  const forecastDays = useMemo(() => {
    const groups: { dayLabel: string; maxWind: number; slots: ForecastSlot[] }[] = [];
    const indexByLabel = new Map<string, number>();

    forecastSlots.forEach((slot) => {
      const existingIdx = indexByLabel.get(slot.dayLabel);
      if (existingIdx === undefined) {
        indexByLabel.set(slot.dayLabel, groups.length);
        groups.push({
          dayLabel: slot.dayLabel,
          maxWind: slot.windKnots,
          slots: [slot],
        });
      } else {
        const g = groups[existingIdx];
        g.slots.push(slot);
        if (slot.windKnots > g.maxWind) g.maxWind = slot.windKnots;
      }
    });

    return groups.slice(0, 10);
  }, [forecastSlots]);

  const currentDaySlots = forecastDays[selectedDayIdx]?.slots ?? [];

  const dailyTides = useMemo(() => getDailyTideSchedule(selectedMarina), [selectedMarina]);
  const nearbyStations = useMemo(() => getNearbyWeatherStations(selectedMarina), [selectedMarina]);
  const historyDays = useMemo(() => get10DayHistorySummary(selectedMarina), [selectedMarina]);
  const annualArchive = useMemo(() => getAnnualWeatherArchive(selectedMarina), [selectedMarina]);

  const kiteAdvice = useMemo(() => {
    const knots = weatherReport?.windSpeedKnots ?? 12;
    return recommendKiteSize(knots, riderWeightKg);
  }, [weatherReport, riderWeightKg]);

  const gustKiteAdvice = useMemo(() => {
    const gusts = weatherReport?.windGustsKnots ?? 15;
    return recommendKiteSize(gusts, riderWeightKg);
  }, [weatherReport, riderWeightKg]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t.weather.title}
        subtitle={t.weather.subtitle}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-sky-400/20 bg-[#0A1628] p-1">
              <button
                type="button"
                onClick={() => onChangeSourceMode(WeatherSourceMode.DEMONSTRATION)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  weatherSourceMode === WeatherSourceMode.DEMONSTRATION
                    ? 'bg-amber-400/20 text-amber-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.weather.sourceDemo}
              </button>
              <button
                type="button"
                onClick={() => onChangeSourceMode(WeatherSourceMode.OPEN_METEO_API)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  weatherSourceMode === WeatherSourceMode.OPEN_METEO_API
                    ? 'bg-sky-500/20 text-sky-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.weather.sourceApi}
              </button>
            </div>

            <button
              type="button"
              onClick={onRefreshWeather}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? t.weather.fetchingApi : t.weather.fetchLiveApi}</span>
            </button>
          </div>
        }
      />

      {/* Station Selector Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-sky-400/20 bg-[#0A1628] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <label htmlFor="weather-marina-select" className="block text-xs font-medium text-slate-400">
            {t.common.selectMarina}
          </label>
          <select
            id="weather-marina-select"
            value={selectedMarina.id}
            onChange={(e) => {
              const found = marinas.find((m) => m.id === e.target.value);
              if (found) onSelectMarina(found);
            }}
            className="mt-1.5 w-full max-w-md rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
          >
            {marinas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.country} · {m.city} — {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="shrink-0">
          <div className="text-xs text-slate-400">{selectedMarina.seaBasin}</div>
          <CoordinateDisplay
            latitude={selectedMarina.latitude}
            longitude={selectedMarina.longitude}
            dms={selectedMarina.coordinates}
          />
        </div>
      </div>

      {/* Mandatory Clear Labeling of Demonstration Data vs External API */}
      {weatherReport && (
        <DemoDataNotice
          isDemonstration={weatherReport.isDemonstration}
          sourceLabel={weatherReport.sourceLabel}
          observedLabel={weatherReport.observedLabel}
          fallbackNote={apiFallbackNote ? `${t.weather.apiFallbackNote} (${apiFallbackNote})` : undefined}
        />
      )}

      {/* Sub-Navigation Tabs for Marine Weather Modules */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-sky-400/20 bg-[#0A1628] p-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'overview'
              ? 'bg-sky-500 text-slate-950'
              : 'text-slate-300 hover:bg-[#040B16] hover:text-sky-300'
          }`}
        >
          <Wind className="h-3.5 w-3.5" />
          <span>{t.weather.tabOverview}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('forecast')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'forecast'
              ? 'bg-sky-500 text-slate-950'
              : 'text-slate-300 hover:bg-[#040B16] hover:text-sky-300'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>{t.weather.tabForecast}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tides')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'tides'
              ? 'bg-sky-500 text-slate-950'
              : 'text-slate-300 hover:bg-[#040B16] hover:text-sky-300'
          }`}
        >
          <Radio className="h-3.5 w-3.5" />
          <span>{t.weather.tabTidesStations}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('archive')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'archive'
              ? 'bg-sky-500 text-slate-950'
              : 'text-slate-300 hover:bg-[#040B16] hover:text-sky-300'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>{t.weather.tabArchive}</span>
        </button>
      </div>

      {/* TAB 1: Current Telemetry & Kite Size Recommendation */}
      {activeTab === 'overview' && (
        <>
          {loading || !weatherReport ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-24 rounded-lg border border-sky-400/15 bg-[#0A1628]"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Professional Maritime Weather Map (Radar · Satellite · Rain & Lightning · Waves · Wind · Temp · Humidity · Hurricane) */}
              <MaritimeWeatherMap
                marinas={marinas}
                selectedMarina={selectedMarina}
                onSelectMarina={onSelectMarina}
                weatherReport={weatherReport}
              />

              {/* Primary Marine Weather Telemetry Grid */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                {/* Wind & Compass Vector Panel */}
                <div className="flex flex-col justify-between rounded-xl border border-sky-400/20 bg-[#0A1628] p-5 lg:col-span-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                      <Wind className="h-4 w-4 text-sky-400" />
                      <span>
                        {t.weather.windSpeed} & {t.weather.windDirection}
                      </span>
                    </div>
                    {beaufort && (
                      <span className="font-mono text-xs text-amber-300">
                        Beaufort {beaufort.force} · {beaufort.name}
                      </span>
                    )}
                  </div>

                  <div className="my-5 flex items-center justify-center">
                    <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-sky-400/25 bg-[#040B16]">
                      <span className="absolute top-2 font-mono text-[10px] text-slate-400">N</span>
                      <span className="absolute bottom-2 font-mono text-[10px] text-slate-400">S</span>
                      <span className="absolute start-2.5 font-mono text-[10px] text-slate-400">W</span>
                      <span className="absolute end-2.5 font-mono text-[10px] text-slate-400">E</span>
                      <svg
                        viewBox="0 0 64 64"
                        className="h-24 w-24 transition-transform duration-300"
                        style={{ transform: `rotate(${weatherReport.windDirectionDeg}deg)` }}
                        aria-hidden="true"
                      >
                        <polygon points="32,8 38,34 32,29 26,34" fill="#38BDF8" />
                        <polygon points="32,56 36,34 32,38 28,34" fill="#334155" />
                      </svg>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-sky-400/15 pt-3.5 font-mono text-xs tabular-nums">
                    <div>
                      <div className="text-slate-400">{t.weather.windSpeed}</div>
                      <div className="mt-0.5 text-sm font-semibold text-sky-300">
                        {weatherReport.windSpeedKnots} {t.weather.knots}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">{t.weather.windDirection}</div>
                      <div className="mt-0.5 text-sm font-semibold text-slate-100">
                        {weatherReport.windDirectionDeg}° {weatherReport.windDirectionCardinal}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">{t.weather.windGusts}</div>
                      <div className="mt-0.5 text-sm font-semibold text-amber-300">
                        {weatherReport.windGustsKnots} {t.weather.knots}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Core Weather Metric Tiles + Atmospheric Rain / Lightning / Humidity + Description */}
                <div className="flex flex-col justify-between gap-4 lg:col-span-8">
                  <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                    <StatTile
                      label={t.weather.waveHeight}
                      value={weatherReport.waveHeightMeters.toFixed(2)}
                      unit={t.weather.meters}
                      detail={`${weatherReport.wavePeriodSeconds.toFixed(1)}${t.weather.seconds} · ${beaufort?.seaDescription ?? ''}`}
                      accent="sky"
                    />
                    <StatTile
                      label={t.weather.seaTemp}
                      value={weatherReport.seaTemperatureC.toFixed(1)}
                      unit="°C"
                      detail={`${t.weather.airTemp}: ${weatherReport.airTemperatureC.toFixed(1)}°C`}
                      accent="sky"
                    />
                    <StatTile
                      label={t.weather.humidity}
                      value={weatherReport.humidityPct ?? 64}
                      unit="%"
                      detail={`${t.weather.dewPoint}: ${(weatherReport.dewPointC ?? weatherReport.airTemperatureC - 5).toFixed(1)}°C`}
                    />
                    <StatTile
                      label={t.weather.rainRate}
                      value={(weatherReport.rainMmPerHr ?? 0).toFixed(1)}
                      unit="mm/h"
                      detail={`${t.weather.lightningRisk}: ${weatherReport.lightningRisk ?? 'Low'}`}
                      accent={weatherReport.lightningRisk === 'High' ? 'gold' : undefined}
                    />
                    <StatTile
                      label={t.weather.cloudCover}
                      value={weatherReport.cloudCoverPct ?? 24}
                      unit="%"
                      detail={`${t.weather.visibility}: ${weatherReport.visibilityNm.toFixed(1)} ${t.weather.nauticalMiles}`}
                    />
                    <StatTile
                      label={t.weather.pressure}
                      value={weatherReport.barometricPressureHpa}
                      unit="hPa"
                      detail="Mean sea level"
                      accent="gold"
                    />
                  </div>

                  <div className="rounded-xl border border-sky-400/20 bg-[#0A1628] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-sky-300">
                        <Waves className="h-4 w-4" />
                        <span>{t.weather.conditions}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono tabular-nums">
                        <span className="flex items-center gap-1">
                          <Droplets className="h-3.5 w-3.5 text-sky-400" />
                          {weatherReport.humidityPct ?? 64}% RH
                        </span>
                        <span className="flex items-center gap-1">
                          <CloudLightning className="h-3.5 w-3.5 text-amber-300" />
                          {weatherReport.lightningRisk ?? 'Low'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Satellite className="h-3.5 w-3.5 text-sky-300" />
                          {weatherReport.cloudCoverPct ?? 24}%
                        </span>
                        <span className="flex items-center gap-1">
                          <Thermometer className="h-3.5 w-3.5" />
                          ΔT {(weatherReport.airTemperatureC - weatherReport.seaTemperatureC).toFixed(1)}°C
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          {weatherReport.visibilityNm} NM
                        </span>
                        <span className="flex items-center gap-1">
                          <Gauge className="h-3.5 w-3.5" />
                          {weatherReport.barometricPressureHpa} hPa
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-100">
                      {weatherReport.weatherDescription}
                    </p>
                  </div>
                </div>
              </div>

              {/* Kite Size Recommendation Panel */}
              <div className="rounded-xl border border-sky-400/20 bg-[#0A1628] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                      <Compass className="h-4 w-4 text-amber-300" />
                      <span>{t.weather.kiteTitle}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Calculated from sustained wind ({weatherReport.windSpeedKnots} kt) and gusts ({weatherReport.windGustsKnots} kt) at {selectedMarina.name}.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <label htmlFor="rider-weight-slider" className="text-xs font-medium text-slate-300 whitespace-nowrap">
                      {t.weather.riderWeight}:{' '}
                      <span className="font-mono font-semibold text-sky-300 tabular-nums">
                        {riderWeightKg} kg
                      </span>
                    </label>
                    <input
                      id="rider-weight-slider"
                      type="range"
                      min={55}
                      max={110}
                      step={5}
                      value={riderWeightKg}
                      onChange={(e) => setRiderWeightKg(Number(e.target.value))}
                      className="w-36 accent-sky-400"
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 font-mono tabular-nums">
                  <div className="rounded-lg border border-sky-400/15 bg-[#040B16] p-3.5">
                    <div className="font-sans text-xs text-slate-400">{t.weather.recommendedKite}</div>
                    <div className="mt-1 text-2xl font-bold text-sky-300">
                      {kiteAdvice.primarySizeM} m²
                    </div>
                    <div className="mt-0.5 text-xs text-slate-300">
                      {kiteAdvice.rangeLabel} · {kiteAdvice.suitability}
                    </div>
                  </div>
                  <div className="rounded-lg border border-sky-400/15 bg-[#040B16] p-3.5">
                    <div className="font-sans text-xs text-slate-400">Gust / Overpowered Option</div>
                    <div className="mt-1 text-2xl font-bold text-amber-300">
                      {gustKiteAdvice.primarySizeM} m²
                    </div>
                    <div className="mt-0.5 text-xs text-slate-300">
                      {gustKiteAdvice.rangeLabel} · {gustKiteAdvice.suitability}
                    </div>
                  </div>
                  <div className="rounded-lg border border-sky-400/15 bg-[#040B16] p-3.5">
                    <div className="font-sans text-xs text-slate-400">Peak Daily Wind Window</div>
                    <div className="mt-1 text-2xl font-bold text-slate-100">
                      {forecastDays[0]?.maxWind ?? weatherReport.windSpeedKnots} {t.weather.knots}
                    </div>
                    <div className="mt-0.5 font-sans text-xs text-slate-400">
                      Thermal peak 13:00–17:00
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: 10-Day Global 1h and 3h Forecast (GFS 27) */}
      {activeTab === 'forecast' && (
        <div className="space-y-4 rounded-xl border border-sky-400/20 bg-[#0A1628] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-400/15 pb-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-100">
                {t.weather.gfsForecastTitle}
              </h2>
              <div className="mt-0.5 font-mono text-xs text-amber-300">
                {forecastModeUsed === WeatherSourceMode.OPEN_METEO_API
                  ? 'Open-Meteo 10-Day Hourly Model'
                  : 'GFS 27 Simulated Demonstration Forecast · 240h'}
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-sky-400/20 bg-[#040B16] p-1">
              <button
                type="button"
                onClick={() => setStepHours(1)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  stepHours === 1 ? 'bg-sky-500 text-slate-950' : 'text-slate-300 hover:text-sky-300'
                }`}
              >
                {t.weather.step1h}
              </button>
              <button
                type="button"
                onClick={() => setStepHours(3)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  stepHours === 3 ? 'bg-sky-500 text-slate-950' : 'text-slate-300 hover:text-sky-300'
                }`}
              >
                {t.weather.step3h}
              </button>
            </div>
          </div>

          {/* Day 1 - Day 10 Selector Strip */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {forecastDays.map((day, idx) => (
              <button
                key={day.dayLabel}
                type="button"
                onClick={() => setSelectedDayIdx(idx)}
                className={`flex shrink-0 flex-col items-start rounded-lg border px-3 py-2 text-start transition-colors ${
                  selectedDayIdx === idx
                    ? 'border-amber-400/60 bg-[#0F2340] text-slate-50'
                    : 'border-sky-400/15 bg-[#040B16] text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-xs font-medium">{day.dayLabel}</span>
                <span className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-sky-300">
                  Max {day.maxWind} {t.weather.knots}
                </span>
              </button>
            ))}
          </div>

          {forecastLoading ? (
            <div className="py-10 text-center text-xs text-slate-400">{t.weather.fetchingApi}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-start text-xs">
                <thead>
                  <tr className="border-b border-sky-400/15 bg-[#040B16] text-slate-400">
                    <th className="px-3 py-2.5 text-start">UTC</th>
                    <th className="px-3 py-2.5 text-end">{t.weather.windSpeed}</th>
                    <th className="px-3 py-2.5 text-end">{t.weather.windGusts}</th>
                    <th className="px-3 py-2.5 text-start">{t.weather.windDirection}</th>
                    <th className="px-3 py-2.5 text-end">{t.weather.waveHeight}</th>
                    <th className="px-3 py-2.5 text-end">{t.weather.tideHeight}</th>
                    <th className="px-3 py-2.5 text-end">{t.weather.dayNightTemp}</th>
                    <th className="px-3 py-2.5 text-end">{t.weather.pressure}</th>
                    <th className="px-3 py-2.5 text-start">{t.weather.conditions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-400/10 font-mono tabular-nums">
                  {currentDaySlots.map((slot) => (
                    <tr key={slot.isoTime} className="hover:bg-slate-800/35">
                      <td className="px-3 py-2.5 font-semibold text-slate-200">{slot.hourLabel}</td>
                      <td className="px-3 py-2.5 text-end font-semibold text-sky-300">
                        {slot.windKnots} {t.weather.knots}
                      </td>
                      <td className="px-3 py-2.5 text-end text-amber-300">
                        {slot.gustKnots} {t.weather.knots}
                      </td>
                      <td className="px-3 py-2.5 text-slate-200">
                        <span className="inline-flex items-center gap-1.5">
                          <svg
                            viewBox="0 0 16 16"
                            className="h-3 w-3 shrink-0"
                            style={{ transform: `rotate(${slot.windDirDeg}deg)` }}
                            aria-hidden="true"
                          >
                            <path d="M8 2 L11 11 L8 9 L5 11 Z" fill="#38BDF8" />
                          </svg>
                          {slot.windDirDeg}° {slot.windDirCardinal}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-end text-slate-200">
                        {slot.waveHeightM}m / {slot.wavePeriodS}s
                      </td>
                      <td className="px-3 py-2.5 text-end text-sky-200">
                        +{slot.tideHeightM.toFixed(2)}m
                      </td>
                      <td className="px-3 py-2.5 text-end text-slate-200">
                        {slot.tempDayC}° / {slot.tempNightC}°
                      </td>
                      <td className="px-3 py-2.5 text-end text-slate-300">{slot.pressureHpa} hPa</td>
                      <td className="px-3 py-2.5 font-sans text-slate-300">{slot.condition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Waves & Tides + Weather Station Readings */}
      {activeTab === 'tides' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Daily Tides & Wave State */}
          <div className="rounded-xl border border-sky-400/20 bg-[#0A1628] p-5 lg:col-span-5">
            <div className="flex items-center justify-between border-b border-sky-400/15 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Waves className="h-4 w-4 text-sky-400" />
                <span>{t.weather.tidesTitle}</span>
              </div>
              <span className="font-mono text-[11px] text-amber-300">Demo Harmonic</span>
            </div>

            <div className="mt-4 space-y-2.5">
              {dailyTides.map((tide, i) => (
                <div
                  key={`${tide.timeLabel}-${i}`}
                  className="flex items-center justify-between rounded-lg border border-sky-400/15 bg-[#040B16] px-4 py-3 font-mono text-xs tabular-nums"
                >
                  <div>
                    <div className="font-sans text-xs font-semibold text-slate-100">
                      {tide.type === 'High' ? 'High Tide' : 'Low Tide'}
                    </div>
                    <div className="text-slate-400">{tide.timeLabel} Local</div>
                  </div>
                  <div
                    className={`text-sm font-bold ${
                      tide.type === 'High' ? 'text-sky-300' : 'text-slate-300'
                    }`}
                  >
                    +{tide.heightM.toFixed(2)} {t.weather.meters}
                  </div>
                </div>
              ))}
            </div>

            {weatherReport && (
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-sky-400/15 pt-4 font-mono text-xs tabular-nums">
                <div>
                  <div className="font-sans text-slate-400">{t.weather.waveHeight}</div>
                  <div className="mt-0.5 text-sm font-semibold text-sky-300">
                    {weatherReport.waveHeightMeters.toFixed(2)} {t.weather.meters}
                  </div>
                </div>
                <div>
                  <div className="font-sans text-slate-400">{t.weather.wavePeriod}</div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-100">
                    {weatherReport.wavePeriodSeconds.toFixed(1)} {t.weather.seconds}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Nearby Weather Stations */}
          <div className="rounded-xl border border-sky-400/20 bg-[#0A1628] p-5 lg:col-span-7">
            <div className="flex items-center justify-between border-b border-sky-400/15 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Radio className="h-4 w-4 text-amber-300" />
                <span>{t.weather.stationsTitle}</span>
              </div>
              <span className="font-mono text-[11px] text-amber-300">
                Demonstration Station Baseline
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {nearbyStations.map((st) => (
                <div
                  key={st.id}
                  className="flex flex-col gap-3 rounded-lg border border-sky-400/15 bg-[#040B16] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{st.stationName}</div>
                    <div className="mt-0.5 font-mono text-xs text-slate-400 tabular-nums">
                      {st.distanceNm} NM · {st.updatedAgo}
                    </div>
                  </div>
                  <div className="flex items-center gap-5 font-mono text-xs tabular-nums">
                    <div>
                      <div className="text-slate-400">{t.weather.windSpeed}</div>
                      <div className="font-semibold text-sky-300">
                        {st.windKnots} {t.weather.knots}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">{t.weather.windGusts}</div>
                      <div className="font-semibold text-amber-300">
                        {st.gustKnots} {t.weather.knots}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">{t.weather.windDirection}</div>
                      <div className="font-semibold text-slate-200">
                        {st.windDirDeg}° {st.windDirCardinal}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">{t.weather.pressure}</div>
                      <div className="font-semibold text-slate-200">{st.pressureHpa} hPa</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: 10-Day Forecast History & 12-Month Weather Archive */}
      {activeTab === 'archive' && (
        <div className="space-y-5">
          {/* Best Month to Travel Banner + 12-Month Weather Archive */}
          <div className="rounded-xl border border-sky-400/20 bg-[#0A1628] p-5">
            <div className="flex flex-col gap-3 border-b border-sky-400/15 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-100">
                  {t.weather.archiveTitle}
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {selectedMarina.name} ({selectedMarina.seaBasin}) · Day/Night temperature, wind, and barometric archive
                </p>
              </div>
              <div className="rounded-lg border border-amber-400/40 bg-[#0F2340] px-4 py-2 text-end">
                <div className="text-[11px] font-medium text-amber-300">
                  {t.weather.bestMonthLabel}
                </div>
                <div className="font-display text-base font-bold text-slate-50">
                  {annualArchive.bestMonth.monthLabel} · {annualArchive.bestMonth.avgWindKnots} {t.weather.knots} · {annualArchive.bestMonth.goodWindDays} days
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-start text-xs">
                <thead>
                  <tr className="border-b border-sky-400/15 bg-[#040B16] text-slate-400">
                    <th className="px-3 py-2.5 text-start">Month</th>
                    <th className="px-3 py-2.5 text-end">{t.weather.windSpeed}</th>
                    <th className="px-3 py-2.5 text-end">{t.weather.dayNightTemp}</th>
                    <th className="px-3 py-2.5 text-end">{t.weather.seaTemp}</th>
                    <th className="px-3 py-2.5 text-end">{t.weather.pressure}</th>
                    <th className="px-3 py-2.5 text-end">{t.weather.goodWindDays}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-400/10 font-mono tabular-nums">
                  {annualArchive.months.map((m) => {
                    const isBest = m.monthIndex === annualArchive.bestMonth.monthIndex;
                    return (
                      <tr
                        key={m.monthLabel}
                        className={isBest ? 'bg-amber-400/10' : 'hover:bg-slate-800/35'}
                      >
                        <td className="px-3 py-2 font-sans font-semibold text-slate-100">
                          {m.monthLabel}
                          {isBest && (
                            <span className="ms-2 font-mono text-[11px] text-amber-300">★ Best</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-end font-semibold text-sky-300">
                          {m.avgWindKnots} {t.weather.knots}
                        </td>
                        <td className="px-3 py-2 text-end text-slate-200">
                          {m.tempDayC}° / {m.tempNightC}°C
                        </td>
                        <td className="px-3 py-2 text-end text-sky-200">{m.seaTempC}°C</td>
                        <td className="px-3 py-2 text-end text-slate-300">{m.pressureHpa} hPa</td>
                        <td className="px-3 py-2 text-end font-semibold text-slate-100">
                          {m.goodWindDays} d
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 10-Day Forecast History */}
          <div className="rounded-xl border border-sky-400/20 bg-[#0A1628] p-5">
            <div className="flex items-center justify-between border-b border-sky-400/15 pb-3">
              <h2 className="font-display text-base font-semibold text-slate-100">
                {t.weather.historyTitle}
              </h2>
              <span className="font-mono text-[11px] text-amber-300">Demo Historical Baseline</span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-start text-xs">
                <thead>
                  <tr className="border-b border-sky-400/15 bg-[#040B16] text-slate-400">
                    <th className="px-3 py-2.5 text-start">Date</th>
                    <th className="px-3 py-2.5 text-end">{t.weather.windSpeed}</th>
                    <th className="px-3 py-2.5 text-end">{t.weather.windGusts}</th>
                    <th className="px-3 py-2.5 text-end">{t.weather.dayNightTemp}</th>
                    <th className="px-3 py-2.5 text-end">{t.weather.pressure}</th>
                    <th className="px-3 py-2.5 text-end">{t.weather.waveHeight}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-400/10 font-mono tabular-nums">
                  {historyDays.map((row) => (
                    <tr key={row.dateLabel} className="hover:bg-slate-800/35">
                      <td className="px-3 py-2 font-semibold text-slate-200">{row.dateLabel}</td>
                      <td className="px-3 py-2 text-end text-sky-300">
                        {row.avgWindKnots} {t.weather.knots}
                      </td>
                      <td className="px-3 py-2 text-end text-amber-300">
                        {row.maxGustKnots} {t.weather.knots}
                      </td>
                      <td className="px-3 py-2 text-end text-slate-200">
                        {row.tempDayC}° / {row.tempNightC}°C
                      </td>
                      <td className="px-3 py-2 text-end text-slate-300">{row.pressureHpa} hPa</td>
                      <td className="px-3 py-2 text-end text-slate-200">
                        {row.waveMaxM} {t.weather.meters}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
