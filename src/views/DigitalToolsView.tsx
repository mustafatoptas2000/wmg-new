import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Anchor,
  ArrowLeftRight,
  Compass,
  Fuel,
  Navigation,
  Radio,
  Wind,
} from 'lucide-react';
import {
  BEAUFORT_SCALE,
  GLOBAL_EMERGENCY_FREQUENCIES,
  VHF_CHANNELS,
} from '../data/nauticalReference';
import { SectionHeader } from '../components/common/SectionHeader';
import { StatTile } from '../components/common/StatTile';
import { useLanguage } from '../i18n/LanguageContext';
import {
  calculateDraftAndTpc,
  calculateGreatCirclePassage,
  calculateVoyageFuel,
  formatCoordinateFormats,
  kmToNm,
  knotsToBeaufort,
  knotsToKmh,
  knotsToMs,
  msToKnots,
  nmToKm,
} from '../services/navigationCalcService';
import { Marina } from '../types/maritime';

interface DigitalToolsViewProps {
  marinas: Marina[];
  selectedMarina: Marina;
}

export const DigitalToolsView: React.FC<DigitalToolsViewProps> = ({
  marinas,
  selectedMarina,
}) => {
  const { t } = useLanguage();

  // Great-Circle Passage Calculator State
  const [originId, setOriginId] = useState(selectedMarina.id || marinas[0]?.id || '');
  const [destId, setDestId] = useState(
    marinas.find((m) => m.id === 'tr-marmaris-netsel')?.id || marinas[1]?.id || '',
  );
  const [speedKnots, setSpeedKnots] = useState('12');

  // WGS84 Coordinate Format Inspector State
  const [coordLat, setCoordLat] = useState(selectedMarina.latitude.toFixed(4));
  const [coordLon, setCoordLon] = useState(selectedMarina.longitude.toFixed(4));

  // Voyage Fuel Calculator State
  const [fuelDistanceNm, setFuelDistanceNm] = useState('140');
  const [fuelSpeedKnots, setFuelSpeedKnots] = useState('12');
  const [fuelBurnLph, setFuelBurnLph] = useState('65');
  const [fuelReservePct, setFuelReservePct] = useState('15');

  // Draft & TPC Calculator State
  const [currentDraftM, setCurrentDraftM] = useState('3.20');
  const [weightChangeT, setWeightChangeT] = useState('25');
  const [tpcVal, setTpcVal] = useState('4.5');
  const [waterDensity, setWaterDensity] = useState('1.025');
  const [displacementT, setDisplacementT] = useState('680');
  const [waterDepthM, setWaterDepthM] = useState('5.50');

  // Beaufort Interactive Tester
  const [testWindKnots, setTestWindKnots] = useState('18');

  // Marine Unit Converter State (Distance: NM <-> km | Speed: knots <-> m/s)
  const [unitNm, setUnitNm] = useState('10');
  const [unitKm, setUnitKm] = useState(() => nmToKm(10).toFixed(2));
  const [unitKnots, setUnitKnots] = useState('15');
  const [unitMs, setUnitMs] = useState(() => knotsToMs(15).toFixed(2));

  const handleNmChange = (raw: string) => {
    setUnitNm(raw);
    const val = Number(raw);
    if (raw === '' || Number.isNaN(val)) {
      setUnitKm('');
      return;
    }
    setUnitKm(nmToKm(Math.max(0, val)).toFixed(3));
  };

  const handleKmChange = (raw: string) => {
    setUnitKm(raw);
    const val = Number(raw);
    if (raw === '' || Number.isNaN(val)) {
      setUnitNm('');
      return;
    }
    setUnitNm(kmToNm(Math.max(0, val)).toFixed(3));
  };

  const handleKnotsChange = (raw: string) => {
    setUnitKnots(raw);
    const val = Number(raw);
    if (raw === '' || Number.isNaN(val)) {
      setUnitMs('');
      return;
    }
    setUnitMs(knotsToMs(Math.max(0, val)).toFixed(3));
  };

  const handleMsChange = (raw: string) => {
    setUnitMs(raw);
    const val = Number(raw);
    if (raw === '' || Number.isNaN(val)) {
      setUnitKnots('');
      return;
    }
    setUnitKnots(msToKnots(Math.max(0, val)).toFixed(3));
  };

  // Global Emergency Frequency Filter
  const [emergencyBand, setEmergencyBand] = useState<'ALL' | 'VHF' | 'MF' | 'HF' | 'Satellite / SAR'>('ALL');

  const originMarina = marinas.find((m) => m.id === originId) ?? marinas[0];
  const destMarina = marinas.find((m) => m.id === destId) ?? marinas[1] ?? marinas[0];

  const passage = useMemo(() => {
    return calculateGreatCirclePassage(
      originMarina.latitude,
      originMarina.longitude,
      destMarina.latitude,
      destMarina.longitude,
      Number(speedKnots) || 10,
    );
  }, [originMarina, destMarina, speedKnots]);

  const formattedCoords = useMemo(() => {
    const latNum = Math.max(-90, Math.min(90, Number(coordLat) || 0));
    const lonNum = Math.max(-180, Math.min(180, Number(coordLon) || 0));
    return formatCoordinateFormats(latNum, lonNum);
  }, [coordLat, coordLon]);

  const fuelCalc = useMemo(() => {
    return calculateVoyageFuel(
      Number(fuelDistanceNm) || 0,
      Number(fuelSpeedKnots) || 10,
      Number(fuelBurnLph) || 0,
      Number(fuelReservePct) || 0,
    );
  }, [fuelDistanceNm, fuelSpeedKnots, fuelBurnLph, fuelReservePct]);

  const draftCalc = useMemo(() => {
    return calculateDraftAndTpc(
      Number(currentDraftM) || 0,
      Number(weightChangeT) || 0,
      Number(tpcVal) || 1,
      Number(waterDensity) || 1.025,
      Number(displacementT) || 0,
      Number(waterDepthM) || 0,
    );
  }, [currentDraftM, weightChangeT, tpcVal, waterDensity, displacementT, waterDepthM]);

  const matchedBeaufort = useMemo(
    () => knotsToBeaufort(Math.max(0, Number(testWindKnots) || 0)),
    [testWindKnots],
  );

  const filteredEmergencyFreqs = useMemo(() => {
    if (emergencyBand === 'ALL') return GLOBAL_EMERGENCY_FREQUENCIES;
    return GLOBAL_EMERGENCY_FREQUENCIES.filter((item) => item.band === emergencyBand);
  }, [emergencyBand]);

  return (
    <div className="space-y-6">
      <SectionHeader title={t.tools.title} subtitle={t.tools.subtitle} />

      {/* Row 1: Great-Circle Passage Calculator + WGS84 Coordinate Converter */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Great-Circle Distance & Bearing Calculator */}
        <div className="rounded-xl border border-sky-400/20 bg-[#0A1628] p-5 lg:col-span-7">
          <div className="flex items-center gap-2 border-b border-sky-400/15 pb-3">
            <Navigation className="h-4 w-4 text-sky-400" />
            <h2 className="font-display text-base font-semibold text-slate-50">
              {t.tools.passageCalc}
            </h2>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-400">
                {t.tools.originMarina}
              </label>
              <select
                value={originId}
                onChange={(e) => setOriginId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-2.5 py-2 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
              >
                {marinas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.city} — {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400">
                {t.tools.destMarina}
              </label>
              <select
                value={destId}
                onChange={(e) => setDestId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-2.5 py-2 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
              >
                {marinas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.city} — {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400">
                {t.tools.cruisingSpeed}
              </label>
              <input
                type="number"
                min="1"
                max="60"
                step="0.5"
                value={speedKnots}
                onChange={(e) => setSpeedKnots(e.target.value)}
                className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 font-mono text-xs tabular-nums text-slate-100 focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile
              label={t.tools.distance}
              value={passage.distanceNm}
              unit="NM"
              detail={`${passage.distanceKm} km`}
              accent="sky"
            />
            <StatTile
              label={t.tools.initialBearing}
              value={`${String(passage.initialBearingDeg).padStart(3, '0')}°`}
              unit={passage.initialBearingCardinal}
              detail="True Great-Circle"
              accent="gold"
            />
            <StatTile
              label={t.tools.estimatedEta}
              value={passage.etaFormatted}
              detail={`@ ${Number(speedKnots) || 10} kt`}
            />
          </div>
        </div>

        {/* WGS84 Coordinate Format Inspector */}
        <div className="rounded-xl border border-sky-400/20 bg-[#0A1628] p-5 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-sky-400/15 pb-3">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-amber-300" />
              <h2 className="font-display text-base font-semibold text-slate-50">
                {t.tools.coordConverter}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setCoordLat(selectedMarina.latitude.toFixed(4));
                setCoordLon(selectedMarina.longitude.toFixed(4));
              }}
              className="text-xs font-medium text-sky-300 hover:text-sky-200"
            >
              {selectedMarina.city}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400">
                {t.common.latitude} (-90..90)
              </label>
              <input
                type="number"
                step="0.0001"
                min="-90"
                max="90"
                value={coordLat}
                onChange={(e) => setCoordLat(e.target.value)}
                className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 font-mono text-xs tabular-nums text-slate-100 focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">
                {t.common.longitude} (-180..180)
              </label>
              <input
                type="number"
                step="0.0001"
                min="-180"
                max="180"
                value={coordLon}
                onChange={(e) => setCoordLon(e.target.value)}
                className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 font-mono text-xs tabular-nums text-slate-100 focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 space-y-2.5 rounded-lg bg-[#040B16] p-3.5 font-mono text-xs tabular-nums">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400">DD (Decimal)</span>
              <span className="text-sky-300">{formattedCoords.decimal}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400">DDM (Nautical)</span>
              <span className="text-slate-100">{formattedCoords.ddm}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400">DMS (Sexagesimal)</span>
              <span className="text-amber-300">{formattedCoords.dms}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Marine Unit Converter (NM <-> km & knots <-> m/s) */}
      <div className="rounded-xl border border-sky-400/20 bg-[#0A1628] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-400/15 pb-3">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-sky-400" />
            <h2 className="font-display text-base font-semibold text-slate-50">
              {t.tools.unitConverterTitle}
            </h2>
          </div>
          <span className="font-mono text-xs text-slate-400 tabular-nums">
            1 NM = 1.852 km · 1 kt = 0.5144 m/s
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Distance Pair: Nautical Miles <-> Kilometers */}
          <div className="rounded-lg border border-sky-400/15 bg-[#040B16] p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-sky-300">
                {t.tools.unitDistanceLabel}
              </div>
              <button
                type="button"
                onClick={() => handleNmChange(String(passage.distanceNm))}
                className="text-xs font-medium text-amber-300 hover:text-amber-200 whitespace-nowrap"
              >
                {t.tools.syncFromPassage} ({passage.distanceNm} NM)
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <div>
                <label htmlFor="unit-nm-input" className="block text-xs font-medium text-slate-400">
                  {t.tools.unitNm}
                </label>
                <input
                  id="unit-nm-input"
                  type="number"
                  min="0"
                  step="any"
                  value={unitNm}
                  onChange={(e) => handleNmChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#0A1628] px-3 py-2 font-mono text-sm tabular-nums text-sky-300 focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div className="hidden pb-2 text-slate-500 sm:block" aria-hidden="true">
                <ArrowLeftRight className="h-4 w-4" />
              </div>

              <div>
                <label htmlFor="unit-km-input" className="block text-xs font-medium text-slate-400">
                  {t.tools.unitKm}
                </label>
                <input
                  id="unit-km-input"
                  type="number"
                  min="0"
                  step="any"
                  value={unitKm}
                  onChange={(e) => handleKmChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#0A1628] px-3 py-2 font-mono text-sm tabular-nums text-amber-300 focus:border-sky-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Speed Pair: Knots <-> Meters per Second */}
          <div className="rounded-lg border border-sky-400/15 bg-[#040B16] p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-sky-300">
                {t.tools.unitSpeedLabel}
              </div>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                {knotsToKmh(Math.max(0, Number(unitKnots) || 0)).toFixed(2)} km/h · Bft{' '}
                {knotsToBeaufort(Math.max(0, Number(unitKnots) || 0)).force}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <div>
                <label htmlFor="unit-knots-input" className="block text-xs font-medium text-slate-400">
                  {t.tools.unitKnots}
                </label>
                <input
                  id="unit-knots-input"
                  type="number"
                  min="0"
                  step="any"
                  value={unitKnots}
                  onChange={(e) => handleKnotsChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#0A1628] px-3 py-2 font-mono text-sm tabular-nums text-sky-300 focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div className="hidden pb-2 text-slate-500 sm:block" aria-hidden="true">
                <ArrowLeftRight className="h-4 w-4" />
              </div>

              <div>
                <label htmlFor="unit-ms-input" className="block text-xs font-medium text-slate-400">
                  {t.tools.unitMs}
                </label>
                <input
                  id="unit-ms-input"
                  type="number"
                  min="0"
                  step="any"
                  value={unitMs}
                  onChange={(e) => handleMsChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#0A1628] px-3 py-2 font-mono text-sm tabular-nums text-amber-300 focus:border-sky-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Voyage Fuel Calculator + Draft, TPC & UKC Calculator */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Sefer Yakıt Hesaplayıcı */}
        <div className="rounded-xl border border-sky-400/20 bg-[#0A1628] p-5 lg:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-400/15 pb-3">
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4 text-amber-300" />
              <h2 className="font-display text-base font-semibold text-slate-50">
                {t.tools.fuelTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setFuelDistanceNm(String(passage.distanceNm));
                setFuelSpeedKnots(speedKnots);
              }}
              className="rounded-md border border-sky-400/25 bg-[#040B16] px-2.5 py-1 text-xs font-medium text-sky-300 hover:border-sky-400/50 whitespace-nowrap shrink-0"
            >
              {t.tools.syncFromPassage} ({passage.distanceNm} NM)
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-slate-400">
                {t.tools.fuelDistance}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={fuelDistanceNm}
                onChange={(e) => setFuelDistanceNm(e.target.value)}
                className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 font-mono text-xs tabular-nums text-slate-100 focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">
                {t.tools.cruisingSpeed}
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={fuelSpeedKnots}
                onChange={(e) => setFuelSpeedKnots(e.target.value)}
                className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 font-mono text-xs tabular-nums text-slate-100 focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">
                {t.tools.fuelBurnRate}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={fuelBurnLph}
                onChange={(e) => setFuelBurnLph(e.target.value)}
                className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 font-mono text-xs tabular-nums text-slate-100 focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">
                {t.tools.fuelReservePct}
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="5"
                value={fuelReservePct}
                onChange={(e) => setFuelReservePct(e.target.value)}
                className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 font-mono text-xs tabular-nums text-slate-100 focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile
              label={t.tools.fuelNet}
              value={fuelCalc.netFuelLiters.toLocaleString()}
              unit="L"
              detail={`${fuelCalc.voyageHours} h @ ${fuelSpeedKnots} kt`}
              accent="sky"
            />
            <StatTile
              label={t.tools.fuelTotal}
              value={fuelCalc.totalFuelLiters.toLocaleString()}
              unit="L"
              detail={`+${fuelCalc.reserveFuelLiters.toLocaleString()} L (${fuelCalc.totalFuelMetricTonnes} MT)`}
              accent="gold"
            />
            <StatTile
              label={t.tools.fuelDailyBurn}
              value={fuelCalc.dailyBurnLiters.toLocaleString()}
              unit="L/24h"
              detail="MGO density 0.845"
            />
          </div>
        </div>

        {/* Draft, TPC & UKC Hesaplayıcı */}
        <div className="rounded-xl border border-sky-400/20 bg-[#0A1628] p-5 lg:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-400/15 pb-3">
            <div className="flex items-center gap-2">
              <Anchor className="h-4 w-4 text-sky-400" />
              <h2 className="font-display text-base font-semibold text-slate-50">
                {t.tools.draftTitle}
              </h2>
            </div>
            <div className="flex items-center gap-1 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => setWaterDensity('1.025')}
                className={`rounded px-2 py-1 ${
                  waterDensity === '1.025'
                    ? 'bg-sky-500/20 text-sky-300'
                    : 'bg-[#040B16] text-slate-400 hover:text-slate-200'
                }`}
              >
                Sea 1.025
              </button>
              <button
                type="button"
                onClick={() => setWaterDensity('1.010')}
                className={`rounded px-2 py-1 ${
                  waterDensity === '1.010'
                    ? 'bg-sky-500/20 text-sky-300'
                    : 'bg-[#040B16] text-slate-400 hover:text-slate-200'
                }`}
              >
                Brackish 1.010
              </button>
              <button
                type="button"
                onClick={() => setWaterDensity('1.000')}
                className={`rounded px-2 py-1 ${
                  waterDensity === '1.000'
                    ? 'bg-amber-400/20 text-amber-300'
                    : 'bg-[#040B16] text-slate-400 hover:text-slate-200'
                }`}
              >
                Fresh 1.000
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-400">
                {t.tools.currentDraft}
              </label>
              <input
                type="number"
                min="0"
                step="0.05"
                value={currentDraftM}
                onChange={(e) => setCurrentDraftM(e.target.value)}
                className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 font-mono text-xs tabular-nums text-slate-100 focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">
                {t.tools.weightChange}
              </label>
              <input
                type="number"
                step="1"
                value={weightChangeT}
                onChange={(e) => setWeightChangeT(e.target.value)}
                className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 font-mono text-xs tabular-nums text-slate-100 focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">
                {t.tools.tpcLabel}
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={tpcVal}
                onChange={(e) => setTpcVal(e.target.value)}
                className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 font-mono text-xs tabular-nums text-slate-100 focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">
                {t.tools.waterDensity}
              </label>
              <input
                type="number"
                min="0.99"
                max="1.04"
                step="0.001"
                value={waterDensity}
                onChange={(e) => setWaterDensity(e.target.value)}
                className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 font-mono text-xs tabular-nums text-slate-100 focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">
                {t.tools.displacement}
              </label>
              <input
                type="number"
                min="0"
                step="10"
                value={displacementT}
                onChange={(e) => setDisplacementT(e.target.value)}
                className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 font-mono text-xs tabular-nums text-slate-100 focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400">
                {t.tools.waterDepth}
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={waterDepthM}
                onChange={(e) => setWaterDepthM(e.target.value)}
                className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 font-mono text-xs tabular-nums text-slate-100 focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile
              label={t.tools.sinkageRise}
              value={`${draftCalc.sinkageCm >= 0 ? '+' : ''}${draftCalc.sinkageCm}`}
              unit="cm"
              detail={`FWA ${draftCalc.fwaCm} cm · DWA ${draftCalc.densityCorrectionCm >= 0 ? '+' : ''}${draftCalc.densityCorrectionCm} cm`}
              accent="sky"
            />
            <StatTile
              label={t.tools.newDraft}
              value={draftCalc.newMeanDraftM.toFixed(2)}
              unit="m"
              detail="After ΔW + density"
              accent="gold"
            />
            <StatTile
              label={t.tools.ukcLabel}
              value={draftCalc.ukcMeters.toFixed(2)}
              unit="m"
              detail={draftCalc.ukcMeters < 0.8 ? 'Caution: Shallow UKC' : 'Clearance OK'}
            />
          </div>
        </div>
      </div>

      {/* Row 3: Beaufort Scale (0-12 + Tester) + VHF Maritime Channels */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="overflow-hidden rounded-xl border border-sky-400/20 bg-[#0A1628] lg:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-400/15 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-sky-400" />
              <h2 className="font-display text-base font-semibold text-slate-50">
                {t.tools.beaufortRef}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="bft-knots" className="text-xs text-slate-400 whitespace-nowrap">
                {t.tools.beaufortTestKnots}:
              </label>
              <input
                id="bft-knots"
                type="number"
                min="0"
                max="95"
                value={testWindKnots}
                onChange={(e) => setTestWindKnots(e.target.value)}
                className="w-16 rounded-md border border-sky-400/25 bg-[#040B16] px-2 py-1 font-mono text-xs tabular-nums text-sky-300 focus:border-sky-400 focus:outline-none"
              />
              <span className="font-mono text-xs font-semibold text-amber-300 whitespace-nowrap">
                Bft {matchedBeaufort.force} · {matchedBeaufort.name}
              </span>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            <table className="w-full border-collapse text-start text-xs">
              <thead className="sticky top-0 bg-[#071121] text-slate-400">
                <tr>
                  <th className="px-3 py-2.5 text-start">Bft</th>
                  <th className="px-3 py-2.5 text-start">Force</th>
                  <th className="px-3 py-2.5 text-end">Knots</th>
                  <th className="px-3 py-2.5 text-end">m/s</th>
                  <th className="px-3 py-2.5 text-end">Wave (m)</th>
                  <th className="px-3 py-2.5 text-start">Sea State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-400/10">
                {BEAUFORT_SCALE.map((b) => {
                  const isActive = b.force === matchedBeaufort.force;
                  return (
                    <tr
                      key={b.force}
                      className={isActive ? 'bg-amber-400/10' : 'hover:bg-slate-800/35'}
                    >
                      <td className="px-3 py-2 font-mono font-semibold text-sky-300">{b.force}</td>
                      <td className="px-3 py-2 font-medium text-slate-100 whitespace-nowrap">
                        {b.name}
                      </td>
                      <td className="px-3 py-2 text-end font-mono tabular-nums text-slate-200 whitespace-nowrap">
                        {b.knotsMin}–{b.knotsMax === 99 ? '+' : b.knotsMax}
                      </td>
                      <td className="px-3 py-2 text-end font-mono tabular-nums text-slate-300 whitespace-nowrap">
                        {b.msRange}
                      </td>
                      <td className="px-3 py-2 text-end font-mono tabular-nums text-amber-300 whitespace-nowrap">
                        {b.waveHeightMeters}
                      </td>
                      <td className="px-3 py-2 text-slate-300">{b.seaDescription}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-sky-400/20 bg-[#0A1628] lg:col-span-6">
          <div className="flex items-center gap-2 border-b border-sky-400/15 px-5 py-3.5">
            <Radio className="h-4 w-4 text-sky-400" />
            <h2 className="font-display text-base font-semibold text-slate-50">
              {t.tools.vhfRef}
            </h2>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full border-collapse text-start text-xs">
              <thead className="sticky top-0 bg-[#071121] text-slate-400">
                <tr>
                  <th className="px-4 py-2.5 text-start">Channel</th>
                  <th className="px-4 py-2.5 text-end">MHz</th>
                  <th className="px-4 py-2.5 text-start">Assignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-400/10">
                {VHF_CHANNELS.map((vhf) => (
                  <tr key={vhf.channel} className="hover:bg-slate-800/35">
                    <td className="px-4 py-2.5 font-mono font-semibold text-amber-300 whitespace-nowrap">
                      {vhf.channel}
                    </td>
                    <td className="px-4 py-2.5 text-end font-mono tabular-nums text-sky-300 whitespace-nowrap">
                      {vhf.frequencyMhz}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-100">{vhf.usage}</div>
                      <div className="mt-0.5 text-slate-400">{vhf.notes}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 4: Küresel Acil ve Tehlike Frekansları (GMDSS) */}
      <div className="overflow-hidden rounded-xl border border-amber-400/30 bg-[#0A1628]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-400/15 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            <h2 className="font-display text-base font-semibold text-slate-50">
              {t.tools.emergencyTitle}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-sky-400/20 bg-[#040B16] p-1">
            {(['ALL', 'VHF', 'MF', 'HF', 'Satellite / SAR'] as const).map((band) => (
              <button
                key={band}
                type="button"
                onClick={() => setEmergencyBand(band)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  emergencyBand === band
                    ? 'bg-amber-400/20 text-amber-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {band === 'ALL' ? t.tools.emergencyBandAll : band}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-start text-xs">
            <thead className="bg-[#071121] text-slate-400">
              <tr>
                <th className="px-4 py-2.5 text-start">Band</th>
                <th className="px-4 py-2.5 text-start">System</th>
                <th className="px-4 py-2.5 text-start">Frequency</th>
                <th className="px-4 py-2.5 text-start">Coverage</th>
                <th className="px-4 py-2.5 text-start">SOLAS / GMDSS Protocol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-400/10">
              {filteredEmergencyFreqs.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/35">
                  <td className="px-4 py-3 font-mono font-semibold text-amber-300 whitespace-nowrap">
                    {item.band}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-100 whitespace-nowrap">
                    <div>{item.system}</div>
                    <div className="text-[11px] text-slate-400">{item.mode}</div>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold tabular-nums text-sky-300 whitespace-nowrap">
                    {item.frequency}
                  </td>
                  <td className="px-4 py-3 text-slate-200 whitespace-nowrap">
                    {item.coverage}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{item.protocol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
