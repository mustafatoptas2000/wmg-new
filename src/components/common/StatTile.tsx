import React from 'react';

interface StatTileProps {
  label: string;
  value: string | number;
  unit?: string;
  detail?: string;
  accent?: 'default' | 'sky' | 'gold';
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  unit,
  detail,
  accent = 'default',
}) => {
  const valueColor =
    accent === 'gold'
      ? 'text-amber-300'
      : accent === 'sky'
        ? 'text-sky-300'
        : 'text-slate-50';

  return (
    <div className="rounded-lg border border-sky-400/15 bg-[#0A1628] px-4 py-3.5">
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div className={`mt-1.5 flex items-baseline gap-1.5 font-mono text-xl font-semibold tabular-nums sm:text-2xl ${valueColor}`}>
        <span>{value}</span>
        {unit && <span className="text-xs font-normal text-slate-400">{unit}</span>}
      </div>
      {detail && <div className="mt-1 truncate text-xs text-slate-400">{detail}</div>}
    </div>
  );
};
