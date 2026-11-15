import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  CloudSun,
  Globe2,
  MessageSquare,
  Plus,
  Search,
  Send,
  Tag,
  X,
} from 'lucide-react';
import { CoordinateDisplay } from '../components/common/CoordinateDisplay';
import { SectionHeader } from '../components/common/SectionHeader';
import { useLanguage } from '../i18n/LanguageContext';
import { getMarinaPopularity, getSpotSpecialOffers } from '../services/forecastService';
import { marinaService } from '../services/marinaService';
import { loadSpotChat, postSpotChatMessage } from '../services/spotChatService';
import { Marina, SpotChatMessage } from '../types/maritime';

interface WorldMarinasViewProps {
  marinas: Marina[];
  selectedMarina: Marina;
  onSelectMarina: (marina: Marina) => void;
  onAddMarina: (input: {
    name: string;
    country: string;
    region: string;
    city: string;
    seaBasin: string;
    latitude: number;
    longitude: number;
    vhfChannel?: string;
    maxLoaMeters?: number;
    maxDraftMeters?: number;
    berths?: number;
    portOfEntry?: boolean;
  }) => void;
  onInspectOnGlobe: (marina: Marina) => void;
  onInspectWeather: (marina: Marina) => void;
}

const TURKISH_CITIES = ['Istanbul', 'Izmir', 'Didim', 'Bodrum', 'Marmaris', 'Fethiye', 'Antalya', 'Mersin', 'Trabzon'];

