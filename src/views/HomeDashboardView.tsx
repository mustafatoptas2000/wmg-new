import React, { useState } from 'react';
import { Anchor, ArrowRight, CloudSun, Compass, Globe2, Map as MapIcon, Wind } from 'lucide-react';
import { CoordinateDisplay } from '../components/common/CoordinateDisplay';
import { DemoDataNotice } from '../components/common/DemoDataNotice';
import { SectionHeader } from '../components/common/SectionHeader';
import { StatTile } from '../components/common/StatTile';
import { AnimatedWindMap } from '../components/globe/AnimatedWindMap';
import { Globe3D } from '../components/globe/Globe3D';
import { WorldSeaMap } from '../components/globe/WorldSeaMap';
import { NavigationMenuTemplate } from '../components/layout/NavigationMenuTemplate';
import { useLanguage } from '../i18n/LanguageContext';
import { Marina, MarineWeatherReport, NavigationSection, Vessel } from '../types/maritime';

interface HomeDashboardViewProps {
  marinas: Marina[];
  selectedMarina: Marina;
  onSelectMarina: (marina: Marina) => void;
  weatherReport: MarineWeatherReport | null;
  vessels: Vessel[];
  onNavigate: (section: NavigationSection) => void;
}

const TURKISH_CITIES = ['Istanbul', 'Izmir', 'Didim', 'Bodrum', 'Marmaris', 'Fethiye', 'Antalya', 'Mersin', 'Trabzon'];

