import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CloudLightning,
  Droplets,
  Flame,
  Radar,
  Satellite,
  Thermometer,
  Waves,
  Wind,
} from 'lucide-react';
import { DEMO_STORM_SYSTEMS } from '../../data/stormTracks';
import { WORLD_CONTINENT_POLYGONS } from '../../data/worldCoastlines';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  Marina,
  MarineWeatherReport,
  MaritimeWeatherLayer,
  StormSystem,
} from '../../types/maritime';

interface MaritimeWeatherMapProps {
  marinas: Marina[];
  selectedMarina: Marina;
  onSelectMarina: (marina: Marina) => void;
  weatherReport: MarineWeatherReport | null;
}

type FocusScope = 'turkey' | 'med' | 'world';

interface WindParticle {
  x: number;
  y: number;
  age: number;
  maxAge: number;
}

function getBounds(scope: FocusScope) {
  if (scope === 'turkey') return { lonMin: 21, lonMax: 42, latMin: 34, latMax: 43.2 };
  if (scope === 'med') return { lonMin: -10, lonMax: 42, latMin: 29, latMax: 48.5 };
  return { lonMin: -95, lonMax: 155, latMin: -25, latMax: 68 };
}

function sampleField(lon: number, lat: number, timeSec: number, radarOffsetHours: number) {
  const radLat = (lat * Math.PI) / 180;
  const radLon = (lon * Math.PI) / 180;
  const phaseShift = radarOffsetHours * 0.45;

  // Wind vector
  let u = Math.cos(radLat * 2.1) * 0.7 + Math.sin(radLon * 1.5 + timeSec * 0.14) * 0.35;
  let v = -Math.sin(radLat * 1.7) * 0.55 + Math.cos(radLon * 1.8 - timeSec * 0.11) * 0.3;
  if (lon > 20 && lon < 38 && lat > 34 && lat < 43) {
    u = 0.48 + Math.sin(radLat * 6 + timeSec * 0.2) * 0.18;
    v = -0.82 + Math.cos(radLon * 5 + timeSec * 0.18) * 0.14;
  }
  const mag = Math.hypot(u, v) || 1;
  const windKnots = Math.max(4, Math.min(38, Math.round(9 + mag * 14 + Math.sin(radLon * 3 + radLat * 2) * 3)));
  const windDeg = Math.round(((Math.atan2(u, -v) * 180) / Math.PI + 360) % 360);

  // Wave height (m)
  const waveM = Number(
    Math.max(0.2, 0.35 + (windKnots / 24) * 1.9 + Math.abs(Math.sin(radLon * 2.4 + radLat * 2.2)) * 0.7).toFixed(2),
  );

  // Temperature (°C)
  const tempC = Number(
    (29 - Math.abs(lat - 22) * 0.42 + Math.sin(radLon * 1.6) * 1.8).toFixed(1),
  );

  // Relative humidity (%)
  const humidity = Math.max(
    45,
    Math.min(96, Math.round(66 + Math.sin(radLon * 2.7 + radLat * 3.1 + phaseShift) * 16)),
  );

  // Convective rain & radar reflectivity intensity [0..1]
  const cellA = Math.exp(-(((lon - (24 + phaseShift * 2.2)) ** 2) / 14 + ((lat - 38.4) ** 2) / 4.5));
  const cellB = Math.exp(-(((lon - (18.5 + phaseShift * 2.0)) ** 2) / 18 + ((lat - 36.6) ** 2) / 6));
  const cellC = Math.exp(-(((lon - (33.5 + phaseShift * 1.8)) ** 2) / 12 + ((lat - 41.2) ** 2) / 4));
  const cellD = Math.exp(-(((lon - (3.5 + phaseShift * 3.0)) ** 2) / 45 + ((lat - 55.8) ** 2) / 12));
  const rainIntensity = Math.min(1, cellA * 0.95 + cellB * 1.05 + cellC * 0.8 + cellD * 0.9);

  // Cloud cover [0..1]
  const cloud = Math.min(
    1,
    Math.max(0, 0.2 + rainIntensity * 0.75 + Math.sin(radLon * 3.4 + radLat * 4.2 + phaseShift) * 0.25),
  );

  return {
    u: u / mag,
    v: v / mag,
    windKnots,
    windDeg,
    waveM,
    tempC,
    humidity,
    rainIntensity,
    cloud,
  };
}