export const WorldMarinasView: React.FC<WorldMarinasViewProps> = ({
  marinas,
  selectedMarina,
  onSelectMarina,
  onAddMarina,
  onInspectOnGlobe,
  onInspectWeather,
}) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [regionGroup, setRegionGroup] = useState<'all' | 'turkey' | 'europe'>('all');
  const [spotTypeFilter, setSpotTypeFilter] = useState<'all' | 'marina' | 'wind_spot'>('all');
  const [sortBy, setSortBy] = useState<'popularity' | 'name'>('popularity');
  const [portOfEntryOnly, setPortOfEntryOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [detailTab, setDetailTab] = useState<'specs' | 'offers' | 'chat'>('specs');

  // Local community chat state
  const [chatMessages, setChatMessages] = useState<SpotChatMessage[]>([]);
  const [chatAuthor, setChatAuthor] = useState('Capt. Deniz');
  const [chatRole, setChatRole] = useState<SpotChatMessage['role']>('Local Sailor');
  const [chatDraft, setChatDraft] = useState('');

  useEffect(() => {
    setChatMessages(
      loadSpotChat(selectedMarina.id, selectedMarina.city, selectedMarina.name),
    );
  }, [selectedMarina.id, selectedMarina.city, selectedMarina.name]);

  // Add World Marina modal form state
  const [mName, setMName] = useState('');
  const [mCountry, setMCountry] = useState('');
  const [mRegion, setMRegion] = useState('');
  const [mCity, setMCity] = useState('');
  const [mSeaBasin, setMSeaBasin] = useState('');
  const [mLat, setMLat] = useState('');
  const [mLon, setMLon] = useState('');
  const [mVhf, setMVhf] = useState('Ch 16 / Ch 72');
  const [mPortOfEntry, setMPortOfEntry] = useState(true);

  const countries = useMemo(() => marinaService.getCountries(), [marinas]);
  const regions = useMemo(() => marinaService.getRegions(countryFilter), [countryFilter, marinas]);
  const europeCount = useMemo(
    () => marinas.filter((m) => marinaService.isEuropeanMarina(m)).length,
    [marinas],
  );
  const windSpotsCount = useMemo(
    () => marinas.filter((m) => m.spotType === 'wind_spot').length,
    [marinas],
  );

  const filteredMarinas = useMemo(() => {
    const base = marinaService.search({
      query,
      country: countryFilter,
      region: regionFilter,
      city: cityFilter,
      regionGroup,
      portOfEntryOnly,
    });

    const typed =
      spotTypeFilter === 'all'
        ? base
        : base.filter((m) =>
            spotTypeFilter === 'wind_spot'
              ? m.spotType === 'wind_spot'
              : m.spotType !== 'wind_spot',
          );

    return [...typed].sort((a, b) => {
      if (sortBy === 'popularity') {
        return getMarinaPopularity(b) - getMarinaPopularity(a);
      }
      return a.name.localeCompare(b.name);
    });
  }, [
    query,
    countryFilter,
    regionFilter,
    cityFilter,
    regionGroup,
    portOfEntryOnly,
    spotTypeFilter,
    sortBy,
    marinas,
  ]);

  const spotOffers = useMemo(() => getSpotSpecialOffers(selectedMarina), [selectedMarina]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatDraft.trim()) return;
    const updated = postSpotChatMessage(
      selectedMarina.id,
      selectedMarina.city,
      selectedMarina.name,
      chatAuthor,
      chatRole,
      chatDraft,
    );
    setChatMessages(updated);
    setChatDraft('');
  };

  const resetFilters = () => {
    setQuery('');
    setCountryFilter('all');
    setRegionFilter('all');
    setCityFilter('all');
    setRegionGroup('all');
    setSpotTypeFilter('all');
    setPortOfEntryOnly(false);
  };

  const handleCreateMarina = (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = Number(mLat);
    const lonNum = Number(mLon);
    if (!mName.trim() || !mCountry.trim() || !mCity.trim() || Number.isNaN(latNum) || Number.isNaN(lonNum)) {
      return;
    }
    onAddMarina({
      name: mName.trim(),
      country: mCountry.trim(),
      region: mRegion.trim() || mCountry.trim(),
      city: mCity.trim(),
      seaBasin: mSeaBasin.trim() || 'Coastal Waters',
      latitude: Math.max(-90, Math.min(90, latNum)),
      longitude: Math.max(-180, Math.min(180, lonNum)),
      vhfChannel: mVhf.trim() || 'Ch 16',
      portOfEntry: mPortOfEntry,
    });
    setMName('');
    setMCountry('');
    setMRegion('');
    setMCity('');
    setMSeaBasin('');
    setMLat('');
    setMLon('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t.marinas.title}
        subtitle={t.marinas.subtitle}
        action={
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>+ Marina</span>
          </button>
        }
      />

      {/* Search & Filter Controls */}
      <div className="space-y-3 rounded-xl border border-sky-400/20 bg-[#0A1628] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.marinas.searchPlaceholder}
              className="w-full rounded-lg border border-sky-400/20 bg-[#040B16] py-2.5 pe-9 ps-9 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t.common.reset}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            aria-label={t.common.country}
            value={countryFilter}
            onChange={(e) => {
              setCountryFilter(e.target.value);
              setRegionFilter('all');
              setCityFilter('all');
              setRegionGroup('all');
            }}
            className="rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2.5 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
          >
            <option value="all">{t.common.all} — {t.common.country}</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>

          <select
            aria-label={t.common.region}
            value={regionFilter}
            onChange={(e) => {
              setRegionFilter(e.target.value);
              setCityFilter('all');
              setRegionGroup('all');
            }}
            className="rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2.5 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
          >
            <option value="all">{t.common.all} — {t.common.region}</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2.5 text-xs font-medium text-slate-200 whitespace-nowrap">
            <input
              type="checkbox"
              checked={portOfEntryOnly}
              onChange={(e) => setPortOfEntryOnly(e.target.checked)}
              className="h-4 w-4 accent-sky-400"
            />
            <span>{t.marinas.portOfEntryOnly}</span>
          </label>
        </div>

        {/* Regional & Turkish Hub Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={resetFilters}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              regionGroup === 'all' && cityFilter === 'all' && countryFilter === 'all' && regionFilter === 'all'
                ? 'bg-sky-500/20 text-sky-300'
                : 'bg-[#040B16] text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.common.all} ({marinas.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setRegionGroup('turkey');
              setCountryFilter('Turkey');
              setRegionFilter('all');
              setCityFilter('all');
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              regionGroup === 'turkey' && cityFilter === 'all'
                ? 'bg-amber-400/20 text-amber-300'
                : 'bg-[#040B16] text-slate-300 hover:text-sky-300'
            }`}
          >
            Turkey ({marinas.filter((m) => m.countryCode === 'TR').length})
          </button>
          <button
            type="button"
            onClick={() => {
              setRegionGroup('europe');
              setCountryFilter('all');
              setRegionFilter('all');
              setCityFilter('all');
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              regionGroup === 'europe'
                ? 'bg-sky-500/20 text-sky-300'
                : 'bg-[#040B16] text-slate-300 hover:text-sky-300'
            }`}
          >
            Europe ({europeCount})
          </button>
          {TURKISH_CITIES.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => {
                setRegionGroup('turkey');
                setCountryFilter('Turkey');
                setRegionFilter('all');
                setCityFilter(city);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                cityFilter === city
                  ? 'bg-amber-400/20 text-amber-300'
                  : 'bg-[#040B16] text-slate-300 hover:text-sky-300'
              }`}
            >
              {city}
            </button>
          ))}
        </div>
        {/* Spot Type & Popularity Sort Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-sky-400/10 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSpotTypeFilter('all')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                spotTypeFilter === 'all'
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'bg-[#040B16] text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.marinas.spotAll}
            </button>
            <button
              type="button"
              onClick={() => setSpotTypeFilter('marina')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                spotTypeFilter === 'marina'
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'bg-[#040B16] text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.marinas.spotMarinas} ({marinas.length - windSpotsCount})
            </button>
            <button
              type="button"
              onClick={() => setSpotTypeFilter('wind_spot')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                spotTypeFilter === 'wind_spot'
                  ? 'bg-amber-400/20 text-amber-300'
                  : 'bg-[#040B16] text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.marinas.spotWind} ({windSpotsCount})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSortBy((prev) => (prev === 'popularity' ? 'name' : 'popularity'))}
            className="flex items-center gap-1.5 rounded-md border border-sky-400/20 bg-[#040B16] px-3 py-1.5 text-xs font-medium text-sky-300 hover:border-sky-400/50 whitespace-nowrap shrink-0"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>{sortBy === 'popularity' ? t.marinas.sortByPopularity : t.marinas.sortByName}</span>
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-mono tabular-nums">
          {filteredMarinas.length} / {marinas.length} {t.nav.marinas}
        </span>
        {(query ||
          regionGroup !== 'all' ||
          spotTypeFilter !== 'all' ||
          countryFilter !== 'all' ||
          regionFilter !== 'all' ||
          cityFilter !== 'all' ||
          portOfEntryOnly) && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-sky-300 hover:text-sky-200"
          >
            {t.common.reset}
          </button>
        )}
      </div>

      {/* Results Table (Desktop) + Cards (Mobile) */}
      {filteredMarinas.length === 0 ? (
        <div className="rounded-xl border border-sky-400/20 bg-[#0A1628] p-8 text-center">
          <p className="text-sm text-slate-300">{t.marinas.noResults}</p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-3 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400"
          >
            {t.common.reset}
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Structured Table */}
          <div className="hidden overflow-x-auto rounded-xl border border-sky-400/20 bg-[#0A1628] md:block">
            <table className="w-full border-collapse text-start text-sm">
              <thead>
                <tr className="border-b border-sky-400/15 bg-[#071121] text-xs font-medium text-slate-400">
                  <th className="px-4 py-3 text-start">{t.marinas.marinaName}</th>
                  <th className="px-4 py-3 text-start">{t.common.country}</th>
                  <th className="px-4 py-3 text-start">{t.common.region}</th>
                  <th className="px-4 py-3 text-start">{t.common.city}</th>
                  <th className="px-4 py-3 text-end">{t.marinas.popularity}</th>
                  <th className="px-4 py-3 text-end">{t.common.latitude}</th>
                  <th className="px-4 py-3 text-end">{t.common.longitude}</th>
                  <th className="px-4 py-3 text-start">{t.common.coordinates}</th>
                  <th className="px-4 py-3 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-400/10">
                {filteredMarinas.map((marina) => {
                  const isSelected = marina.id === selectedMarina.id;
                  const popularity = getMarinaPopularity(marina);
                  return (
                    <tr
                      key={marina.id}
                      onClick={() => onSelectMarina(marina)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-sky-500/10' : 'hover:bg-slate-800/35'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-100">{marina.name}</div>
                        <div className="text-xs text-slate-400">
                          {marina.spotType === 'wind_spot' ? 'Wind & Kite Spot' : marina.seaBasin} · {marina.vhfChannel}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-200">{marina.country}</td>
                      <td className="px-4 py-3 text-slate-300">{marina.region}</td>
                      <td className="px-4 py-3 font-medium text-sky-300">{marina.city}</td>
                      <td className="px-4 py-3 text-end font-mono text-xs font-semibold tabular-nums text-amber-300">
                        {popularity}/100
                      </td>
                      <td className="px-4 py-3 text-end font-mono text-xs tabular-nums text-slate-200">
                        {marina.latitude.toFixed(4)}°
                      </td>
                      <td className="px-4 py-3 text-end font-mono text-xs tabular-nums text-slate-200">
                        {marina.longitude.toFixed(4)}°
                      </td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-300 whitespace-nowrap">
                        {marina.coordinates}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onInspectOnGlobe(marina);
                            }}
                            title={t.common.viewOnGlobe}
                            className="rounded-md border border-sky-400/20 bg-[#040B16] p-1.5 text-sky-300 hover:border-sky-400/50"
                          >
                            <Globe2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onInspectWeather(marina);
                            }}
                            title={t.common.inspectWeather}
                            className="rounded-md border border-sky-400/20 bg-[#040B16] p-1.5 text-amber-300 hover:border-amber-400/50"
                          >
                            <CloudSun className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="space-y-3 md:hidden">
            {filteredMarinas.map((marina) => {
              const isSelected = marina.id === selectedMarina.id;
              const popularity = getMarinaPopularity(marina);
              return (
                <div
                  key={marina.id}
                  onClick={() => onSelectMarina(marina)}
                  className={`rounded-xl border p-4 ${
                    isSelected
                      ? 'border-amber-400/50 bg-[#0F2340]'
                      : 'border-sky-400/20 bg-[#0A1628]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-sky-300">
                      {marina.country} · {marina.region} · {marina.city}
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-amber-300">
                      {popularity}/100
                    </span>
                  </div>
                  <div className="mt-1 font-display text-base font-semibold text-slate-100">
                    {marina.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {marina.spotType === 'wind_spot' ? 'Wind & Kite Spot' : marina.seaBasin}
                  </div>
                  <div className="mt-2">
                    <CoordinateDisplay
                      latitude={marina.latitude}
                      longitude={marina.longitude}
                      dms={marina.coordinates}
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2 border-t border-sky-400/15 pt-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectOnGlobe(marina);
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-sky-400/25 bg-[#040B16] py-2 text-xs font-medium text-sky-300"
                    >
                      <Globe2 className="h-3.5 w-3.5" />
                      <span>{t.common.viewOnGlobe}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectWeather(marina);
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sky-500 py-2 text-xs font-semibold text-slate-950"
                    >
                      <CloudSun className="h-3.5 w-3.5" />
                      <span>{t.common.inspectWeather}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Selected Marina / Spot Detail Hub (Specs · Special Offers · Local Chat) */}
      <div className="rounded-xl border border-sky-400/20 bg-[#0A1628] p-5">
        <div className="flex flex-col gap-4 border-b border-sky-400/15 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-sky-300">
              <span>
                {selectedMarina.country} · {selectedMarina.region} · {selectedMarina.city}
              </span>
              <span className="font-mono text-amber-300 tabular-nums">
                · {t.marinas.popularity}: {getMarinaPopularity(selectedMarina)}/100
              </span>
            </div>
            <h3 className="mt-1 font-display text-lg font-semibold text-slate-50">
              {selectedMarina.name}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">{selectedMarina.summary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-sky-400/20 bg-[#040B16] p-1 shrink-0">
            <button
              type="button"
              onClick={() => setDetailTab('specs')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                detailTab === 'specs'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-300 hover:text-sky-300'
              }`}
            >
              {t.marinas.tabSpecs}
            </button>
            <button
              type="button"
              onClick={() => setDetailTab('offers')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                detailTab === 'offers'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-amber-300'
              }`}
            >
              <Tag className="h-3.5 w-3.5" />
              <span>{t.marinas.tabOffers} ({spotOffers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setDetailTab('chat')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                detailTab === 'chat'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-300 hover:text-sky-300'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{t.marinas.tabChat} ({chatMessages.length})</span>
            </button>
          </div>
        </div>

        {detailTab === 'specs' && (
          <div className="pt-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 font-mono text-xs tabular-nums">
              <div>
                <div className="font-sans text-slate-400">{t.marinas.maxLoa}</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-100">
                  {selectedMarina.maxLoaMeters} m
                </div>
              </div>
              <div>
                <div className="font-sans text-slate-400">{t.marinas.maxDraft}</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-100">
                  {selectedMarina.maxDraftMeters.toFixed(1)} m
                </div>
              </div>
              <div>
                <div className="font-sans text-slate-400">{t.marinas.berths}</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-100">
                  {selectedMarina.berths}
                </div>
              </div>
              <div>
                <div className="font-sans text-slate-400">{t.common.vhf}</div>
                <div className="mt-0.5 text-sm font-semibold text-sky-300">
                  {selectedMarina.vhfChannel}
                </div>
              </div>
            </div>
            <div className="mt-4 border-t border-sky-400/15 pt-3 text-xs text-slate-400">
              {selectedMarina.amenities.join(' · ')}
            </div>
          </div>
        )}

        {detailTab === 'offers' && (
          <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2">
            {spotOffers.map((offer) => (
              <div
                key={offer.id}
                className="flex flex-col justify-between rounded-lg border border-amber-400/30 bg-[#040B16] p-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-sky-300">{offer.partner}</span>
                    <span className="font-mono text-xs font-semibold text-amber-300">
                      {offer.discountBadge}
                    </span>
                  </div>
                  <h4 className="mt-1.5 font-display text-sm font-semibold text-slate-100">
                    {offer.title}
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                    {offer.description}
                  </p>
                </div>
                <div className="mt-3 border-t border-sky-400/15 pt-2.5 font-mono text-[11px] text-slate-400 tabular-nums">
                  Valid until {offer.validUntil}
                </div>
              </div>
            ))}
          </div>
        )}

        {detailTab === 'chat' && (
          <div className="space-y-4 pt-4">
            <div className="max-h-64 space-y-2.5 overflow-y-auto pe-1">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-lg border border-sky-400/15 bg-[#040B16] px-3.5 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sky-300">{msg.author}</span>
                      <span className="text-[11px] text-amber-300">{msg.role}</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                      {msg.timestamp}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-200">{msg.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="flex flex-col gap-2.5 border-t border-sky-400/15 pt-3 sm:flex-row">
              <input
                type="text"
                value={chatAuthor}
                onChange={(e) => setChatAuthor(e.target.value)}
                placeholder="Name / Callsign"
                className="w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 text-xs text-slate-100 focus:border-sky-400 focus:outline-none sm:w-36"
              />
              <select
                aria-label="Role"
                value={chatRole}
                onChange={(e) => setChatRole(e.target.value as SpotChatMessage['role'])}
                className="rounded-lg border border-sky-400/20 bg-[#040B16] px-2.5 py-2 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
              >
                <option value="Local Sailor">Local Sailor</option>
                <option value="Harbor Crew">Harbor Crew</option>
                <option value="Kiter">Kiter</option>
                <option value="Captain">Captain</option>
              </select>
              <input
                type="text"
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                placeholder={t.marinas.localChatPlaceholder}
                className="flex-1 rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
              />
              <button
                type="submit"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 whitespace-nowrap shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{t.marinas.sendMessage}</span>
              </button>
            </form>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">{t.marinas.extensibleNote}</p>

      {/* Add World Marina Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-lg rounded-xl border border-sky-400/25 bg-[#0A1628] p-6">
            <div className="flex items-center justify-between border-b border-sky-400/15 pb-3">
              <h2 className="font-display text-lg font-semibold text-slate-50">
                {t.nav.marinas} · +
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMarina} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300">{t.marinas.marinaName}</label>
                  <input
                    required
                    value={mName}
                    onChange={(e) => setMName(e.target.value)}
                    placeholder="Port Vauban"
                    className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">{t.common.country}</label>
                  <input
                    required
                    value={mCountry}
                    onChange={(e) => setMCountry(e.target.value)}
                    placeholder="France"
                    className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">{t.common.region}</label>
                  <input
                    value={mRegion}
                    onChange={(e) => setMRegion(e.target.value)}
                    placeholder="French Riviera"
                    className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">{t.common.city}</label>
                  <input
                    required
                    value={mCity}
                    onChange={(e) => setMCity(e.target.value)}
                    placeholder="Antibes"
                    className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">{t.marinas.seaBasin}</label>
                  <input
                    value={mSeaBasin}
                    onChange={(e) => setMSeaBasin(e.target.value)}
                    placeholder="Mediterranean Sea"
                    className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">{t.common.latitude}</label>
                  <input
                    required
                    type="number"
                    step="0.0001"
                    min="-90"
                    max="90"
                    value={mLat}
                    onChange={(e) => setMLat(e.target.value)}
                    placeholder="43.5844"
                    className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 font-mono text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">{t.common.longitude}</label>
                  <input
                    required
                    type="number"
                    step="0.0001"
                    min="-180"
                    max="180"
                    value={mLon}
                    onChange={(e) => setMLon(e.target.value)}
                    placeholder="7.1294"
                    className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 font-mono text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">{t.common.vhf}</label>
                  <input
                    value={mVhf}
                    onChange={(e) => setMVhf(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 font-mono text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 pt-5 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={mPortOfEntry}
                    onChange={(e) => setMPortOfEntry(e.target.checked)}
                    className="h-4 w-4 accent-sky-400"
                  />
                  <span>{t.common.portOfEntry}</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-sky-400/15 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-sky-400/20 px-4 py-2 text-xs font-medium text-slate-300 hover:text-slate-100"
                >
                  {t.fleet.formCancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400"
                >
                  {t.fleet.formSubmit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
