import React from 'react';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { MenuTemplateItem, NAVIGATION_MENU_TEMPLATE } from '../../data/navigationMenuTemplate';
import { useLanguage } from '../../i18n/LanguageContext';
import { NavigationSection } from '../../types/maritime';

interface NavigationMenuTemplateProps {
  activeSection: NavigationSection;
  onNavigate: (section: NavigationSection) => void;
  variant: 'sidebar' | 'mobile' | 'homeGrid';
  items?: MenuTemplateItem[];
}

export const NavigationMenuTemplate: React.FC<NavigationMenuTemplateProps> = ({
  activeSection,
  onNavigate,
  variant,
  items = NAVIGATION_MENU_TEMPLATE,
}) => {
  const { t } = useLanguage();

  if (variant === 'homeGrid') {
    return (
      <section aria-label={t.home.quickMenuTitle} className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              {t.home.quickMenuTitle}
            </h2>
            <p className="text-xs text-slate-400">{t.home.quickMenuSubtitle}</p>
          </div>
          <span className="font-mono text-[11px] tabular-nums text-sky-300/80">
            {items.length} MODULES
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const label = t.nav[item.labelKey];
            const hint = t.navHints[item.labelKey];

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`group flex flex-col justify-between rounded-xl border p-4 text-start transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  isActive ? item.theme.cardActive : item.theme.homeCard
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-transform group-hover:scale-105 ${
                      isActive ? item.theme.iconBoxActive : item.theme.iconBoxIdle
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-mono text-xs font-semibold tabular-nums ${item.theme.codeText}`}>
                      {item.code}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-100" />
                  </div>
                </div>

                <div className="mt-3.5">
                  <div className={`font-display text-sm font-semibold ${item.theme.titleText}`}>
                    {label}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-300/90">
                    {hint}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  if (variant === 'mobile') {
    return (
      <nav
        aria-label="Mobile Navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-sky-400/20 bg-[#071121]/95 px-2 py-2 lg:hidden"
      >
        <div className="flex items-center justify-between gap-1.5 overflow-x-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const label = t.nav[item.labelKey];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`flex min-h-[48px] min-w-[76px] flex-1 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-medium transition-colors whitespace-nowrap ${
                  isActive ? item.theme.cardActive : item.theme.cardIdle
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? item.theme.iconMobileActive : item.theme.iconMobileIdle
                  }`}
                />
                <span className={`max-w-[78px] truncate ${isActive ? item.theme.titleText : 'text-slate-200'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex-1 overflow-y-auto px-3.5 py-4" aria-label="Primary Navigation">
      <div className="space-y-2 rounded-xl border border-sky-400/20 bg-[#040B16]/75 p-2.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const label = t.nav[item.labelKey];
          const hint = t.navHints[item.labelKey];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`group flex w-full items-center justify-between gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                isActive ? item.theme.cardActive : item.theme.cardIdle
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                    isActive ? item.theme.iconBoxActive : item.theme.iconBoxIdle
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 text-start">
                  <div className={`truncate text-sm font-semibold ${isActive ? item.theme.titleText : 'text-slate-100'}`}>
                    {label}
                  </div>
                  <div className="truncate text-[11px] font-normal text-slate-400">
                    {hint}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <span className={`font-mono text-[10px] font-semibold tabular-nums ${item.theme.codeText}`}>
                  {item.code}
                </span>
                <ChevronRight
                  className={`h-3.5 w-3.5 transition-transform ${
                    isActive ? `${item.theme.codeText} translate-x-0.5` : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