export const MaritimeWeatherMap: React.FC<MaritimeWeatherMapProps> = ({
  marinas,
  selectedMarina,
  onSelectMarina,
  weatherReport,
}) => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeLayer, setActiveLayer] = useState<MaritimeWeatherLayer>('radar');
  const [focusScope, setFocusScope] = useState<FocusScope>('med');
  const [showWindBarbs, setShowWindBarbs] = useState(true);
  const [radarStepOffset, setRadarStepOffset] = useState<number>(0); // -2, -1, 0, 1 hours
  const [selectedStorm, setSelectedStorm] = useState<StormSystem>(DEMO_STORM_SYSTEMS[0]);

  const bounds = useMemo(() => getBounds(focusScope), [focusScope]);

  const projectToPercent = (lat: number, lon: number) => {
    const xPct = ((lon - bounds.lonMin) / (bounds.lonMax - bounds.lonMin)) * 100;
    const yPct = ((bounds.latMax - lat) / (bounds.latMax - bounds.latMin)) * 100;
    return { xPct, yPct };
  };

  const visibleMarinas = useMemo(() => {
    return marinas
      .filter(
        (m) =>
          m.longitude >= bounds.lonMin &&
          m.longitude <= bounds.lonMax &&
          m.latitude >= bounds.latMin &&
          m.latitude <= bounds.latMax,
      )
      .slice(0, focusScope === 'world' ? 20 : 34)
      .map((m) => {
        const pos = projectToPercent(m.latitude, m.longitude);
        const sample = sampleField(m.longitude, m.latitude, 0, radarStepOffset);
        return { marina: m, ...pos, ...sample };
      });
  }, [marinas, bounds, focusScope, radarStepOffset]);

  // Auto-switch scope to 'world' if user selects Hurricane layer and wants global context
  const handleLayerSelect = (layer: MaritimeWeatherLayer) => {
    setActiveLayer(layer);
    if (layer === 'hurricane' && focusScope === 'turkey') {
      setFocusScope('med');
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = container.clientWidth || 840;
    let height = container.clientHeight || 440;

    const resize = () => {
      width = container.clientWidth || 840;
      height = container.clientHeight || 440;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const particles: WindParticle[] = Array.from({ length: 420 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      age: Math.floor(Math.random() * 60),
      maxAge: 50 + Math.floor(Math.random() * 40),
    }));

    let animId = 0;
    const startTime = performance.now();

    const lonToX = (lon: number) =>
      ((lon - bounds.lonMin) / (bounds.lonMax - bounds.lonMin)) * width;
    const latToY = (lat: number) =>
      ((bounds.latMax - lat) / (bounds.latMax - bounds.latMin)) * height;

    const renderFrame = (now: number) => {
      const elapsedSec = (now - startTime) * 0.001;

      // 1. Sea backdrop
      ctx.fillStyle = '#040D1B';
      ctx.fillRect(0, 0, width, height);

      // 2. Grid heatmap layer for Waves, Rain/Lightning, Radar, Satellite, Temperature, Humidity
      const cellCols = 42;
      const cellRows = 24;
      const cw = width / cellCols;
      const ch = height / cellRows;

      if (activeLayer !== 'wind') {
        for (let r = 0; r < cellRows; r++) {
          for (let c = 0; c < cellCols; c++) {
            const px = c * cw + cw * 0.5;
            const py = r * ch + ch * 0.5;
            const lon = bounds.lonMin + (px / width) * (bounds.lonMax - bounds.lonMin);
            const lat = bounds.latMax - (py / height) * (bounds.latMax - bounds.latMin);
            const s = sampleField(lon, lat, elapsedSec * 0.3, radarStepOffset);

            let fill = '';
            if (activeLayer === 'waves') {
              if (s.waveM >= 2.2) fill = 'rgba(245, 158, 11, 0.34)';
              else if (s.waveM >= 1.4) fill = 'rgba(56, 189, 248, 0.28)';
              else fill = 'rgba(14, 165, 233, 0.14)';
            } else if (activeLayer === 'temperature') {
              if (s.tempC >= 24) fill = 'rgba(249, 115, 22, 0.32)';
              else if (s.tempC >= 19) fill = 'rgba(245, 158, 11, 0.22)';
              else if (s.tempC >= 14) fill = 'rgba(56, 189, 248, 0.20)';
              else fill = 'rgba(37, 99, 235, 0.26)';
            } else if (activeLayer === 'humidity') {
              const alpha = Math.max(0.06, ((s.humidity - 45) / 55) * 0.42);
              fill = `rgba(45, 212, 191, ${alpha.toFixed(2)})`;
            } else if (activeLayer === 'satellite') {
              if (s.cloud > 0.32) {
                fill = `rgba(226, 232, 240, ${(s.cloud * 0.42).toFixed(2)})`;
              }
            } else if (activeLayer === 'rain_lightning' || activeLayer === 'radar') {
              if (s.rainIntensity > 0.62) fill = 'rgba(245, 158, 11, 0.52)';
              else if (s.rainIntensity > 0.38) fill = 'rgba(34, 197, 94, 0.42)';
              else if (s.rainIntensity > 0.18) fill = 'rgba(56, 189, 248, 0.30)';
            } else if (activeLayer === 'hurricane') {
              if (s.rainIntensity > 0.32) fill = 'rgba(56, 189, 248, 0.18)';
            }

            if (fill) {
              ctx.fillStyle = fill;
              ctx.fillRect(c * cw, r * ch, cw + 0.8, ch + 0.8);
            }
          }
        }
      }

      // 3. Lat/Lon maritime graticule
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 8; i++) {
        const x = (width / 8) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let j = 1; j < 6; j++) {
        const y = (height / 6) * j;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 4. Coastline Landmasses
      ctx.fillStyle = '#0F223D';
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.36)';
      ctx.lineWidth = 1.1;
      WORLD_CONTINENT_POLYGONS.forEach((ring) => {
        ctx.beginPath();
        ring.forEach(([lon, lat], idx) => {
          const x = lonToX(lon);
          const y = latToY(lat);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });

      // 5. Wind streamlines (always drawn on 'wind', and subtly on 'waves'/'hurricane')
      if (activeLayer === 'wind' || activeLayer === 'waves' || activeLayer === 'hurricane') {
        ctx.lineWidth = activeLayer === 'wind' ? 1.5 : 1.0;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const lon = bounds.lonMin + (p.x / width) * (bounds.lonMax - bounds.lonMin);
          const lat = bounds.latMax - (p.y / height) * (bounds.latMax - bounds.latMin);
          const s = sampleField(lon, lat, elapsedSec, radarStepOffset);

          const nextX = p.x + s.u * (s.windKnots * 0.095);
          const nextY = p.y - s.v * (s.windKnots * 0.095);

          ctx.strokeStyle =
            activeLayer === 'wind'
              ? s.windKnots >= 22
                ? 'rgba(245, 158, 11, 0.85)'
                : 'rgba(56, 189, 248, 0.78)'
              : 'rgba(148, 163, 184, 0.32)';

          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(nextX, nextY);
          ctx.stroke();

          p.x = nextX;
          p.y = nextY;
          p.age++;
          if (p.age > p.maxAge || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
            p.x = Math.random() * width;
            p.y = Math.random() * height;
            p.age = 0;
          }
        }
      }

      // 6. Doppler Weather Radar Rings + Sweep centered on selectedMarina
      if (activeLayer === 'radar') {
        const cx = lonToX(selectedMarina.longitude);
        const cy = latToY(selectedMarina.latitude);
        const maxR = Math.min(width, height) * 0.38;

        [0.33, 0.66, 1].forEach((ratio, idx) => {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.32)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(cx, cy, maxR * ratio, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = 'rgba(125, 211, 252, 0.75)';
          ctx.font = '10px JetBrains Mono, monospace';
          ctx.fillText(`${(idx + 1) * 50} NM`, cx + 6, cy - maxR * ratio + 12);
        });

        // Rotating sweep wedge
        const sweepAngle = (elapsedSec * 1.1) % (Math.PI * 2);
        const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, maxR);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0.02)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, maxR, sweepAngle - 0.38, sweepAngle);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(sweepAngle) * maxR, cy + Math.sin(sweepAngle) * maxR);
        ctx.stroke();
      }

      // 7. Lightning Bolts on Rain & Lightning Layer
      if (activeLayer === 'rain_lightning') {
        const strikePoints: [number, number][] = [
          [18.6 + radarStepOffset * 1.8, 36.7],
          [24.2 + radarStepOffset * 2.0, 38.5],
          [25.1 + radarStepOffset * 2.0, 38.1],
          [33.3 + radarStepOffset * 1.5, 41.3],
          [3.6 + radarStepOffset * 2.5, 55.9],
        ];
        strikePoints.forEach(([lon, lat], idx) => {
          const pulse = Math.sin(elapsedSec * 5 + idx * 1.7);
          if (pulse > -0.2) {
            const x = lonToX(lon);
            const y = latToY(lat);
            ctx.strokeStyle = '#FCD34D';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(x + 3, y - 9);
            ctx.lineTo(x - 3, y);
            ctx.lineTo(x + 2, y);
            ctx.lineTo(x - 3, y + 9);
            ctx.stroke();
          }
        });
      }

      // 8. Hurricane / Medicane / Gale Storm Tracks
      if (activeLayer === 'hurricane') {
        DEMO_STORM_SYSTEMS.forEach((storm) => {
          const isStormSelected = storm.id === selectedStorm.id;

          // Past Track (solid line)
          ctx.strokeStyle = isStormSelected ? '#F59E0B' : 'rgba(248, 113, 113, 0.75)';
          ctx.lineWidth = isStormSelected ? 2.4 : 1.6;
          ctx.beginPath();
          storm.pastTrack.forEach(([lon, lat], idx) => {
            const x = lonToX(lon);
            const y = latToY(lat);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();

          // Forecast Track (dashed line + uncertainty cone)
          const curX = lonToX(storm.currentLon);
          const curY = latToY(storm.currentLat);
          ctx.setLineDash([5, 4]);
          ctx.strokeStyle = isStormSelected ? '#FCD34D' : 'rgba(251, 146, 60, 0.7)';
          ctx.beginPath();
          ctx.moveTo(curX, curY);
          storm.forecastTrack.forEach((pt, idx) => {
            const fx = lonToX(pt.lon);
            const fy = latToY(pt.lat);
            ctx.lineTo(fx, fy);

            // Cone circle
            ctx.save();
            ctx.setLineDash([]);
            ctx.fillStyle = isStormSelected
              ? 'rgba(245, 158, 11, 0.14)'
              : 'rgba(248, 113, 113, 0.08)';
            ctx.beginPath();
            ctx.arc(fx, fy, 10 + idx * 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          });
          ctx.stroke();
          ctx.setLineDash([]);

          // Spinning Storm Eye Marker
          ctx.save();
          ctx.translate(curX, curY);
          ctx.rotate(elapsedSec * 2.2);
          ctx.strokeStyle = isStormSelected ? '#FCD34D' : '#F87171';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 1.4);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, 6, Math.PI, Math.PI * 2.4);
          ctx.stroke();
          ctx.restore();
        });
      }

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [bounds, activeLayer, radarStepOffset, selectedMarina, selectedStorm]);

  const layers: {
    id: MaritimeWeatherLayer;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'radar', label: t.weather.layerRadar, icon: Radar },
    { id: 'wind', label: t.weather.layerWind, icon: Wind },
    { id: 'waves', label: t.weather.layerWaves, icon: Waves },
    { id: 'rain_lightning', label: t.weather.layerRainLightning, icon: CloudLightning },
    { id: 'satellite', label: t.weather.layerSatellite, icon: Satellite },
    { id: 'temperature', label: t.weather.layerTemp, icon: Thermometer },
    { id: 'humidity', label: t.weather.layerHumidity, icon: Droplets },
    { id: 'hurricane', label: t.weather.layerHurricane, icon: Flame },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-sky-400/20 bg-[#061224]">
      {/* Top Layer & Region Toolbar */}
      <div className="flex flex-col gap-2.5 border-b border-sky-400/15 bg-[#0A1628] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-sky-400" />
            <h2 className="font-display text-sm font-semibold text-slate-50">
              {t.weather.proMapTitle}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowWindBarbs((prev) => !prev)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                showWindBarbs
                  ? 'border-sky-400/50 bg-[#040B16] text-sky-300'
                  : 'border-sky-400/15 bg-[#040B16] text-slate-400'
              }`}
            >
              {t.weather.windBarbsToggle}
            </button>

            <div className="flex items-center gap-1 rounded-lg bg-[#040B16] p-1">
              {(['turkey', 'med', 'world'] as const).map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => setFocusScope(scope)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    focusScope === scope
                      ? 'bg-amber-400/20 text-amber-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {scope === 'turkey'
                    ? t.home.focusTurkey
                    : scope === 'med'
                      ? t.home.focusMed
                      : t.home.focusWorld}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 8 Meteorological Layer Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {layers.map((layer) => {
            const Icon = layer.icon;
            const isActive = activeLayer === layer.id;
            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => handleLayerSelect(layer.id)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'border-amber-400/60 bg-[#0F2340] text-amber-300'
                    : 'border-sky-400/20 bg-[#040B16] text-slate-300 hover:border-sky-400/45 hover:text-sky-300'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-amber-300' : 'text-sky-400'}`} />
                <span>{layer.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Map Canvas Viewport */}
      <div ref={containerRef} className="relative h-[380px] w-full sm:h-[440px]">
        <canvas ref={canvasRef} className="block h-full w-full" />

        {/* Radar / Rain Timeline Playback Control */}
        {(activeLayer === 'radar' || activeLayer === 'rain_lightning' || activeLayer === 'satellite') && (
          <div className="absolute start-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-sky-400/25 bg-[#071326]/90 p-1 font-mono text-[11px]">
            {[-2, -1, 0, 1].map((offset) => (
              <button
                key={offset}
                type="button"
                onClick={() => setRadarStepOffset(offset)}
                className={`rounded px-2 py-1 font-semibold transition-colors ${
                  radarStepOffset === offset
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-300 hover:text-sky-300'
                }`}
              >
                {offset === 0 ? 'NOW' : `${offset > 0 ? '+' : ''}${offset}h`}
              </button>
            ))}
          </div>
        )}

        {/* Clickable Marina Markers with Layer-Aware Readouts */}
        <div className="pointer-events-none absolute inset-0">
          {visibleMarinas.map(({ marina, xPct, yPct, windKnots, windDeg, waveM, tempC, humidity }) => {
            const isSelected = marina.id === selectedMarina.id;
            const metricText =
              activeLayer === 'waves'
                ? `${waveM}m`
                : activeLayer === 'temperature'
                  ? `${tempC}°`
                  : activeLayer === 'humidity'
                    ? `${humidity}%`
                    : `${windKnots}kt`;

            return (
              <button
                key={marina.id}
                type="button"
                onClick={() => onSelectMarina(marina)}
                style={{ left: `${xPct}%`, top: `${yPct}%` }}
                className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
                title={`${marina.name} · ${metricText}`}
              >
                <div
                  className={`flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums transition-transform ${
                    isSelected
                      ? 'scale-110 border-amber-400 bg-[#040B16] text-amber-300'
                      : 'border-sky-400/40 bg-[#071326]/90 text-sky-200 hover:border-sky-300'
                  }`}
                >
                  {showWindBarbs && (
                    <svg
                      viewBox="0 0 16 16"
                      className="h-3 w-3 shrink-0"
                      style={{ transform: `rotate(${windDeg}deg)` }}
                      aria-hidden="true"
                    >
                      <path d="M8 2 L11 11 L8 9 L5 11 Z" fill={isSelected ? '#FCD34D' : '#38BDF8'} />
                    </svg>
                  )}
                  <span>{metricText}</span>
                </div>
              </button>
            );
          })}

          {/* Clickable Storm Eye Buttons in Hurricane Layer */}
          {activeLayer === 'hurricane' &&
            DEMO_STORM_SYSTEMS.filter(
              (s) =>
                s.currentLon >= bounds.lonMin &&
                s.currentLon <= bounds.lonMax &&
                s.currentLat >= bounds.latMin &&
                s.currentLat <= bounds.latMax,
            ).map((storm) => {
              const pos = projectToPercent(storm.currentLat, storm.currentLon);
              const isSelected = storm.id === selectedStorm.id;
              return (
                <button
                  key={storm.id}
                  type="button"
                  onClick={() => setSelectedStorm(storm)}
                  style={{ left: `${pos.xPct}%`, top: `${pos.yPct}%` }}
                  className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
                >
                  <div
                    className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold whitespace-nowrap ${
                      isSelected
                        ? 'border-amber-400 bg-[#040B16] text-amber-300'
                        : 'border-red-400/60 bg-[#040B16]/90 text-red-300'
                    }`}
                  >
                    {storm.name} · {storm.maxWindKnots}kt
                  </div>
                </button>
              );
            })}
        </div>

        {/* Bottom-Right Layer Scale & Demo Transparency Badge */}
        <div className="pointer-events-none absolute bottom-3 end-3 rounded-md border border-sky-400/25 bg-[#071326]/90 px-3 py-1.5 font-mono text-[10px] text-slate-200">
          {weatherReport?.isDemonstration === false
            ? `Open-Meteo Station + Demo Map Layer · ${selectedMarina.name}`
            : `Demonstration Meteorological Layer · ${selectedMarina.name}`}
        </div>
      </div>

      {/* Hurricane / Storm Tracker Dossier Bar (Shown when Hurricane Layer is Active) */}
      {activeLayer === 'hurricane' && (
        <div className="border-t border-amber-400/25 bg-[#0A1628] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
            <div className="text-xs font-semibold text-amber-300">
              {t.weather.hurricaneTrackerLabel}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_STORM_SYSTEMS.map((storm) => (
                <button
                  key={storm.id}
                  type="button"
                  onClick={() => {
                    setSelectedStorm(storm);
                    if (storm.basin.includes('Mediterranean')) setFocusScope('med');
                    else setFocusScope('world');
                  }}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    selectedStorm.id === storm.id
                      ? 'border-amber-400/60 bg-[#0F2340] text-amber-300'
                      : 'border-sky-400/20 bg-[#040B16] text-slate-300 hover:text-sky-300'
                  }`}
                >
                  {storm.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-lg border border-sky-400/15 bg-[#040B16] p-3.5 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <div className="text-xs text-sky-300">
                {selectedStorm.basin} · {selectedStorm.categoryLabel}
              </div>
              <div className="mt-0.5 font-display text-sm font-semibold text-slate-100">
                {selectedStorm.name}
              </div>
              <p className="mt-1 text-xs text-slate-300">{selectedStorm.advisory}</p>
            </div>
            <div className="font-mono text-xs tabular-nums">
              <div className="text-slate-400">Eye Position & Movement</div>
              <div className="mt-1 font-semibold text-slate-100">
                {selectedStorm.currentLat.toFixed(1)}°, {selectedStorm.currentLon.toFixed(1)}°
              </div>
              <div className="mt-0.5 text-sky-300">
                {selectedStorm.movementDir} @ {selectedStorm.movementKnots} kt
              </div>
            </div>
            <div className="font-mono text-xs tabular-nums">
              <div className="text-slate-400">Core Pressure & Max Wind</div>
              <div className="mt-1 font-semibold text-amber-300">
                {selectedStorm.maxWindKnots} kt (Gust {selectedStorm.gustKnots} kt)
              </div>
              <div className="mt-0.5 text-slate-200">{selectedStorm.pressureHpa} hPa</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
