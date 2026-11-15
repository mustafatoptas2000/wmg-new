import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Anchor,
  CheckCircle2,
  Compass,
  Droplets,
  Fuel,
  Layers,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  Trash2,
  Waves,
  Wind,
} from 'lucide-react';
import {
  ChartLayerToggles,
  ChartSelection,
  NauticalChartCanvas,
} from '../components/chart/NauticalChartCanvas';
import { CoordinateDisplay } from '../components/common/CoordinateDisplay';
import { DemoDataNotice } from '../components/common/DemoDataNotice';
import { SectionHeader } from '../components/common/SectionHeader';
import { StatTile } from '../components/common/StatTile';
import {
  NAUTICAL_ANCHORAGES,
  NAUTICAL_NAVAIDS,
  SEA_CURRENTS,
  WEATHER_BUOYS,
  getPortPlanFeatures,
} from '../data/nauticalChartData';
import { MARITIME_SERVICES } from '../data/services';
import { useLanguage } from '../i18n/LanguageContext';
import { buildPierToPierRoute } from '../services/chartRouteService';
import {
  fetchOpenMeteo10DayForecast,
  generateGfs10DayForecast,
  getDailyTideSchedule,
} from '../services/forecastService';
import { calculateGreatCirclePassage } from '../services/navigationCalcService';
import {
  ForecastSlot,
  Marina,
  MarineWeatherReport,
  RouteWaypoint,
  WeatherSourceMode,
} from '../types/maritime';

interface NauticalChartViewProps {
  marinas: Marina[];
  selectedMarina: Marina;
  onSelectMarina: (marina: Marina) => void;
  weatherReport: MarineWeatherReport | null;
  weatherSourceMode: WeatherSourceMode;
  onChangeSourceMode: (mode: WeatherSourceMode) => void;
  onRefreshWeather: () => void;
  weatherLoading: boolean;
}

