import React from 'react';
import { Languages } from 'lucide-react';
import { NAVIGATION_MENU_TEMPLATE } from '../../data/navigationMenuTemplate';
import { useLanguage } from '../../i18n/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../../i18n/translations';
import { LanguageCode, Marina, NavigationSection } from '../../types/maritime';
import { NavigationMenuTemplate } from './NavigationMenuTemplate';

interface AppShellProps {
  activeSection: NavigationSection;
  onNavigate: (section: NavigationSection) => void;
  marinas: Marina[];
  selectedMarina: Marina;
  onSelectMarina: (marina: Marina) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeSection,
  onNavigate,
  marinas,
  selectedMarina,
  onSelectMarina,
  children,
}) => {
  const { language, setLanguage, t } = useLanguage();

  const activeTemplateItem = NAVIGATION_MENU_TEMPLATE.find((item) => item.id === activeSection);
  const activeNavLabel = activeTemplateItem ? t.nav[activeTemplateItem.labelKey] : t.nav.home;

  return (
    <div className="min-h-screen bg-[#040B16] text-slate-100 lg:flex">
      {/* Desktop Left Navigation Rail */}
      <aside className="hidden lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:border-e lg:border-sky-400/15 lg:bg-[#071121]">
        <div className="flex h-16 items-center border-b border-sky-400/15 px-4">
          <button
            type="button"
            onClick={() => onNavigate(NavigationSection.HOME)}
            className="w-full rounded-lg border border-sky-400/25 bg-[#0A1628] px-3 py-2 text-center font-display text-sm font-bold tracking-wider text-slate-50 whitespace-nowrap transition-colors hover:border-sky-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            {t.brandName}
          </button>
        </div>

        <NavigationMenuTemplate
          variant="sidebar"
          activeSection={activeSection}
          onNavigate={onNavigate}
        />

        {/* Active Station Context in Sidebar Footer */}
        <div className="border-t border-sky-400/15 p-4">
          <label htmlFor="sidebar-marina-select" className="block text-xs font-medium text-slate-400">
            {t.home.selectedStation}
          </label>
          <select
            id="sidebar-marina-select"
            value={selectedMarina.id}
            onChange={(e) => {
              const found = marinas.find((m) => m.id === e.target.value);
              if (found) onSelectMarina(found);
            }}
            className="mt-1.5 w-full rounded-md border border-sky-400/20 bg-[#0A1628] px-2.5 py-2 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
          >
            {marinas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.city} — {m.name}
              </option>
            ))}
          </select>
          <div className="mt-2 font-mono text-[11px] tabular-nums text-slate-400">
            {selectedMarina.latitude.toFixed(4)}°, {selectedMarina.longitude.toFixed(4)}°
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        {/* Top Header Bar (3-zone contract: Title/Breadcrumb — Marina Switch — Language Switch) */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-sky-400/15 bg-[#040B16]/95 px-4 sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="font-display text-sm font-bold tracking-wider text-slate-50 whitespace-nowrap lg:hidden">
              {t.brandName}
            </span>
            <span className="hidden text-sm font-medium text-slate-300 lg:inline whitespace-nowrap">
              {t.brandName}
            </span>
            <span className="hidden text-slate-600 lg:inline" aria-hidden="true">
              /
            </span>
            <span className="hidden truncate text-sm font-medium text-sky-300 lg:inline">
              {activeNavLabel}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300">
              <span className="text-slate-400">{selectedMarina.city}</span>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-slate-100 max-w-[160px] truncate">{selectedMarina.name}</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-sky-400/20 bg-[#0A1628] px-2.5 py-1.5">
              <Languages className="h-3.5 w-3.5 text-sky-400 shrink-0" />
              <select
                aria-label="Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="bg-transparent text-xs font-medium text-slate-100 focus:outline-none"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-[#0A1628] text-slate-100">
                    {lang.shortCode} — {lang.nativeLabel}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      <NavigationMenuTemplate
        variant="mobile"
        activeSection={activeSection}
        onNavigate={onNavigate}
      />
    </div>
  );
};
