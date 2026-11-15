import React from 'react';
import { Info, Globe } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface DemoDataNoticeProps {
  isDemonstration: boolean;
  sourceLabel: string;
  observedLabel: string;
  fallbackNote?: string;
}

export const DemoDataNotice: React.FC<DemoDataNoticeProps> = ({
  isDemonstration,
  sourceLabel,
  observedLabel,
  fallbackNote,
}) => {
  const { t } = useLanguage();

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${
        isDemonstration
          ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
          : 'border-sky-400/30 bg-sky-500/10 text-sky-100'
      }`}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 font-medium">
          {isDemonstration ? (
            <Info className="h-4 w-4 shrink-0 text-amber-300" />
          ) : (
            <Globe className="h-4 w-4 shrink-0 text-sky-300" />
          )}
          <span>{isDemonstration ? t.common.demoNoticeTitle : sourceLabel}</span>
        </div>
        <div className="font-mono text-xs tabular-nums opacity-85">
          {sourceLabel} · {observedLabel}
        </div>
      </div>
      {isDemonstration && (
        <p className="mt-1 text-xs leading-relaxed text-amber-100/85">{t.common.demoNoticeBody}</p>
      )}
      {fallbackNote && (
        <p className="mt-1 text-xs leading-relaxed text-amber-200">{fallbackNote}</p>
      )}
    </div>
  );
};