export const NauticalChartView: React.FC<NauticalChartViewProps> = ({
  marinas,
  selectedMarina,
  onSelectMarina,
  weatherReport,
  weatherSourceMode,
  onChangeSourceMode,
  onRefreshWeather,
  weatherLoading,
}) => {
  const { t } = useLanguage();

  // Chart Display & Layer State
  const [portPlanMode, setPortPlanMode] = useState(false);
  const [addWaypointMode, setAddWaypointMode] = useState(false);
  const [safetyDraftM, setSafetyDraftM] = useState(3.2);
  const [layers, setLayers] = useState<ChartLayerToggles>({
    depthContours: true,
    anchorages: true,
    navaids: true,
    services: true,
    buoys: true,
    currents: true,
  });

  // Inspector Tabs
  const [inspectorTab, setInspectorTab] = useState<'inspector' | 'weather' | 'portPlan'>('inspector');
  const [activeSelection, setActiveSelection] = useState<ChartSelection>({
    type: 'marina',
    item: selectedMarina,
  });

  // Pier-to-Pier Route Planner State
  const [originId, setOriginId] = useState<string>(selectedMarina.id);
  const [destId, setDestId] = useState<string>(
    () => marinas.find((m) => m.id === 'tr-marmaris-netsel')?.id ?? marinas[1]?.id ?? selectedMarina.id,
  );
  const [speedKnots, setSpeedKnots] = useState<number>(12);
  const [burnRateLph, setBurnRateLph] = useState<number>(48);
  const [reservePct, setReservePct] = useState<number>(15);
  const [useCoastalFairways, setUseCoastalFairways] = useState<boolean>(true);
  const [customWaypoints, setCustomWaypoints] = useState<RouteWaypoint[]>([]);

  // Sync activeSelection if user changes selectedMarina from header/sidebar
  useEffect(() => {
    setActiveSelection((prev) =>
      prev.type === 'marina' ? { type: 'marina', item: selectedMarina } : prev,
    );
  }, [selectedMarina]);

  // Forecast data (Hourly & Daily) for the selected marina
  const [forecastSlots, setForecastSlots] = useState<ForecastSlot[]>(() =>
    generateGfs10DayForecast(selectedMarina, 1),
  );
  const [forecastSource, setForecastSource] = useState<WeatherSourceMode>(weatherSourceMode);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (weatherSourceMode === WeatherSourceMode.OPEN_METEO_API) {
        const res = await fetchOpenMeteo10DayForecast(selectedMarina, 1);
        if (active) {
          setForecastSlots(res.slots);
          setForecastSource(res.mode);
        }
      } else {
        setForecastSlots(generateGfs10DayForecast(selectedMarina, 1));
        setForecastSource(WeatherSourceMode.DEMONSTRATION);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [selectedMarina, weatherSourceMode]);

  const originMarina = useMemo(
    () => marinas.find((m) => m.id === originId) ?? selectedMarina,
    [marinas, originId, selectedMarina],
  );
  const destMarina = useMemo(
    () => marinas.find((m) => m.id === destId) ?? marinas[0],
    [marinas, destId],
  );

  const routeSummary = useMemo(
    () =>
      buildPierToPierRoute({
        origin: originMarina,
        destination: destMarina,
        customWaypoints,
        useRecommendedWaypoints: useCoastalFairways,
        speedKnots,
        vesselDraftM: safetyDraftM,
        burnRateLph,
        reservePct,
      }),
    [originMarina, destMarina, customWaypoints, useCoastalFairways, speedKnots, safetyDraftM, burnRateLph, reservePct],
  );

  const handleSelectChartObject = (selection: ChartSelection) => {
    setActiveSelection(selection);
    setInspectorTab('inspector');
    if (selection.type === 'marina') {
      onSelectMarina(selection.item);
    }
  };

  const handleAddCustomWaypoint = (lat: number, lon: number) => {
    setCustomWaypoints((prev) => [
      ...prev,
      {
        id: `custom-wp-${Date.now()}`,
        name: `Chart WP ${prev.length + 1} (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
        lat,
        lon,
        kind: 'custom',
        minDepthM: 18,
      },
    ]);
  };

  const toggleLayer = (key: keyof ChartLayerToggles) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hourlyNext24 = useMemo(() => forecastSlots.slice(0, 24).filter((_, i) => i % 3 === 0), [forecastSlots]);
  const dailySummary = useMemo(() => {
    const days: { dayLabel: string; maxWind: number; minTemp: number; maxTemp: number; maxWave: number; condition: string }[] = [];
    for (let d = 0; d < Math.min(7, Math.floor(forecastSlots.length / 24)); d++) {
      const slice = forecastSlots.slice(d * 24, (d + 1) * 24);
      if (slice.length === 0) break;
      days.push({
        dayLabel: slice[0].dayLabel,
        maxWind: Math.max(...slice.map((s) => s.windKnots)),
        minTemp: Math.min(...slice.map((s) => s.tempNightC)),
        maxTemp: Math.max(...slice.map((s) => s.tempDayC)),
        maxWave: Math.max(...slice.map((s) => s.waveHeightM)),
        condition: slice[Math.min(12, slice.length - 1)].condition,
      });
    }
    return days;
  }, [forecastSlots]);

  const dailyTides = useMemo(() => getDailyTideSchedule(selectedMarina), [selectedMarina]);

  const nearestBuoy = useMemo(() => {
    return WEATHER_BUOYS.reduce((best, b) => {
      const dCur = calculateGreatCirclePassage(selectedMarina.latitude, selectedMarina.longitude, b.lat, b.lon, 10).distanceNm;
      const dBest = calculateGreatCirclePassage(selectedMarina.latitude, selectedMarina.longitude, best.lat, best.lon, 10).distanceNm;
      return dCur < dBest ? b : best;
    }, WEATHER_BUOYS[0]);
  }, [selectedMarina]);

  const portPlanFeatures = useMemo(
    () => getPortPlanFeatures(selectedMarina.name, selectedMarina.maxDraftMeters, selectedMarina.portOfEntry),
    [selectedMarina],
  );

  const marinaServices = useMemo(
    () => MARITIME_SERVICES.filter((s) => s.marinaId === selectedMarina.id),
    [selectedMarina],
  );

  return (
    <div className="space-y-6">
      <SectionHeader title={t.chart.title} subtitle={t.chart.subtitle} />

      {/* Top Reference Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatTile
          label={t.chart.anchoragesCount}
          value={NAUTICAL_ANCHORAGES.length}
          detail="Turkey · Aegean · Med"
          accent="gold"
        />
        <StatTile
          label={t.chart.navaidsCount}
          value={NAUTICAL_NAVAIDS.length}
          detail="IALA Lights & Racons"
          accent="sky"
        />
        <StatTile
          label={t.chart.buoysCount}
          value={WEATHER_BUOYS.length}
          detail={`${SEA_CURRENTS.length} Current Streams`}
          accent="sky"
        />
        <StatTile
          label={t.chart.totalDistance}
          value={`${routeSummary.totalDistanceNm} NM`}
          detail={`${routeSummary.totalEtaFormatted} · ${routeSummary.totalFuelLiters} L`}
          accent={routeSummary.hasShallowWarning ? 'gold' : 'sky'}
        />
      </div>

      {/* Chart Layer & Mode Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-400/20 bg-[#0A1628] p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="me-1 flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Layers className="h-3.5 w-3.5 text-teal-300" />
          </span>
          {(
            [
              ['depthContours', t.chart.layerDepthContours],
              ['anchorages', t.chart.layerAnchorages],
              ['navaids', t.chart.layerNavaids],
              ['services', t.chart.layerServices],
              ['buoys', t.chart.layerBuoys],
              ['currents', t.chart.layerCurrents],
            ] as [keyof ChartLayerToggles, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleLayer(key)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                layers[key]
                  ? 'border-teal-400/55 bg-teal-500/15 text-teal-200'
                  : 'border-sky-400/15 bg-[#040B16] text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-sky-400/20 bg-[#040B16] px-2.5 py-1 text-xs text-slate-300">
            <span>{t.chart.safetyDraftLabel}:</span>
            <input
              type="number"
              min={1}
              max={20}
              step={0.5}
              value={safetyDraftM}
              onChange={(e) => setSafetyDraftM(Math.max(0.5, Number(e.target.value) || 2))}
              className="w-14 bg-transparent font-mono text-xs font-semibold tabular-nums text-amber-300 focus:outline-none"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setPortPlanMode((prev) => !prev);
              if (!portPlanMode) setInspectorTab('portPlan');
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              portPlanMode
                ? 'border-amber-400/65 bg-amber-500/20 text-amber-200'
                : 'border-sky-400/25 bg-[#040B16] text-slate-200 hover:border-teal-400/50 hover:text-teal-200'
            }`}
          >
            <Anchor className="h-3.5 w-3.5" />
            <span>{t.chart.portPlanMode}</span>
          </button>

          {!portPlanMode && (
            <button
              type="button"
              onClick={() => setAddWaypointMode((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                addWaypointMode
                  ? 'border-orange-400/70 bg-orange-500/20 text-orange-200'
                  : 'border-sky-400/25 bg-[#040B16] text-slate-200 hover:border-orange-400/50'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>{t.chart.addWaypointMode}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace: Interactive Nautical Chart (8 cols) + Context Inspector / Live Weather & Tides (4 cols) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-stretch">
        <div className="overflow-hidden rounded-xl border border-sky-400/20 bg-[#040D1B] lg:col-span-8">
          <NauticalChartCanvas
            marinas={marinas}
            selectedMarina={selectedMarina}
            routeWaypoints={routeSummary.waypoints}
            hasShallowWarning={routeSummary.hasShallowWarning}
            safetyDraftM={safetyDraftM}
            layers={layers}
            portPlanMode={portPlanMode}
            addWaypointMode={addWaypointMode}
            onAddCustomWaypoint={handleAddCustomWaypoint}
            onSelectObject={handleSelectChartObject}
            activeSelection={activeSelection}
          />
        </div>

        {/* Right 4 Columns: Inspector / Weather & Tides / Port Plan */}
        <div className="flex flex-col rounded-xl border border-sky-400/20 bg-[#0A1628] lg:col-span-4">
          <div className="grid grid-cols-3 border-b border-sky-400/15 bg-[#071121] p-1">
            {(
              [
                ['inspector', t.chart.tabInspector],
                ['weather', t.chart.tabWeatherTides],
                ['portPlan', t.chart.tabPortPlan],
              ] as const
            ).map(([tabId, label]) => (
              <button
                key={tabId}
                type="button"
                onClick={() => setInspectorTab(tabId)}
                className={`rounded-md px-2 py-2 text-[11px] font-medium transition-colors truncate ${
                  inspectorTab === tabId
                    ? 'bg-teal-500/20 text-teal-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {inspectorTab === 'inspector' && (
              <div className="space-y-4">
                {activeSelection.type === 'marina' && (
                  <>
                    <div className="border-b border-sky-400/15 pb-3">
                      <div className="text-xs font-medium text-sky-300">
                        {activeSelection.item.country} · {activeSelection.item.city} · {activeSelection.item.seaBasin}
                      </div>
                      <h3 className="mt-1 font-display text-lg font-semibold text-slate-50">
                        {activeSelection.item.name}
                      </h3>
                      <div className="mt-2">
                        <CoordinateDisplay
                          latitude={activeSelection.item.latitude}
                          longitude={activeSelection.item.longitude}
                          dms={activeSelection.item.coordinates}
                        />
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed text-slate-300">{activeSelection.item.summary}</p>

                    <div className="grid grid-cols-2 gap-2.5 font-mono text-xs tabular-nums">
                      <div className="rounded-lg bg-[#040B16] p-2.5">
                        <div className="text-[11px] text-slate-400">{t.marinas.maxDraft}</div>
                        <div className="mt-0.5 font-semibold text-teal-300">
                          {activeSelection.item.maxDraftMeters.toFixed(1)} m
                        </div>
                      </div>
                      <div className="rounded-lg bg-[#040B16] p-2.5">
                        <div className="text-[11px] text-slate-400">{t.common.vhf}</div>
                        <div className="mt-0.5 font-semibold text-amber-300">
                          {activeSelection.item.vhfChannel.split('/')[0].trim()}
                        </div>
                      </div>
                      <div className="rounded-lg bg-[#040B16] p-2.5">
                        <div className="text-[11px] text-slate-400">{t.marinas.maxLoa}</div>
                        <div className="mt-0.5 font-semibold text-slate-100">
                          {activeSelection.item.maxLoaMeters} m
                        </div>
                      </div>
                      <div className="rounded-lg bg-[#040B16] p-2.5">
                        <div className="text-[11px] text-slate-400">{t.common.portOfEntry}</div>
                        <div className="mt-0.5 font-semibold text-slate-100">
                          {activeSelection.item.portOfEntry ? t.common.yes : t.common.no}
                        </div>
                      </div>
                    </div>

                    {marinaServices.length > 0 && (
                      <div className="space-y-2 border-t border-sky-400/15 pt-3">
                        <div className="text-xs font-semibold text-indigo-300">{t.chart.layerServices}</div>
                        {marinaServices.map((srv) => (
                          <div key={srv.id} className="rounded-lg border border-indigo-400/20 bg-[#040B16] p-2.5 text-xs">
                            <div className="font-medium text-slate-100">{srv.title}</div>
                            <div className="mt-0.5 text-[11px] text-slate-400">
                              {srv.provider} · {srv.vhfOrContact}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setOriginId(activeSelection.item.id)}
                        className="rounded-lg border border-sky-400/30 bg-[#040B16] px-3 py-2 text-xs font-medium text-sky-300 hover:border-sky-400/60"
                      >
                        Set Departure
                      </button>
                      <button
                        type="button"
                        onClick={() => setDestId(activeSelection.item.id)}
                        className="rounded-lg border border-teal-400/30 bg-[#040B16] px-3 py-2 text-xs font-medium text-teal-300 hover:border-teal-400/60"
                      >
                        Set Arrival
                      </button>
                    </div>
                  </>
                )}

                {activeSelection.type === 'anchorage' && (
                  <div className="space-y-3">
                    <div className="border-b border-sky-400/15 pb-3">
                      <div className="text-xs font-medium text-amber-300">
                        Anchorage · {activeSelection.item.country} · {activeSelection.item.city}
                      </div>
                      <h3 className="mt-1 font-display text-lg font-semibold text-slate-50">
                        {activeSelection.item.name}
                      </h3>
                      <div className="mt-1 font-mono text-xs tabular-nums text-slate-400">
                        {activeSelection.item.lat.toFixed(4)}° N, {activeSelection.item.lon.toFixed(4)}° E
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 font-mono text-xs tabular-nums">
                      <div className="rounded-lg bg-[#040B16] p-2.5">
                        <div className="text-[11px] text-slate-400">Depth Range</div>
                        <div className="mt-0.5 font-semibold text-teal-300">
                          {activeSelection.item.minDepthM}–{activeSelection.item.maxDepthM} m
                        </div>
                      </div>
                      <div className="rounded-lg bg-[#040B16] p-2.5">
                        <div className="text-[11px] text-slate-400">Seabed / Holding</div>
                        <div className="mt-0.5 font-semibold text-amber-300">
                          {activeSelection.item.seabed} ({activeSelection.item.holdingRating})
                        </div>
                      </div>
                      <div className="rounded-lg bg-[#040B16] p-2.5">
                        <div className="text-[11px] text-slate-400">Shelter From</div>
                        <div className="mt-0.5 font-semibold text-slate-100">{activeSelection.item.shelterFrom}</div>
                      </div>
                      <div className="rounded-lg bg-[#040B16] p-2.5">
                        <div className="text-[11px] text-slate-400">Capacity</div>
                        <div className="mt-0.5 font-semibold text-slate-100">
                          ~{activeSelection.item.capacityVessels} vessels
                        </div>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-300">{activeSelection.item.notes}</p>
                  </div>
                )}

                {activeSelection.type === 'navaid' && (
                  <div className="space-y-3">
                    <div className="border-b border-sky-400/15 pb-3">
                      <div className="text-xs font-medium text-yellow-300">
                        IALA Navaid · {activeSelection.item.seaBasin}
                      </div>
                      <h3 className="mt-1 font-display text-lg font-semibold text-slate-50">
                        {activeSelection.item.name}
                      </h3>
                      <div className="mt-1 font-mono text-xs tabular-nums text-slate-400">
                        {activeSelection.item.lat.toFixed(4)}°, {activeSelection.item.lon.toFixed(4)}°
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#040B16] p-3 font-mono text-xs">
                      <div className="text-slate-400">Light Characteristic</div>
                      <div className="mt-1 font-semibold text-yellow-300">
                        {activeSelection.item.lightCharacteristic}
                      </div>
                      <div className="mt-2 text-slate-400">Nominal Range: {activeSelection.item.rangeNm} NM</div>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-300">{activeSelection.item.notes}</p>
                  </div>
                )}

                {activeSelection.type === 'buoy' && (
                  <div className="space-y-3">
                    <div className="border-b border-sky-400/15 pb-3">
                      <div className="text-xs font-medium text-cyan-300">
                        Weather Buoy · {activeSelection.item.seaBasin}
                      </div>
                      <h3 className="mt-1 font-display text-lg font-semibold text-slate-50">
                        {activeSelection.item.name}
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 font-mono text-xs tabular-nums">
                      <div className="rounded-lg bg-[#040B16] p-2.5">
                        <div className="text-[11px] text-slate-400">Wind / Gust</div>
                        <div className="mt-0.5 font-semibold text-cyan-300">
                          {activeSelection.item.windKnots} / {activeSelection.item.gustKnots} kt ({activeSelection.item.windDirDeg}°)
                        </div>
                      </div>
                      <div className="rounded-lg bg-[#040B16] p-2.5">
                        <div className="text-[11px] text-slate-400">Wave / Period</div>
                        <div className="mt-0.5 font-semibold text-slate-100">
                          {activeSelection.item.waveHeightM} m · {activeSelection.item.wavePeriodS} s
                        </div>
                      </div>
                      <div className="rounded-lg bg-[#040B16] p-2.5">
                        <div className="text-[11px] text-slate-400">Sea Temp / Pressure</div>
                        <div className="mt-0.5 font-semibold text-slate-100">
                          {activeSelection.item.seaTempC}°C · {activeSelection.item.pressureHpa} hPa
                        </div>
                      </div>
                      <div className="rounded-lg bg-[#040B16] p-2.5">
                        <div className="text-[11px] text-slate-400">Surface Current</div>
                        <div className="mt-0.5 font-semibold text-teal-300">
                          {activeSelection.item.currentKnots} kt @ {activeSelection.item.currentDirDeg}°
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSelection.type === 'current' && (
                  <div className="space-y-3">
                    <div className="border-b border-sky-400/15 pb-3">
                      <div className="text-xs font-medium text-teal-300">
                        {activeSelection.item.type} · {activeSelection.item.seaBasin}
                      </div>
                      <h3 className="mt-1 font-display text-lg font-semibold text-slate-50">
                        {activeSelection.item.name}
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 font-mono text-xs tabular-nums">
                      <div className="rounded-lg bg-[#040B16] p-2.5">
                        <div className="text-[11px] text-slate-400">Drift Speed</div>
                        <div className="mt-0.5 font-semibold text-teal-300">{activeSelection.item.speedKnots} kt</div>
                      </div>
                      <div className="rounded-lg bg-[#040B16] p-2.5">
                        <div className="text-[11px] text-slate-400">Set Direction</div>
                        <div className="mt-0.5 font-semibold text-slate-100">{activeSelection.item.directionDeg}°T</div>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-300">{activeSelection.item.notes}</p>
                  </div>
                )}

                {activeSelection.type === 'service' && (
                  <div className="space-y-3">
                    <div className="border-b border-sky-400/15 pb-3">
                      <div className="text-xs font-medium text-indigo-300">
                        {activeSelection.marina.name} · {activeSelection.item.category.toUpperCase()}
                      </div>
                      <h3 className="mt-1 font-display text-lg font-semibold text-slate-50">
                        {activeSelection.item.title}
                      </h3>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-300">{activeSelection.item.specifications}</p>
                    <div className="rounded-lg bg-[#040B16] p-3 text-xs text-slate-300 space-y-1">
                      <div>
                        <span className="text-slate-400">Provider: </span>
                        {activeSelection.item.provider}
                      </div>
                      <div>
                        <span className="text-slate-400">Hours: </span>
                        {activeSelection.item.availability}
                      </div>
                      <div className="font-mono text-amber-300">{activeSelection.item.vhfOrContact}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {inspectorTab === 'weather' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-400/15 pb-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-100">{selectedMarina.name}</div>
                    <div className="font-mono text-[11px] text-amber-300">
                      {forecastSource === WeatherSourceMode.OPEN_METEO_API
                        ? t.weather.sourceApi
                        : t.weather.sourceDemo}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onChangeSourceMode(WeatherSourceMode.DEMONSTRATION)}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                        weatherSourceMode === WeatherSourceMode.DEMONSTRATION
                          ? 'bg-amber-400/20 text-amber-200'
                          : 'bg-[#040B16] text-slate-400'
                      }`}
                    >
                      Demo
                    </button>
                    <button
                      type="button"
                      onClick={onRefreshWeather}
                      disabled={weatherLoading}
                      className="flex items-center gap-1 rounded-md bg-sky-500 px-2.5 py-1 text-[11px] font-semibold text-slate-950 hover:bg-sky-400"
                    >
                      <RefreshCw className={`h-3 w-3 ${weatherLoading ? 'animate-spin' : ''}`} />
                      <span>{weatherLoading ? '...' : 'Live API'}</span>
                    </button>
                  </div>
                </div>

                {weatherReport && (
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs tabular-nums">
                    <div className="rounded-lg bg-[#040B16] p-2">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Wind className="h-3 w-3 text-sky-300" />
                        <span>{t.weather.windSpeed}</span>
                      </div>
                      <div className="mt-0.5 font-semibold text-sky-300">
                        {weatherReport.windSpeedKnots} kt {weatherReport.windDirectionCardinal}
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#040B16] p-2">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Waves className="h-3 w-3 text-teal-300" />
                        <span>{t.weather.waveHeight}</span>
                      </div>
                      <div className="mt-0.5 font-semibold text-teal-200">
                        {weatherReport.waveHeightMeters} m · {weatherReport.wavePeriodSeconds}s
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#040B16] p-2">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Droplets className="h-3 w-3 text-cyan-300" />
                        <span>{t.weather.seaTemp}</span>
                      </div>
                      <div className="mt-0.5 font-semibold text-slate-100">
                        {weatherReport.seaTemperatureC}°C
                      </div>
                    </div>
                  </div>
                )}

                {/* Nearest Weather Buoy */}
                <div className="rounded-lg border border-cyan-400/20 bg-[#040B16] p-3 text-xs">
                  <div className="font-semibold text-cyan-300">{t.chart.weatherBuoysTitle}: {nearestBuoy.name}</div>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5 font-mono text-[11px] tabular-nums text-slate-300">
                    <span>Wind: {nearestBuoy.windKnots}kt (G {nearestBuoy.gustKnots})</span>
                    <span>Wave: {nearestBuoy.waveHeightM}m / {nearestBuoy.wavePeriodS}s</span>
                    <span>Sea Temp: {nearestBuoy.seaTempC}°C</span>
                    <span>Current: {nearestBuoy.currentKnots}kt @ {nearestBuoy.currentDirDeg}°</span>
                  </div>
                </div>

                {/* Daily Tides */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-200">{t.chart.tidesAndCurrents}</div>
                  <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] tabular-nums">
                    {dailyTides.map((tide, i) => (
                      <div key={i} className="flex items-center justify-between rounded bg-[#040B16] px-2.5 py-1.5">
                        <span className={tide.type === 'High' ? 'text-sky-300' : 'text-amber-300'}>
                          {tide.type} {tide.timeLabel}
                        </span>
                        <span className="text-slate-200">{tide.heightM.toFixed(2)}m</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hourly Forecast (next 24h in 3h steps) */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-200">{t.chart.hourlyForecast}</div>
                  <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px] tabular-nums">
                    {hourlyNext24.map((slot) => (
                      <div key={slot.isoTime} className="rounded bg-[#040B16] p-1.5 text-center">
                        <div className="text-slate-400">{slot.hourLabel}</div>
                        <div className="mt-0.5 font-semibold text-sky-300">{slot.windKnots}kt</div>
                        <div className="text-teal-300">{slot.waveHeightM}m</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Daily Forecast (7 days) */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-200">{t.chart.dailyForecast}</div>
                  <div className="space-y-1 font-mono text-[11px] tabular-nums">
                    {dailySummary.map((d) => (
                      <div key={d.dayLabel} className="flex items-center justify-between rounded bg-[#040B16] px-2.5 py-1.5">
                        <span className="text-slate-300">{d.dayLabel}</span>
                        <span className="text-sky-300">{d.maxWind} kt</span>
                        <span className="text-teal-300">{d.maxWave} m</span>
                        <span className="text-slate-400">{d.minTemp}°/{d.maxTemp}°</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {inspectorTab === 'portPlan' && (
              <div className="space-y-3">
                <div className="border-b border-sky-400/15 pb-3">
                  <div className="text-xs font-medium text-teal-300">{selectedMarina.city} · Port Plan</div>
                  <h3 className="mt-1 font-display text-lg font-semibold text-slate-50">
                    {selectedMarina.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setPortPlanMode(true)}
                    className="mt-2 w-full rounded-lg bg-teal-500/20 border border-teal-400/40 px-3 py-1.5 text-xs font-semibold text-teal-200 hover:bg-teal-500/30"
                  >
                    {t.chart.portPlanMode}
                  </button>
                </div>

                <div className="space-y-2">
                  {portPlanFeatures.map((feat) => {
                    const isSafe = feat.depthM >= safetyDraftM + 0.5;
                    return (
                      <div key={feat.id} className="flex items-center justify-between rounded-lg bg-[#040B16] px-3 py-2 text-xs">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-100 truncate">{feat.label}</div>
                          {feat.vhf && <div className="text-[11px] text-slate-400">{feat.vhf}</div>}
                        </div>
                        <div className="ms-2 text-end font-mono tabular-nums">
                          <div className={isSafe ? 'text-emerald-300' : 'text-amber-300'}>
                            {feat.depthM.toFixed(1)}m
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {isSafe ? t.chart.safeWater : t.chart.shallowAlert}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pier-to-Pier Recommended Route Planner */}
      <section className="rounded-xl border border-sky-400/20 bg-[#0A1628] p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-400/15 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-teal-400/40 bg-teal-500/15 text-teal-300">
              <Route className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-50">
                {t.chart.routePlannerTitle}
              </h2>
              <p className="text-xs text-slate-400">{routeSummary.recommendedCorridorNote}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={useCoastalFairways}
                onChange={(e) => setUseCoastalFairways(e.target.checked)}
                className="rounded border-sky-400/40 bg-[#040B16]"
              />
              <span>{t.chart.autoCoastalRoute}</span>
            </label>
            {customWaypoints.length > 0 && (
              <button
                type="button"
                onClick={() => setCustomWaypoints([])}
                className="flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-200 hover:bg-rose-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{t.chart.clearWaypoints} ({customWaypoints.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Route Parameters */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="block text-xs text-slate-400">{t.chart.departurePier}</label>
            <select
              value={originId}
              onChange={(e) => setOriginId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 text-xs text-slate-100 focus:border-teal-400 focus:outline-none"
            >
              {marinas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.city} — {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400">{t.chart.arrivalPier}</label>
            <select
              value={destId}
              onChange={(e) => setDestId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 text-xs text-slate-100 focus:border-teal-400 focus:outline-none"
            >
              {marinas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.city} — {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400">{t.tools.cruisingSpeed}</label>
            <input
              type="number"
              min={1}
              max={45}
              step={0.5}
              value={speedKnots}
              onChange={(e) => setSpeedKnots(Math.max(1, Number(e.target.value) || 8))}
              className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 font-mono text-xs tabular-nums text-slate-100 focus:border-teal-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400">{t.tools.fuelBurnRate}</label>
            <input
              type="number"
              min={1}
              max={2000}
              step={2}
              value={burnRateLph}
              onChange={(e) => setBurnRateLph(Math.max(0, Number(e.target.value) || 20))}
              className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 font-mono text-xs tabular-nums text-slate-100 focus:border-teal-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400">{t.tools.fuelReservePct}</label>
            <input
              type="number"
              min={0}
              max={50}
              step={5}
              value={reservePct}
              onChange={(e) => setReservePct(Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
              className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 font-mono text-xs tabular-nums text-slate-100 focus:border-teal-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Route Totals Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-sky-400/15 bg-[#040B16] p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Navigation className="h-3.5 w-3.5 text-sky-300" />
              <span>{t.chart.totalDistance}</span>
            </div>
            <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-sky-300">
              {routeSummary.totalDistanceNm} NM
            </div>
            <div className="font-mono text-[11px] tabular-nums text-slate-400">
              {routeSummary.totalDistanceKm} km
            </div>
          </div>

          <div className="rounded-lg border border-sky-400/15 bg-[#040B16] p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Compass className="h-3.5 w-3.5 text-teal-300" />
              <span>{t.chart.arrivalClock}</span>
            </div>
            <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-teal-300">
              {routeSummary.totalEtaFormatted}
            </div>
            <div className="font-mono text-[11px] tabular-nums text-slate-400">
              ETA: {routeSummary.arrivalTimeLabel}
            </div>
          </div>

          <div className="rounded-lg border border-sky-400/15 bg-[#040B16] p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Fuel className="h-3.5 w-3.5 text-orange-300" />
              <span>{t.chart.fuelRequired}</span>
            </div>
            <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-orange-300">
              {routeSummary.totalFuelLiters.toLocaleString()} L
            </div>
            <div className="font-mono text-[11px] tabular-nums text-slate-400">
              Net {routeSummary.netFuelLiters} L + {routeSummary.reserveFuelLiters} L res.
            </div>
          </div>

          <div className="rounded-lg border border-sky-400/15 bg-[#040B16] p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              {routeSummary.hasShallowWarning ? (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
              )}
              <span>{t.chart.safetyDepthStatus}</span>
            </div>
            <div
              className={`mt-1 font-mono text-lg font-semibold ${
                routeSummary.hasShallowWarning ? 'text-amber-300' : 'text-emerald-300'
              }`}
            >
              {routeSummary.hasShallowWarning ? t.chart.shallowAlert : t.chart.safeWater}
            </div>
            <div className="font-mono text-[11px] tabular-nums text-slate-400">
              Draft {safetyDraftM.toFixed(1)}m + 0.5m UKC
            </div>
          </div>
        </div>

        {/* Waypoint-to-Waypoint Legs Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200">{t.chart.legBreakdown}</h3>
            <span className="font-mono text-[11px] tabular-nums text-slate-400">
              {routeSummary.legs.length} legs · {routeSummary.waypoints.length} waypoints
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-sky-400/15">
            <table className="w-full text-start text-xs">
              <thead className="bg-[#040B16] text-[11px] text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">#</th>
                  <th className="px-3 py-2 text-start font-medium">From → Waypoint</th>
                  <th className="px-3 py-2 text-start font-medium">{t.chart.waypointHeading}</th>
                  <th className="px-3 py-2 text-end font-medium">{t.chart.legDistance}</th>
                  <th className="px-3 py-2 text-end font-medium">{t.chart.legEta}</th>
                  <th className="px-3 py-2 text-end font-medium">{t.chart.legFuel}</th>
                  <th className="px-3 py-2 text-end font-medium">{t.chart.safetyDepthStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-400/10 bg-[#071121]">
                {routeSummary.legs.map((leg) => (
                  <tr key={leg.legIndex} className="hover:bg-[#0D1E37]">
                    <td className="px-3 py-2.5 font-mono tabular-nums text-teal-300">{leg.legIndex}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-100">
                        {leg.fromName} → {leg.toName}
                      </div>
                      {leg.nearbyNavaid && (
                        <div className="mt-0.5 text-[11px] text-yellow-300/80">{leg.nearbyNavaid}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums text-sky-300 whitespace-nowrap">
                      {String(leg.bearingDeg).padStart(3, '0')}°T ({leg.bearingCardinal})
                    </td>
                    <td className="px-3 py-2.5 text-end font-mono tabular-nums text-slate-100">
                      {leg.distanceNm} NM
                    </td>
                    <td className="px-3 py-2.5 text-end font-mono tabular-nums text-slate-300">
                      {leg.cumulativeHours}h
                    </td>
                    <td className="px-3 py-2.5 text-end font-mono tabular-nums text-orange-300">
                      {leg.fuelLiters} L
                    </td>
                    <td className="px-3 py-2.5 text-end font-mono tabular-nums">
                      <span className={leg.depthSafe ? 'text-emerald-300' : 'text-amber-300'}>
                        {leg.minDepthM.toFixed(1)}m · {leg.depthSafe ? t.chart.safeWater : t.chart.shallowAlert}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {weatherReport && (
        <DemoDataNotice
          isDemonstration={weatherReport.isDemonstration}
          sourceLabel={weatherReport.sourceLabel}
          observedLabel={weatherReport.observedLabel}
        />
      )}
    </div>
  );
};
