import React, { useMemo, useRef, useState } from 'react';
import {
  Anchor,
  Compass,
  Crosshair,
  LocateFixed,
  Minus,
  Plus,
  RotateCcw,
} from 'lucide-react';
import {
  BATHYMETRIC_CONTOURS,
  DEPTH_SOUNDINGS,
  NAUTICAL_ANCHORAGES,
  NAUTICAL_NAVAIDS,
  SEA_CURRENTS,
  WEATHER_BUOYS,
  getPortPlanFeatures,
} from '../../data/nauticalChartData';
import { MARITIME_SERVICES } from '../../data/services';
import { WORLD_CONTINENT_POLYGONS } from '../../data/worldCoastlines';
import {
  Marina,
  MaritimeService,
  NauticalAnchorage,
  NauticalNavaid,
  RouteWaypoint,
  SeaCurrentStream,
  WeatherBuoy,
} from '../../types/maritime';

export type ChartSelection =
  | { type: 'marina'; item: Marina }
  | { type: 'anchorage'; item: NauticalAnchorage }
  | { type: 'navaid'; item: NauticalNavaid }
  | { type: 'buoy'; item: WeatherBuoy }
  | { type: 'current'; item: SeaCurrentStream }
  | { type: 'service'; item: MaritimeService; marina: Marina };

export interface ChartLayerToggles {
  depthContours: boolean;
  anchorages: boolean;
  navaids: boolean;
  services: boolean;
  buoys: boolean;
  currents: boolean;
}

interface NauticalChartCanvasProps {
  marinas: Marina[];
  selectedMarina: Marina;
  routeWaypoints: RouteWaypoint[];
  hasShallowWarning: boolean;
  safetyDraftM: number;
  layers: ChartLayerToggles;
  portPlanMode: boolean;
  addWaypointMode: boolean;
  onAddCustomWaypoint: (lat: number, lon: number) => void;
  onSelectObject: (selection: ChartSelection) => void;
  activeSelection: ChartSelection;
}

type RegionPreset = 'turkey' | 'med' | 'world';

interface ViewportBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function getPresetBox(preset: RegionPreset): ViewportBox {
  if (preset === 'turkey') {
    const x1 = ((24.2 + 180) / 360) * 1000;
    const x2 = ((34.5 + 180) / 360) * 1000;
    const y1 = ((90 - 42.3) / 180) * 500;
    const y2 = ((90 - 35.3) / 180) * 500;
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }
  if (preset === 'med') {
    const x1 = ((-7 + 180) / 360) * 1000;
    const x2 = ((37 + 180) / 360) * 1000;
    const y1 = ((90 - 46) / 180) * 500;
    const y2 = ((90 - 30) / 180) * 500;
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }
  return { x: 0, y: 0, w: 1000, h: 500 };
}

