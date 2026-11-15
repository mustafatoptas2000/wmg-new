import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Wind } from 'lucide-react';
import { WORLD_CONTINENT_POLYGONS } from '../../data/worldCoastlines';
import { Marina } from '../../types/maritime';

interface AnimatedWindMapProps {
  marinas: Marina[];
  selectedMarina: Marina;
  onSelectMarina: (marina: Marina) => void;
  focusPreset: 'turkey' | 'med' | 'world';
}

interface WindParticle {
  x: number;
  y: number;
  age: number;
  maxAge: number;
}

function getBounds(preset: 'turkey' | 'med' | 'world') {
  if (preset === 'turkey') {
    return { lonMin: 22, lonMax: 41, latMin: 34, latMax: 43 };
  }
  if (preset === 'med') {
    return { lonMin: -9, lonMax: 41, latMin: 30, latMax: 48 };
  }
  return { lonMin: -180, lonMax: 180, latMin: -65, latMax: 78 };
}

// Compute synthetic regional wind vector (u, v, knots) at any (lon, lat)
function sampleWindField(lon: number, lat: number, timeSec: number): { u: number; v: number; knots: number; deg: number } {
  // Realistic Aegean Meltemi / Med / Atlantic trade & westerly flow patterns
  const radLat = (lat * Math.PI) / 180;
  const radLon = (lon * Math.PI) / 180;

  let u = Math.cos(radLat * 2.2) * 0.7 + Math.sin(radLon * 1.4 + timeSec * 0.15) * 0.35;
  let v = -Math.sin(radLat * 1.6) * 0.55 + Math.cos(radLon * 1.9 - timeSec * 0.12) * 0.3;

  // Aegean/Eastern Med prevailing NW-N flow
  if (lon > 20 && lon < 38 && lat > 34 && lat < 43) {
    u = 0.45 + Math.sin(radLat * 6 + timeSec * 0.25) * 0.2;
    v = -0.82 + Math.cos(radLon * 5 + timeSec * 0.2) * 0.15;
  }

  const mag = Math.hypot(u, v) || 1;
  const knots = Math.round(8 + mag * 14 + Math.sin(radLon * 3 + radLat * 2) * 3);
  const deg = Math.round(((Math.atan2(u, -v) * 180) / Math.PI + 360) % 360);
  return { u: u / mag, v: v / mag, knots: Math.max(4, Math.min(34, knots)), deg };
}

function windColor(knots: number): string {
  if (knots >= 24) return 'rgba(245, 158, 11, 0.85)'; // amber strong wind
  if (knots >= 16) return 'rgba(56, 189, 248, 0.85)'; // bright sky fresh
  if (knots >= 10) return 'rgba(14, 165, 233, 0.72)'; // ocean blue moderate
  return 'rgba(148, 163, 184, 0.55)'; // light air
}

