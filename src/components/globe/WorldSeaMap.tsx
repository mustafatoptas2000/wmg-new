import React, { useMemo } from 'react';
import { SEA_BASIN_LABELS, WORLD_CONTINENT_POLYGONS } from '../../data/worldCoastlines';
import { Marina } from '../../types/maritime';

interface WorldSeaMapProps {
  marinas: Marina[];
  selectedMarina: Marina;
  onSelectMarina: (marina: Marina) => void;
  focusPreset: 'turkey' | 'med' | 'world';
}

export const WorldSeaMap: React.FC<WorldSeaMapProps> = ({
  marinas,
  selectedMarina,
  onSelectMarina,
  focusPreset,
}) => {
  // Equirectangular projection into 1000 x 500 SVG space
  const project = (lat: number, lon: number) => ({
    x: ((lon + 180) / 360) * 1000,
    y: ((90 - lat) / 180) * 500,
  });

  // Compute viewBox for regional zoom presets
  const viewBox = useMemo(() => {
    if (focusPreset === 'turkey') {
      // Lon 22..36, Lat 34..43 -> crisp Aegean & Eastern Med nautical chart
      const x1 = ((22 + 180) / 360) * 1000;
      const x2 = ((36 + 180) / 360) * 1000;
      const y1 = ((90 - 43) / 180) * 500;
      const y2 = ((90 - 34) / 180) * 500;
      return `${x1.toFixed(1)} ${y1.toFixed(1)} ${(x2 - x1).toFixed(1)} ${(y2 - y1).toFixed(1)}`;
    }
    if (focusPreset === 'med') {
      // Lon -8..38, Lat 29..47
      const x1 = ((-8 + 180) / 360) * 1000;
      const x2 = ((38 + 180) / 360) * 1000;
      const y1 = ((90 - 47) / 180) * 500;
      const y2 = ((90 - 29) / 180) * 500;
      return `${x1.toFixed(1)} ${y1.toFixed(1)} ${(x2 - x1).toFixed(1)} ${(y2 - y1).toFixed(1)}`;
    }
    return '0 0 1000 500';
  }, [focusPreset]);

  const markerScale = focusPreset === 'turkey' ? 0.14 : focusPreset === 'med' ? 0.34 : 1;

  const continentPaths = useMemo(() => {
    return WORLD_CONTINENT_POLYGONS.map((ring) => {
      return (
        ring
          .map(([lon, lat], idx) => {
            const { x, y } = project(lat, lon);
            return `${idx === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
          })
          .join(' ') + ' Z'
      );
    });
  }, []);

  const latLines = [-60, -30, 0, 30, 60];
  const lonLines = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#051122]">
      <svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full select-none"
        role="img"
        aria-label="World Sea Chart"
      >
        <defs>
          <radialGradient id="oceanGlow" cx="50%" cy="48%" r="65%">
            <stop offset="0%" stopColor="#0B2444" />
            <stop offset="100%" stopColor="#040D1B" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="1000" height="500" fill="url(#oceanGlow)" />

        {/* Graticule Lat/Lon Lines */}
        <g stroke="rgba(56, 189, 248, 0.12)" strokeWidth={0.7 * markerScale}>
          {latLines.map((lat) => {
            const y = ((90 - lat) / 180) * 500;
            return <line key={`lat-${lat}`} x1={0} y1={y} x2={1000} y2={y} />;
          })}
          {lonLines.map((lon) => {
            const x = ((lon + 180) / 360) * 1000;
            return <line key={`lon-${lon}`} x1={x} y1={0} x2={x} y2={500} />;
          })}
        </g>

        {/* Fine Aegean/Med Chart Grid when zoomed */}
        {focusPreset !== 'world' && (
          <g stroke="rgba(56, 189, 248, 0.08)" strokeWidth={0.4 * markerScale}>
            {Array.from({ length: 36 }, (_, i) => 20 + i).map((lat) => {
              const y = ((90 - lat) / 180) * 500;
              return <line key={`fine-lat-${lat}`} x1={0} y1={y} x2={1000} y2={y} />;
            })}
            {Array.from({ length: 50 }, (_, i) => -10 + i).map((lon) => {
              const x = ((lon + 180) / 360) * 1000;
              return <line key={`fine-lon-${lon}`} x1={x} y1={0} x2={x} y2={500} />;
            })}
          </g>
        )}

        {/* Equator */}
        <line
          x1={0}
          y1={250}
          x2={1000}
          y2={250}
          stroke="rgba(217, 164, 65, 0.25)"
          strokeWidth={0.8 * markerScale}
          strokeDasharray={`${3 * markerScale} ${3 * markerScale}`}
        />

        {/* Continents */}
        <g>
          {continentPaths.map((d, idx) => (
            <path
              key={idx}
              d={d}
              fill="#122744"
              stroke="rgba(125, 211, 252, 0.42)"
              strokeWidth={0.9 * markerScale}
              strokeLinejoin="round"
            />
          ))}
        </g>

        {/* Sea Basin Labels */}
        <g fill="rgba(125, 211, 252, 0.35)" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="600">
          {SEA_BASIN_LABELS.map((basin) => {
            const { x, y } = project(basin.lat, basin.lon);
            return (
              <text
                key={basin.name}
                x={x}
                y={y}
                fontSize={7.5 * markerScale}
                textAnchor="middle"
                letterSpacing={1.4 * markerScale}
              >
                {basin.name}
              </text>
            );
          })}
        </g>

        {/* Interactive Marina Pins */}
        {marinas.map((marina) => {
          const { x, y } = project(marina.latitude, marina.longitude);
          const isSelected = marina.id === selectedMarina.id;
          const r = (isSelected ? 5.2 : 3.4) * markerScale;

          return (
            <g
              key={marina.id}
              onClick={() => onSelectMarina(marina)}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`${marina.name}, ${marina.city}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectMarina(marina);
                }
              }}
            >
              <circle
                cx={x}
                cy={y}
                r={r * 2.4}
                fill={isSelected ? 'rgba(217, 164, 65, 0.18)' : 'rgba(14, 165, 233, 0.14)'}
              />
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={isSelected ? '#D9A441' : '#38BDF8'}
                stroke="#040B16"
                strokeWidth={1.1 * markerScale}
              />
              {(focusPreset !== 'world' || isSelected) && (
                <text
                  x={x + 6 * markerScale}
                  y={y + 2.5 * markerScale}
                  fill={isSelected ? '#FDE68A' : '#E2E8F0'}
                  fontSize={7.2 * markerScale}
                  fontFamily="DM Sans, sans-serif"
                  fontWeight={isSelected ? '700' : '500'}
                >
                  {focusPreset === 'turkey' ? marina.name : marina.city}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
