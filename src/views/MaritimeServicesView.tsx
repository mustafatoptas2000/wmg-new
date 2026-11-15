import React, { useMemo, useState } from 'react';
import { MARITIME_SERVICES } from '../data/services';
import { SectionHeader } from '../components/common/SectionHeader';
import { useLanguage } from '../i18n/LanguageContext';
import { Marina, ServiceCategory } from '../types/maritime';

interface MaritimeServicesViewProps {
  marinas: Marina[];
  selectedMarina: Marina;
}

export const MaritimeServicesView: React.FC<MaritimeServicesViewProps> = ({
  marinas,
  selectedMarina,
}) => {
  const { t } = useLanguage();
  const [category, setCategory] = useState<'all' | ServiceCategory>('all');
  const [marinaFilter, setMarinaFilter] = useState<string>('all');

  const filteredServices = useMemo(() => {
    return MARITIME_SERVICES.filter((srv) => {
      if (category !== 'all' && srv.category !== category) return false;
      if (marinaFilter !== 'all' && srv.marinaId !== marinaFilter) return false;
      return true;
    });
  }, [category, marinaFilter]);

  const categories: ('all' | ServiceCategory)[] = [
    'all',
    'berthing',
    'bunkering',
    'customs',
    'shipyard',
    'provisioning',
    'safety',
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title={t.services.title} subtitle={t.services.subtitle} />

      {/* Category & Marina Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-sky-400/20 bg-[#0A1628] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#040B16] p-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                category === cat
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.services.categories[cat]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label={t.common.selectMarina}
            value={marinaFilter}
            onChange={(e) => setMarinaFilter(e.target.value)}
            className="rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
          >
            <option value="all">{t.common.all} — {t.nav.marinas}</option>
            <option value={selectedMarina.id}>
              {selectedMarina.city} — {selectedMarina.name}
            </option>
            {marinas
              .filter((m) => m.id !== selectedMarina.id)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.city} — {m.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Services & Port Info Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredServices.map((srv) => {
          const marina = marinas.find((m) => m.id === srv.marinaId);
          return (
            <div
              key={srv.id}
              className="flex flex-col justify-between rounded-xl border border-sky-400/20 bg-[#0A1628] p-5"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-sky-300">
                  <span>
                    {t.services.categories[srv.category]}
                    {marina ? ` · ${marina.city} (${marina.name})` : ''}
                  </span>
                  <span className="font-mono text-amber-300">{srv.vhfOrContact}</span>
                </div>
                <h2 className="mt-1.5 font-display text-lg font-semibold text-slate-50">
                  {srv.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{srv.specifications}</p>
              </div>

              <div className="mt-4 space-y-2 border-t border-sky-400/15 pt-3.5 text-xs">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-slate-400">{t.services.provider}:</span>
                  <span className="font-medium text-slate-200">{srv.provider}</span>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-slate-400">{t.services.availability}:</span>
                  <span className="font-mono text-slate-200">{srv.availability}</span>
                </div>
                <div className="rounded-lg bg-[#040B16] px-3 py-2 text-slate-300">
                  <span className="font-medium text-sky-300">{t.services.portApproach}: </span>
                  {srv.portInfo}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