export const AnimatedWindMap: React.FC<AnimatedWindMapProps> = ({
  marinas,
  selectedMarina,
  onSelectMarina,
  focusPreset,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hdMode, setHdMode] = useState(true);
  const [showBarbs, setShowBarbs] = useState(true);

  const bounds = useMemo(() => getBounds(focusPreset), [focusPreset]);

  const projectToPercent = (lat: number, lon: number) => {
    const xPct = ((lon - bounds.lonMin) / (bounds.lonMax - bounds.lonMin)) * 100;
    const yPct = ((bounds.latMax - lat) / (bounds.latMax - bounds.latMin)) * 100;
    return { xPct, yPct };
  };

  // Wind Barb / Marker data for visible marinas
  const visibleMarkers = useMemo(() => {
    return marinas
      .filter(
        (m) =>
          m.longitude >= bounds.lonMin &&
          m.longitude <= bounds.lonMax &&
          m.latitude >= bounds.latMin &&
          m.latitude <= bounds.latMax,
      )
      .slice(0, focusPreset === 'world' ? 22 : 45)
      .map((m) => {
        const pos = projectToPercent(m.latitude, m.longitude);
        const wind = sampleWindField(m.longitude, m.latitude, 0);
        return { marina: m, ...pos, ...wind };
      });
  }, [marinas, bounds, focusPreset]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = hdMode ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    let width = container.clientWidth || 800;
    let height = container.clientHeight || 460;

    const resize = () => {
      width = container.clientWidth || 800;
      height = container.clientHeight || 460;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const particleCount = hdMode ? 900 : 320;
    const particles: WindParticle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      age: Math.floor(Math.random() * 70),
      maxAge: 55 + Math.floor(Math.random() * 45),
    }));

    let animId = 0;
    let startTime = performance.now();

    const drawStaticBackdrop = () => {
      ctx.fillStyle = '#040D1B';
      ctx.fillRect(0, 0, width, height);

      // Subtle lat/lon chart grid
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

      // Draw coastlines
      ctx.fillStyle = '#112642';
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.35)';
      ctx.lineWidth = 1.1;

      WORLD_CONTINENT_POLYGONS.forEach((ring) => {
        ctx.beginPath();
        ring.forEach(([lon, lat], idx) => {
          const x = ((lon - bounds.lonMin) / (bounds.lonMax - bounds.lonMin)) * width;
          const y = ((bounds.latMax - lat) / (bounds.latMax - bounds.latMin)) * height;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
    };

    drawStaticBackdrop();

    const tick = (now: number) => {
      const elapsedSec = (now - startTime) * 0.001;

      // Gentle fade trail for fluid wind ribbons
      ctx.fillStyle = hdMode ? 'rgba(4, 13, 27, 0.16)' : 'rgba(4, 13, 27, 0.22)';
      ctx.fillRect(0, 0, width, height);

      // Re-stroke faint coastlines so land edges stay crisp
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.14)';
      ctx.lineWidth = 0.8;
      WORLD_CONTINENT_POLYGONS.forEach((ring) => {
        ctx.beginPath();
        ring.forEach(([lon, lat], idx) => {
          const x = ((lon - bounds.lonMin) / (bounds.lonMax - bounds.lonMin)) * width;
          const y = ((bounds.latMax - lat) / (bounds.latMax - bounds.latMin)) * height;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.stroke();
      });

      const speedScale = hdMode ? 1.55 : 1.3;
      ctx.lineWidth = hdMode ? 1.6 : 1.3;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const lon = bounds.lonMin + (p.x / width) * (bounds.lonMax - bounds.lonMin);
        const lat = bounds.latMax - (p.y / height) * (bounds.latMax - bounds.latMin);
        const vec = sampleWindField(lon, lat, elapsedSec);

        const nextX = p.x + vec.u * (vec.knots * 0.09) * speedScale;
        const nextY = p.y - vec.v * (vec.knots * 0.09) * speedScale;

        ctx.strokeStyle = windColor(vec.knots);
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

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [bounds, hdMode]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#040D1B]">
      <canvas ref={canvasRef} className="block h-full w-full" />

      {/* Top-Left Compact Map Overlay Controls */}
      <div className="absolute start-3 top-3 z-10 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setHdMode((prev) => !prev)}
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
            hdMode
              ? 'border-amber-400/50 bg-[#0A1628]/90 text-amber-300'
              : 'border-sky-400/25 bg-[#0A1628]/90 text-slate-300'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>{hdMode ? 'HD Wind Stream ON' : 'Standard Wind'}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowBarbs((prev) => !prev)}
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
            showBarbs
              ? 'border-sky-400/50 bg-[#0A1628]/90 text-sky-300'
              : 'border-sky-400/20 bg-[#0A1628]/90 text-slate-400'
          }`}
        >
          <Wind className="h-3.5 w-3.5" />
          <span>Sailor Wind Markers</span>
        </button>
      </div>

      {/* Interactive Sailor Wind Markers & Marinas */}
      {showBarbs && (
        <div className="pointer-events-none absolute inset-0">
          {visibleMarkers.map(({ marina, xPct, yPct, knots, deg }) => {
            const isSelected = marina.id === selectedMarina.id;
            return (
              <button
                key={marina.id}
                type="button"
                onClick={() => onSelectMarina(marina)}
                style={{ left: `${xPct}%`, top: `${yPct}%` }}
                className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 group"
                title={`${marina.name}: ${knots} kt`}
              >
                <div
                  className={`flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums transition-transform ${
                    isSelected
                      ? 'scale-110 border-amber-400 bg-[#040B16] text-amber-300'
                      : 'border-sky-400/40 bg-[#071326]/90 text-sky-200 hover:border-sky-300'
                  }`}
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="h-3 w-3 shrink-0"
                    style={{ transform: `rotate(${deg}deg)` }}
                    aria-hidden="true"
                  >
                    <path d="M8 2 L11 11 L8 9 L5 11 Z" fill={isSelected ? '#FCD34D' : '#38BDF8'} />
                  </svg>
                  <span>{knots}kt</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Bottom Legend */}
      <div className="pointer-events-none absolute bottom-3 end-3 rounded-md border border-sky-400/20 bg-[#071326]/90 px-2.5 py-1 font-mono text-[10px] text-slate-300">
        GFS 27 Simulated Wind Field · Demo Layer
      </div>
    </div>
  );
};