export const HomeDashboardView: React.FC<HomeDashboardViewProps> = ({
  marinas,
  selectedMarina,
  onSelectMarina,
  weatherReport,
  vessels,
  onNavigate,
}) => {
  const { t } = useLanguage();
  const [mapMode, setMapMode] = useState<'globe' | 'map' | 'wind'>('globe');
  const [focusPreset, setFocusPreset] = useState<'turkey' | 'med' | 'world'>('turkey');

  const turkishMarinas = marinas.filter((m) => m.countryCode === 'TR');
  const europeanMarinas = marinas.filter((m) => m.region.startsWith('Europe'));

  return (
    <div className="space-y-6">
      <SectionHeader title={t.home.title} subtitle={t.home.subtitle} />

      {/* Colorful Boxed Usage Menu on Home Screen */}
      <NavigationMenuTemplate
        variant="homeGrid"
        activeSection={NavigationSection.HOME}
        onNavigate={onNavigate}
      />

      {/* 4-Column Operational Summary Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatTile
          label={t.home.marinasIndexed}
          value={marinas.length}
          detail={`${new Set(marinas.map((m) => m.country)).size} ${t.common.country}`}
          accent="sky"
        />
        <StatTile
          label={t.home.turkishHubs}
          value={turkishMarinas.length}
          detail="Marmara · Aegean · Med · Black Sea"
          accent="gold"
        />
        <StatTile
          label="Europe Marinas"
          value={europeanMarinas.length}
          detail="Med · Adriatic · Atlantic · North Sea"
          accent="sky"
        />
        <StatTile
          label={t.home.activeVessels}
          value={vessels.length}
          detail={`${selectedMarina.vhfChannel.split('/')[0].trim()} · ${selectedMarina.city}`}
        />
      </div>

      {/* Primary Interactive Visualization Split: 3D Globe / Sea Map + Station Dossier */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-stretch">
        {/* Left 8 Columns: Unobstructed 3D Globe / World Sea Map Viewport */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-sky-400/20 bg-[#061224] lg:col-span-8">
          {/* Control Toolbar Above Viewport (Never Obstructing Center 3D Scene) */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-400/15 bg-[#0A1628] px-4 py-2.5">
            <div className="flex items-center gap-1 rounded-lg bg-[#040B16] p-1">
              <button
                type="button"
                onClick={() => setMapMode('globe')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  mapMode === 'globe'
                    ? 'bg-sky-500/20 text-sky-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe2 className="h-3.5 w-3.5" />
                <span>{t.home.globeView}</span>
              </button>
              <button
                type="button"
                onClick={() => setMapMode('map')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  mapMode === 'map'
                    ? 'bg-sky-500/20 text-sky-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MapIcon className="h-3.5 w-3.5" />
                <span>{t.home.seaMapView}</span>
              </button>
              <button
                type="button"
                onClick={() => setMapMode('wind')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  mapMode === 'wind'
                    ? 'bg-amber-400/20 text-amber-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Wind className="h-3.5 w-3.5" />
                <span>{t.home.windMapView}</span>
              </button>
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-[#040B16] p-1">
              <button
                type="button"
                onClick={() => setFocusPreset('turkey')}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  focusPreset === 'turkey'
                    ? 'bg-amber-400/20 text-amber-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.home.focusTurkey}
              </button>
              <button
                type="button"
                onClick={() => setFocusPreset('med')}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  focusPreset === 'med'
                    ? 'bg-sky-500/20 text-sky-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.home.focusMed}
              </button>
              <button
                type="button"
                onClick={() => setFocusPreset('world')}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  focusPreset === 'world'
                    ? 'bg-sky-500/20 text-sky-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.home.focusWorld}
              </button>
            </div>
          </div>

          <div className="relative h-[360px] w-full sm:h-[440px] lg:h-[480px]">
            {mapMode === 'globe' ? (
              <Globe3D
                marinas={marinas}
                selectedMarina={selectedMarina}
                onSelectMarina={onSelectMarina}
                focusPreset={focusPreset}
              />
            ) : mapMode === 'map' ? (
              <WorldSeaMap
                marinas={marinas}
                selectedMarina={selectedMarina}
                onSelectMarina={onSelectMarina}
                focusPreset={focusPreset}
              />
            ) : (
              <AnimatedWindMap
                marinas={marinas}
                selectedMarina={selectedMarina}
                onSelectMarina={onSelectMarina}
                focusPreset={focusPreset}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-sky-400/15 bg-[#0A1628] px-4 py-2 text-xs text-slate-400">
            <span>{t.home.dragToRotate}</span>
            <span className="font-mono tabular-nums text-sky-300">
              {selectedMarina.name} · {selectedMarina.latitude.toFixed(4)}°, {selectedMarina.longitude.toFixed(4)}°
            </span>
          </div>
        </div>

        {/* Right 4 Columns: Active Marina Dossier & Weather Profile */}
        <div className="flex flex-col justify-between rounded-xl border border-sky-400/20 bg-[#0A1628] p-5 lg:col-span-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-sky-400/15 pb-4">
              <div>
                <div className="text-xs font-medium text-sky-300">
                  {selectedMarina.country} · {selectedMarina.region} · {selectedMarina.city}
                </div>
                <h2 className="mt-1 font-display text-xl font-semibold text-slate-50">
                  {selectedMarina.name}
                </h2>
                <div className="mt-1 text-xs text-slate-400">{selectedMarina.seaBasin}</div>
              </div>
              <Anchor className="h-5 w-5 shrink-0 text-amber-300" />
            </div>

            <p className="text-sm leading-relaxed text-slate-300">{selectedMarina.summary}</p>

            <div className="grid grid-cols-2 gap-3 border-y border-sky-400/15 py-3.5">
              <div>
                <div className="text-xs text-slate-400">{t.common.coordinates}</div>
                <div className="mt-1">
                  <CoordinateDisplay
                    latitude={selectedMarina.latitude}
                    longitude={selectedMarina.longitude}
                    dms={selectedMarina.coordinates}
                  />
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">{t.marinas.maxLoa} / {t.marinas.maxDraft}</div>
                <div className="mt-1 font-mono text-xs tabular-nums text-slate-100">
                  {selectedMarina.maxLoaMeters}m / {selectedMarina.maxDraftMeters.toFixed(1)}m
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  {t.common.portOfEntry}: {selectedMarina.portOfEntry ? t.common.yes : t.common.no}
                </div>
              </div>
            </div>

            {/* Station Weather Snapshot */}
            {weatherReport && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">
                    {t.home.quickWeatherSummary}
                  </span>
                  <span className="font-mono text-[11px] text-amber-300">
                    {weatherReport.isDemonstration ? t.weather.sourceDemo : t.weather.sourceApi}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono text-xs tabular-nums">
                  <div className="rounded-md bg-[#040B16] px-2.5 py-2">
                    <div className="text-[11px] text-slate-400">{t.weather.windSpeed}</div>
                    <div className="mt-0.5 font-semibold text-sky-300">
                      {weatherReport.windSpeedKnots} {t.weather.knots}
                    </div>
                  </div>
                  <div className="rounded-md bg-[#040B16] px-2.5 py-2">
                    <div className="text-[11px] text-slate-400">{t.weather.waveHeight}</div>
                    <div className="mt-0.5 font-semibold text-slate-100">
                      {weatherReport.waveHeightMeters} {t.weather.meters}
                    </div>
                  </div>
                  <div className="rounded-md bg-[#040B16] px-2.5 py-2">
                    <div className="text-[11px] text-slate-400">{t.weather.seaTemp}</div>
                    <div className="mt-0.5 font-semibold text-slate-100">
                      {weatherReport.seaTemperatureC}°C
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => onNavigate(NavigationSection.WEATHER)}
              className="flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-3 py-2.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400 whitespace-nowrap"
            >
              <CloudSun className="h-3.5 w-3.5" />
              <span>{t.common.inspectWeather}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate(NavigationSection.MARINAS)}
              className="flex items-center justify-center gap-2 rounded-lg border border-sky-400/25 bg-[#040B16] px-3 py-2.5 text-xs font-semibold text-slate-100 transition-colors hover:border-sky-400/50 hover:text-sky-300 whitespace-nowrap"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>{t.nav.marinas}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Corridor Selector for Turkish Hubs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-slate-100">
            {t.home.turkishCorridorTitle}
          </h2>
          <button
            type="button"
            onClick={() => onNavigate(NavigationSection.MARINAS)}
            className="flex items-center gap-1 text-xs font-medium text-sky-300 hover:text-sky-200"
          >
            <span>{t.nav.marinas}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TURKISH_CITIES.map((city) => {
            const hub = turkishMarinas.find((m) => m.city === city);
            if (!hub) return null;
            const isSelected = selectedMarina.city === city;
            return (
              <button
                key={hub.id}
                type="button"
                onClick={() => onSelectMarina(hub)}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-start transition-colors ${
                  isSelected
                    ? 'border-amber-400/50 bg-[#0F2340]'
                    : 'border-sky-400/15 bg-[#0A1628] hover:border-sky-400/35'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-sky-300">
                    {hub.city} · {hub.seaBasin}
                  </div>
                  <div className="mt-0.5 truncate font-display text-sm font-semibold text-slate-100">
                    {hub.name}
                  </div>
                  <div className="mt-1 font-mono text-[11px] tabular-nums text-slate-400">
                    {hub.latitude.toFixed(4)}° N, {hub.longitude.toFixed(4)}° E
                  </div>
                </div>
                <span className="ms-3 shrink-0 font-mono text-xs text-slate-400">
                  {hub.vhfChannel.split('/')[0].trim()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

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
