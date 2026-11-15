import React from 'react';

interface CoordinateDisplayProps {
  latitude: number;
  longitude: number;
  dms?: string;
  compact?: boolean;
}

export const CoordinateDisplay: React.FC<CoordinateDisplayProps> = ({
  latitude,
  longitude,
  dms,
  compact = false,
}) => {
  const latStr = `${Math.abs(latitude).toFixed(4)}° ${latitude >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(longitude).toFixed(4)}° ${longitude >= 0 ? 'E' : 'W'}`;

  if (compact) {
    return (
      <span className="font-mono text-xs tabular-nums text-sky-300">
        {latStr} · {lonStr}
      </span>
    );
  }

  return (
    <div className="font-mono text-xs tabular-nums">
      <div className="text-sky-300">
        {latStr} / {lonStr}
      </div>
      {dms && <div className="mt-0.5 text-slate-400">{dms}</div>}
    </div>
  );
};