export const NauticalChartCanvas: React.FC<NauticalChartCanvasProps> = ({
  marinas,
  selectedMarina,
  routeWaypoints,
  hasShallowWarning,
  safetyDraftM,
  layers,
  portPlanMode,
  addWaypointMode,
  onAddCustomWaypoint,
  onSelectObject,
  activeSelection,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [regionPreset, setRegionPreset] = useState<RegionPreset>('turkey');
  const [viewBoxState, setViewBoxState] = useState<ViewportBox>(() => getPresetBox('turkey'));
  const [dragOrigin, setDragOrigin] = useState<{ clientX: number; clientY: number; box: ViewportBox } | null>(null);
  const [didDrag, setDidDrag] = useState(false);

  const project = (lat: number, lon: number) => ({
    x: ((lon + 180) / 360) * 1000,
    y: ((90 - lat) / 180) * 500,
  });

  const unproject = (svgX: number, svgY: number) => ({
    lon: Number(((svgX / 1000) * 360 - 180).toFixed(4)),
    lat: Number((90 - (svgY / 500) * 180).toFixed(4)),
  });

  const markerScale = Math.max(0.035, Math.min(1, viewBoxState.w / 1000));

  const continentPaths = useMemo(() => {
    return WORLD_CONTINENT_POLYGONS.map(
      (ring) =>
        ring
          .map(([lon, lat], idx) => {
            const { x, y } = project(lat, lon);
            return `${idx === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
          })
          .join(' ') + ' Z',
    );
  }, []);

  const contourPaths = useMemo(() => {
    return BATHYMETRIC_CONTOURS.map((band) => ({
      ...band,
      path:
        band.polygon
          .map(([lon, lat], idx) => {
            const { x, y } = project(lat, lon);
            return `${idx === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
          })
          .join(' ') + ' Z',
    }));
  }, []);

  const applyPreset = (preset: RegionPreset) => {
    setRegionPreset(preset);
    setViewBoxState(getPresetBox(preset));
  };

  const focusOnMarina = (marina: Marina) => {
    const center = project(marina.latitude, marina.longitude);
    const w = 14;
    const h = 7;
    setViewBoxState({
      x: Math.max(0, Math.min(1000 - w, center.x - w / 2)),
      y: Math.max(0, Math.min(500 - h, center.y - h / 2)),
      w,
      h,
    });
  };

  const zoomBy = (factor: number) => {
    setViewBoxState((prev) => {
      const nextW = Math.max(6, Math.min(1000, prev.w * factor));
      const nextH = nextW / 2;
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      return {
        x: Math.max(0, Math.min(1000 - nextW, cx - nextW / 2)),
        y: Math.max(0, Math.min(500 - nextH, cy - nextH / 2)),
        w: nextW,
        h: nextH,
      };
    });
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    setDidDrag(false);
    setDragOrigin({ clientX: e.clientX, clientY: e.clientY, box: viewBoxState });
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragOrigin || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dxPx = e.clientX - dragOrigin.clientX;
    const dyPx = e.clientY - dragOrigin.clientY;
    if (Math.hypot(dxPx, dyPx) > 4) setDidDrag(true);

    const dxSvg = (dxPx / rect.width) * dragOrigin.box.w;
    const dySvg = (dyPx / rect.height) * dragOrigin.box.h;
    setViewBoxState({
      x: Math.max(0, Math.min(1000 - dragOrigin.box.w, dragOrigin.box.x - dxSvg)),
      y: Math.max(0, Math.min(500 - dragOrigin.box.h, dragOrigin.box.y - dySvg)),
      w: dragOrigin.box.w,
      h: dragOrigin.box.h,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!didDrag && addWaypointMode && svgRef.current && !portPlanMode) {
      const rect = svgRef.current.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;
      const svgX = viewBoxState.x + relX * viewBoxState.w;
      const svgY = viewBoxState.y + relY * viewBoxState.h;
      const { lat, lon } = unproject(svgX, svgY);
      onAddCustomWaypoint(lat, lon);
    }
    setDragOrigin(null);
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    zoomBy(e.deltaY > 0 ? 1.18 : 0.84);
  };

  const portPlanFeatures = useMemo(
    () => getPortPlanFeatures(selectedMarina.name, selectedMarina.maxDraftMeters, selectedMarina.portOfEntry),
    [selectedMarina],
  );

  // If Port Plan Blueprint mode is active, render high-detail local harbor plan
  if (portPlanMode) {
    return (
      <div className="relative h-[430px] w-full overflow-hidden bg-[#04101F] sm:h-[490px]">
        <svg
          viewBox="-115 -80 230 160"
          className="h-full w-full select-none"
          role="img"
          aria-label={`${selectedMarina.name} Port Plan`}
        >
          <defs>
            <pattern id="shallowHatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(245, 158, 11, 0.22)" strokeWidth="1.2" />
            </pattern>
            <radialGradient id="harborDepth" cx="45%" cy="55%" r="70%">
              <stop offset="0%" stopColor="#082442" />
              <stop offset="100%" stopColor="#04101F" />
            </radialGradient>
          </defs>

          <rect x="-120" y="-85" width="240" height="170" fill="url(#harborDepth)" />

          {/* Safety depth contour zones inside harbor plan */}
          <path
            d="M-115,-80 L115,-80 L115,-45 Q55,-50 25,-48 Q-15,-42 -60,-46 L-115,-38 Z"
            fill="#142C47"
            stroke="#38BDF8"
            strokeOpacity="0.35"
            strokeWidth="0.6"
          />
          <path
            d="M-115,-40 Q-55,-36 -15,-34 Q35,-36 115,-35 L115,-22 Q30,-20 -30,-22 Q-70,-18 -115,-25 Z"
            fill={safetyDraftM >= 4 ? 'url(#shallowHatch)' : 'rgba(56, 189, 248, 0.08)'}
            stroke={safetyDraftM >= 4 ? '#F59E0B' : '#38BDF8'}
            strokeDasharray="2 1.5"
            strokeWidth="0.5"
          />
          <text x="-96" y="-26" fill="#93C5FD" fontSize="4.2" fontFamily="JetBrains Mono, monospace">
            5m CONTOUR
          </text>
          <text x="68" y="4" fill="#7DD3FC" fontSize="4.2" fontFamily="JetBrains Mono, monospace">
            10m CONTOUR
          </text>

          {/* Harbor Breakwater Arms */}
          <path
            d="M-85,-32 L-85,34 L-18,34"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M85,-32 L85,34 L18,34"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Pontoons inside Marina Basin */}
          {[
            { x: 18, y: -26, label: 'Pier A' },
            { x: 38, y: -26, label: 'Pier B' },
            { x: 58, y: -26, label: 'Pier C' },
          ].map((pier) => (
            <g key={pier.label}>
              <line x1={pier.x} y1={-32} x2={pier.x} y2={4} stroke="#38BDF8" strokeWidth="1.6" />
              <text x={pier.x} y={10} fill="#CBD5E1" fontSize="3.4" textAnchor="middle" fontFamily="DM Sans, sans-serif">
                {pier.label}
              </text>
            </g>
          ))}

          {/* Entrance Channel Lateral Marks (IALA-A: Red Port / Green Starboard entering) */}
          <circle cx="-16" cy="37" r="2.3" fill="#EF4444" stroke="#040B16" strokeWidth="0.7" />
          <text x="-20" y="44" fill="#FCA5A5" fontSize="3.3" textAnchor="end" fontFamily="JetBrains Mono, monospace">
            Fl.R.3s
          </text>
          <circle cx="16" cy="37" r="2.3" fill="#22C55E" stroke="#040B16" strokeWidth="0.7" />
          <text x="20" y="44" fill="#86EFAC" fontSize="3.3" textAnchor="start" fontFamily="JetBrains Mono, monospace">
            Fl.G.3s
          </text>

          {/* Fairway approach centerline */}
          <line x1="0" y1="74" x2="0" y2="12" stroke="#2DD4BF" strokeWidth="0.9" strokeDasharray="3 2" />
          <text x="2.5" y="58" fill="#5EEAD4" fontSize="3.8" fontFamily="JetBrains Mono, monospace">
            FAIRWAY { (selectedMarina.maxDraftMeters + 2.5).toFixed(1) }m
          </text>

          {/* Port Plan Feature Markers */}
          {portPlanFeatures.map((feat) => {
            const color =
              feat.kind === 'fuel'
                ? '#F97316'
                : feat.kind === 'customs'
                  ? '#818CF8'
                  : feat.kind === 'anchorage'
                    ? '#FBBF24'
                    : feat.kind === 'travel_lift'
                      ? '#34D399'
                      : '#38BDF8';
            const shallow = feat.depthM < safetyDraftM + 0.5;
            return (
              <g key={feat.id}>
                <circle
                  cx={feat.relX}
                  cy={feat.relY}
                  r={feat.kind === 'anchorage' ? 10 : 3.2}
                  fill={feat.kind === 'anchorage' ? 'rgba(251, 191, 36, 0.08)' : color}
                  stroke={shallow ? '#EF4444' : color}
                  strokeWidth={feat.kind === 'anchorage' ? '0.8' : '0.8'}
                  strokeDasharray={feat.kind === 'anchorage' ? '2 1.5' : undefined}
                />
                <text
                  x={feat.relX}
                  y={feat.relY - 5}
                  fill="#F1F5F9"
                  fontSize="3.8"
                  fontWeight="600"
                  textAnchor="middle"
                  fontFamily="DM Sans, sans-serif"
                >
                  {feat.label}
                </text>
                <text
                  x={feat.relX}
                  y={feat.relY + 7.5}
                  fill={shallow ? '#FCA5A5' : '#94A3B8'}
                  fontSize="3.4"
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {feat.depthM.toFixed(1)}m {shallow ? '(!)' : ''}
                </text>
              </g>
            );
          })}

          {/* Spot depth soundings */}
          {[
            { x: -45, y: 12, d: (selectedMarina.maxDraftMeters + 1.8).toFixed(1) },
            { x: 0, y: 20, d: (selectedMarina.maxDraftMeters + 2.3).toFixed(1) },
            { x: 58, y: 28, d: (selectedMarina.maxDraftMeters + 3.4).toFixed(1) },
            { x: -64, y: 58, d: (selectedMarina.maxDraftMeters + 6.2).toFixed(1) },
          ].map((snd, idx) => (
            <text
              key={idx}
              x={snd.x}
              y={snd.y}
              fill="rgba(148, 163, 184, 0.72)"
              fontSize="3.8"
              fontFamily="JetBrains Mono, monospace"
            >
              {snd.d}m
            </text>
          ))}

          {/* Compass Rose corner */}
          <g transform="translate(-96, -58)">
            <circle r="11" fill="none" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="0.6" />
            <line x1="0" y1="-13" x2="0" y2="13" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.6" />
            <line x1="-13" y1="0" x2="13" y2="0" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="0.6" />
            <text x="0" y="-15" fill="#FBBF24" fontSize="4.2" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
              N
            </text>
          </g>
        </svg>

        <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-center justify-between gap-2">
          <div className="rounded-lg border border-teal-400/35 bg-[#040B16]/90 px-3 py-1.5 text-xs">
            <span className="font-semibold text-teal-300">{selectedMarina.name}</span>
            <span className="mx-1.5 text-slate-500">·</span>
            <span className="font-mono text-slate-300">
              Max Draft {selectedMarina.maxDraftMeters.toFixed(1)}m · {selectedMarina.vhfChannel}
            </span>
          </div>
          <div className="rounded-lg border border-sky-400/25 bg-[#040B16]/90 px-2.5 py-1 font-mono text-[11px] tabular-nums text-sky-200">
            Safety Contour: {safetyDraftM.toFixed(1)}m
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[430px] w-full overflow-hidden bg-[#040E1D] sm:h-[490px]">
      <svg
        ref={svgRef}
        viewBox={`${viewBoxState.x.toFixed(2)} ${viewBoxState.y.toFixed(2)} ${viewBoxState.w.toFixed(2)} ${viewBoxState.h.toFixed(2)}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className={`h-full w-full select-none ${
          addWaypointMode ? 'cursor-crosshair' : dragOrigin ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        role="img"
        aria-label="Interactive Nautical Chart"
      >
        <defs>
          <radialGradient id="nauticalOceanGrad" cx="50%" cy="48%" r="72%">
            <stop offset="0%" stopColor="#09213E" />
            <stop offset="100%" stopColor="#030B17" />
          </radialGradient>
          <pattern id="shoalPattern" width={4 * markerScale} height={4 * markerScale} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line
              x1="0"
              y1="0"
              x2="0"
              y2={4 * markerScale}
              stroke="rgba(245, 158, 11, 0.36)"
              strokeWidth={0.9 * markerScale}
            />
          </pattern>
        </defs>

        <rect x="0" y="0" width="1000" height="500" fill="url(#nauticalOceanGrad)" />

        {/* Graticule Lat/Lon Lines */}
        <g stroke="rgba(56, 189, 248, 0.1)" strokeWidth={0.5 * markerScale}>
          {Array.from({ length: 17 }, (_, i) => -80 + i * 10).map((lat) => {
            const y = ((90 - lat) / 180) * 500;
            return <line key={`g-lat-${lat}`} x1={0} y1={y} x2={1000} y2={y} />;
          })}
          {Array.from({ length: 35 }, (_, i) => -170 + i * 10).map((lon) => {
            const x = ((lon + 180) / 360) * 1000;
            return <line key={`g-lon-${lon}`} x1={x} y1={0} x2={x} y2={500} />;
          })}
        </g>

        {/* Fine 1-degree nautical grid when zoomed into regional charts */}
        {markerScale < 0.35 && (
          <g stroke="rgba(56, 189, 248, 0.08)" strokeWidth={0.35 * markerScale}>
            {Array.from({ length: 24 }, (_, i) => 28 + i).map((lat) => {
              const y = ((90 - lat) / 180) * 500;
              return <line key={`fg-lat-${lat}`} x1={0} y1={y} x2={1000} y2={y} />;
            })}
            {Array.from({ length: 50 }, (_, i) => -10 + i).map((lon) => {
              const x = ((lon + 180) / 360) * 1000;
              return <line key={`fg-lon-${lon}`} x1={x} y1={0} x2={x} y2={500} />;
            })}
          </g>
        )}

        {/* Bathymetric Safety Depth Contours */}
        {layers.depthContours && (
          <g>
            {[...contourPaths]
              .sort((a, b) => b.depthMeters - a.depthMeters)
              .map((band) => {
                const isShallowHazard = band.depthMeters <= safetyDraftM + 1.5;
                const fill = isShallowHazard
                  ? 'url(#shoalPattern)'
                  : band.depthMeters <= 20
                    ? 'rgba(14, 165, 233, 0.10)'
                    : band.depthMeters <= 50
                      ? 'rgba(14, 165, 233, 0.06)'
                      : 'rgba(15, 118, 110, 0.05)';
                const stroke = isShallowHazard
                  ? 'rgba(245, 158, 11, 0.68)'
                  : band.depthMeters <= 20
                    ? 'rgba(56, 189, 248, 0.38)'
                    : 'rgba(45, 212, 191, 0.25)';

                return (
                  <path
                    key={band.id}
                    d={band.path}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={(isShallowHazard ? 1.0 : 0.65) * markerScale}
                    strokeDasharray={band.depthMeters <= 10 ? `${2.2 * markerScale} ${1.4 * markerScale}` : undefined}
                  />
                );
              })}

            {markerScale < 0.35 &&
              DEPTH_SOUNDINGS.map((snd) => {
                const { x, y } = project(snd.lat, snd.lon);
                const shallow = snd.depthM <= safetyDraftM + 1.5;
                return (
                  <text
                    key={snd.id}
                    x={x}
                    y={y}
                    fill={shallow ? '#FBBF24' : 'rgba(148, 163, 184, 0.72)'}
                    fontSize={5.8 * markerScale}
                    fontFamily="JetBrains Mono, monospace"
                    textAnchor="middle"
                  >
                    {snd.depthM.toFixed(1)}
                  </text>
                );
              })}
          </g>
        )}

        {/* Coastlines & Landmasses */}
        <g>
          {continentPaths.map((d, idx) => (
            <path
              key={idx}
              d={d}
              fill="#152A45"
              stroke="rgba(125, 211, 252, 0.5)"
              strokeWidth={0.9 * markerScale}
              strokeLinejoin="round"
            />
          ))}
        </g>

        {/* Sea Currents & Tidal Streams */}
        {layers.currents &&
          SEA_CURRENTS.map((cur) => {
            const { x, y } = project(cur.lat, cur.lon);
            const isSelected = activeSelection.type === 'current' && activeSelection.item.id === cur.id;
            const len = 14 * markerScale;
            return (
              <g
                key={cur.id}
                transform={`translate(${x}, ${y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectObject({ type: 'current', item: cur });
                }}
                className="cursor-pointer"
              >
                <g transform={`rotate(${cur.directionDeg})`}>
                  <line
                    x1={0}
                    y1={len * 0.6}
                    x2={0}
                    y2={-len * 0.6}
                    stroke={isSelected ? '#FDE047' : '#2DD4BF'}
                    strokeWidth={1.6 * markerScale}
                  />
                  <polygon
                    points={`0,${-len * 0.85} ${-3 * markerScale},${-len * 0.35} ${3 * markerScale},${-len * 0.35}`}
                    fill={isSelected ? '#FDE047' : '#2DD4BF'}
                  />
                </g>
                {markerScale < 0.3 && (
                  <text
                    x={5 * markerScale}
                    y={2 * markerScale}
                    fill="#5EEAD4"
                    fontSize={5.5 * markerScale}
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {cur.speedKnots}kt
                  </text>
                )}
              </g>
            );
          })}

        {/* Pier-to-Pier Recommended Route Line */}
        {routeWaypoints.length >= 2 && (
          <g>
            {routeWaypoints.slice(0, -1).map((wp, idx) => {
              const next = routeWaypoints[idx + 1];
              const p1 = project(wp.lat, wp.lon);
              const p2 = project(next.lat, next.lon);
              return (
                <line
                  key={`${wp.id}-${next.id}`}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={hasShallowWarning ? '#F59E0B' : '#38BDF8'}
                  strokeWidth={2.0 * markerScale}
                  strokeDasharray={`${4.5 * markerScale} ${2.5 * markerScale}`}
                />
              );
            })}

            {routeWaypoints.map((wp, idx) => {
              const { x, y } = project(wp.lat, wp.lon);
              const isEndpoint = wp.kind === 'pier';
              return (
                <g key={wp.id}>
                  <circle
                    cx={x}
                    cy={y}
                    r={(isEndpoint ? 4.4 : 3.2) * markerScale}
                    fill={wp.kind === 'custom' ? '#F97316' : wp.kind === 'navaid' ? '#2DD4BF' : '#FBBF24'}
                    stroke="#040B16"
                    strokeWidth={1 * markerScale}
                  />
                  {!isEndpoint && markerScale < 0.45 && (
                    <text
                      x={x + 5 * markerScale}
                      y={y - 3 * markerScale}
                      fill="#CCFBF1"
                      fontSize={5.8 * markerScale}
                      fontFamily="JetBrains Mono, monospace"
                    >
                      WP{idx}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* Maritime Services Overlay */}
        {layers.services &&
          MARITIME_SERVICES.map((srv) => {
            const m = marinas.find((mar) => mar.id === srv.marinaId);
            if (!m) return null;
            const { x, y } = project(m.latitude - 0.04, m.longitude + 0.05);
            const isSelected = activeSelection.type === 'service' && activeSelection.item.id === srv.id;
            return (
              <g
                key={srv.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectObject({ type: 'service', item: srv, marina: m });
                }}
                className="cursor-pointer"
              >
                <rect
                  x={x - 3 * markerScale}
                  y={y - 3 * markerScale}
                  width={6 * markerScale}
                  height={6 * markerScale}
                  rx={1.2 * markerScale}
                  fill={isSelected ? '#A5B4FC' : '#6366F1'}
                  stroke="#040B16"
                  strokeWidth={0.8 * markerScale}
                />
              </g>
            );
          })}

        {/* Anchorages Overlay */}
        {layers.anchorages &&
          NAUTICAL_ANCHORAGES.map((anc) => {
            const { x, y } = project(anc.lat, anc.lon);
            const isSelected = activeSelection.type === 'anchorage' && activeSelection.item.id === anc.id;
            return (
              <g
                key={anc.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectObject({ type: 'anchorage', item: anc });
                }}
                className="cursor-pointer"
              >
                <circle
                  cx={x}
                  cy={y}
                  r={(isSelected ? 5.6 : 3.8) * markerScale}
                  fill={isSelected ? 'rgba(251, 191, 36, 0.35)' : 'rgba(251, 191, 36, 0.15)'}
                  stroke="#FBBF24"
                  strokeWidth={0.9 * markerScale}
                />
                <circle cx={x} cy={y} r={1.6 * markerScale} fill="#FDE68A" />
                {markerScale < 0.28 && (
                  <text
                    x={x + 5 * markerScale}
                    y={y + 2 * markerScale}
                    fill="#FDE68A"
                    fontSize={5.5 * markerScale}
                    fontFamily="DM Sans, sans-serif"
                  >
                    ⚓ {anc.name}
                  </text>
                )}
              </g>
            );
          })}

        {/* Navigation Aids / Lighthouses / Buoys */}
        {layers.navaids &&
          NAUTICAL_NAVAIDS.map((nav) => {
            const { x, y } = project(nav.lat, nav.lon);
            const isSelected = activeSelection.type === 'navaid' && activeSelection.item.id === nav.id;
            const color =
              nav.kind === 'danger'
                ? '#EF4444'
                : nav.kind === 'lateral_port'
                  ? '#F87171'
                  : nav.kind === 'lateral_starboard'
                    ? '#4ADE80'
                    : '#FACC15';
            const r = (isSelected ? 5.2 : 3.4) * markerScale;
            return (
              <g
                key={nav.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectObject({ type: 'navaid', item: nav });
                }}
                className="cursor-pointer"
              >
                {nav.kind === 'lighthouse' && (
                  <circle cx={x} cy={y} r={r * 2.2} fill="rgba(250, 204, 21, 0.14)" />
                )}
                <polygon
                  points={`${x},${y - r} ${x + r * 0.9},${y + r * 0.8} ${x - r * 0.9},${y + r * 0.8}`}
                  fill={color}
                  stroke="#040B16"
                  strokeWidth={0.8 * markerScale}
                />
                {markerScale < 0.24 && (
                  <text
                    x={x + 5 * markerScale}
                    y={y - 2 * markerScale}
                    fill="#FEF08A"
                    fontSize={5.2 * markerScale}
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {nav.name}
                  </text>
                )}
              </g>
            );
          })}

        {/* Weather Buoys Overlay */}
        {layers.buoys &&
          WEATHER_BUOYS.map((buoy) => {
            const { x, y } = project(buoy.lat, buoy.lon);
            const isSelected = activeSelection.type === 'buoy' && activeSelection.item.id === buoy.id;
            const s = (isSelected ? 5.4 : 3.8) * markerScale;
            return (
              <g
                key={buoy.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectObject({ type: 'buoy', item: buoy });
                }}
                className="cursor-pointer"
              >
                <polygon
                  points={`${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}`}
                  fill={isSelected ? '#22D3EE' : '#06B6D4'}
                  stroke="#040B16"
                  strokeWidth={0.9 * markerScale}
                />
                {markerScale < 0.36 && (
                  <text
                    x={x + 5.5 * markerScale}
                    y={y + 2 * markerScale}
                    fill="#67E8F9"
                    fontSize={5.3 * markerScale}
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {buoy.windKnots}kt · {buoy.waveHeightM}m
                  </text>
                )}
              </g>
            );
          })}

        {/* Marina / Pier Pins */}
        {marinas.map((m) => {
          const { x, y } = project(m.latitude, m.longitude);
          const isSelected = m.id === selectedMarina.id;
          const r = (isSelected ? 5.0 : 3.1) * markerScale;
          return (
            <g
              key={m.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectObject({ type: 'marina', item: m });
              }}
              className="cursor-pointer"
            >
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={isSelected ? '#F59E0B' : '#38BDF8'}
                stroke="#040B16"
                strokeWidth={0.9 * markerScale}
              />
              {(markerScale < 0.32 || isSelected) && (
                <text
                  x={x + 5 * markerScale}
                  y={y + 2 * markerScale}
                  fill={isSelected ? '#FDE68A' : '#E2E8F0'}
                  fontSize={6.2 * markerScale}
                  fontWeight={isSelected ? '700' : '500'}
                  fontFamily="DM Sans, sans-serif"
                >
                  {m.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Top Left Preset & Focus Controls */}
      <div className="absolute start-3 top-3 flex flex-wrap items-center gap-1.5 rounded-lg border border-sky-400/25 bg-[#040B16]/90 p-1">
        {(
          [
            ['turkey', 'Aegean & Turkey'],
            ['med', 'Mediterranean'],
            ['world', 'Global'],
          ] as [RegionPreset, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => applyPreset(key)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
              regionPreset === key
                ? 'bg-teal-500/25 text-teal-200'
                : 'text-slate-300 hover:bg-sky-500/10 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => focusOnMarina(selectedMarina)}
          className="flex items-center gap-1 rounded-md border border-amber-400/35 bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-200 hover:bg-amber-500/25 whitespace-nowrap"
          title="Center on selected port"
        >
          <LocateFixed className="h-3 w-3" />
          <span>{selectedMarina.city}</span>
        </button>
      </div>

      {/* Top Right Zoom Controls */}
      <div className="absolute end-3 top-3 flex items-center gap-1 rounded-lg border border-sky-400/25 bg-[#040B16]/90 p-1">
        <button
          type="button"
          onClick={() => zoomBy(0.7)}
          className="rounded-md p-1.5 text-slate-200 hover:bg-sky-500/20"
          aria-label="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1.4)}
          className="rounded-md p-1.5 text-slate-200 hover:bg-sky-500/20"
          aria-label="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => applyPreset(regionPreset)}
          className="rounded-md p-1.5 text-slate-200 hover:bg-sky-500/20"
          aria-label="Reset zoom"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom Legend Bar */}
      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-400/20 bg-[#040B16]/85 px-3 py-1.5 text-[11px] text-slate-300">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1">
            <Anchor className="h-3 w-3 text-amber-300" />
            <span>Anchorages</span>
          </span>
          <span className="flex items-center gap-1">
            <Compass className="h-3 w-3 text-yellow-300" />
            <span>Navaids / Lights</span>
          </span>
          <span className="flex items-center gap-1">
            <Crosshair className="h-3 w-3 text-cyan-300" />
            <span>Weather Buoys</span>
          </span>
          <span className="font-mono text-teal-300">→ Currents (kt)</span>
        </div>
        <span className="font-mono tabular-nums text-amber-300">
          Safety Contour: {safetyDraftM.toFixed(1)}m
        </span>
      </div>
    </div>
  );
};
