import React from 'react';
import {
  Anchor,
  CloudSun,
  Compass,
  FileText,
  Globe2,
  Map,
  Ship,
  Wrench,
} from 'lucide-react';
import { TranslationDictionary } from '../i18n/translations';
import { NavigationSection } from '../types/maritime';

export type NavTranslationKey = keyof TranslationDictionary['nav'];

export interface MenuColorTheme {
  cardIdle: string;
  cardActive: string;
  homeCard: string;
  iconBoxIdle: string;
  iconBoxActive: string;
  iconMobileIdle: string;
  iconMobileActive: string;
  codeText: string;
  titleText: string;
}

export interface MenuTemplateItem {
  id: NavigationSection;
  code: string;
  labelKey: NavTranslationKey;
  group: 'command' | 'operations' | 'reference';
  icon: React.ComponentType<{ className?: string }>;
  theme: MenuColorTheme;
}

export const NAVIGATION_MENU_TEMPLATE: MenuTemplateItem[] = [
  {
    id: NavigationSection.HOME,
    code: '01',
    labelKey: 'home',
    group: 'command',
    icon: Globe2,
    theme: {
      cardIdle: 'border-sky-400/25 bg-[#0A182D] hover:border-sky-400/60 hover:bg-[#0D213D]',
      cardActive: 'border-sky-400/80 bg-[#0F2747] ring-1 ring-sky-400/30',
      homeCard: 'border-sky-400/40 bg-gradient-to-br from-sky-500/15 via-[#0A182E] to-[#071121] hover:border-sky-300/80 hover:from-sky-500/25',
      iconBoxIdle: 'border-sky-400/40 bg-sky-500/15 text-sky-300',
      iconBoxActive: 'border-sky-300/75 bg-sky-400/25 text-sky-200',
      iconMobileIdle: 'text-sky-400',
      iconMobileActive: 'text-sky-300',
      codeText: 'text-sky-300',
      titleText: 'text-sky-100',
    },
  },
  {
    id: NavigationSection.NAUTICAL_CHART,
    code: '02',
    labelKey: 'chart',
    group: 'command',
    icon: Map,
    theme: {
      cardIdle: 'border-teal-400/25 bg-[#0A1C2C] hover:border-teal-400/60 hover:bg-[#0C263B]',
      cardActive: 'border-teal-400/80 bg-[#0E2E44] ring-1 ring-teal-400/30',
      homeCard: 'border-teal-400/40 bg-gradient-to-br from-teal-500/15 via-[#0A1C2D] to-[#071121] hover:border-teal-300/80 hover:from-teal-500/25',
      iconBoxIdle: 'border-teal-400/40 bg-teal-500/15 text-teal-300',
      iconBoxActive: 'border-teal-300/75 bg-teal-400/25 text-teal-200',
      iconMobileIdle: 'text-teal-400',
      iconMobileActive: 'text-teal-300',
      codeText: 'text-teal-300',
      titleText: 'text-teal-100',
    },
  },
  {
    id: NavigationSection.WEATHER,
    code: '03',
    labelKey: 'weather',
    group: 'command',
    icon: CloudSun,
    theme: {
      cardIdle: 'border-cyan-400/25 bg-[#0A192D] hover:border-cyan-400/60 hover:bg-[#0D233D]',
      cardActive: 'border-cyan-400/80 bg-[#0F2947] ring-1 ring-cyan-400/30',
      homeCard: 'border-cyan-400/40 bg-gradient-to-br from-cyan-500/15 via-[#0A192E] to-[#071121] hover:border-cyan-300/80 hover:from-cyan-500/25',
      iconBoxIdle: 'border-cyan-400/40 bg-cyan-500/15 text-cyan-300',
      iconBoxActive: 'border-cyan-300/75 bg-cyan-400/25 text-cyan-200',
      iconMobileIdle: 'text-cyan-400',
      iconMobileActive: 'text-cyan-300',
      codeText: 'text-cyan-300',
      titleText: 'text-cyan-100',
    },
  },
  {
    id: NavigationSection.MARINAS,
    code: '04',
    labelKey: 'marinas',
    group: 'operations',
    icon: Anchor,
    theme: {
      cardIdle: 'border-amber-400/25 bg-[#12192A] hover:border-amber-400/60 hover:bg-[#192238]',
      cardActive: 'border-amber-400/80 bg-[#1D273F] ring-1 ring-amber-400/30',
      homeCard: 'border-amber-400/40 bg-gradient-to-br from-amber-500/15 via-[#11192A] to-[#071121] hover:border-amber-300/80 hover:from-amber-500/25',
      iconBoxIdle: 'border-amber-400/40 bg-amber-500/15 text-amber-300',
      iconBoxActive: 'border-amber-300/75 bg-amber-400/25 text-amber-200',
      iconMobileIdle: 'text-amber-400',
      iconMobileActive: 'text-amber-300',
      codeText: 'text-amber-300',
      titleText: 'text-amber-100',
    },
  },
  {
    id: NavigationSection.FLEET,
    code: '05',
    labelKey: 'fleet',
    group: 'operations',
    icon: Ship,
    theme: {
      cardIdle: 'border-emerald-400/25 bg-[#0A1B2A] hover:border-emerald-400/60 hover:bg-[#0D2537]',
      cardActive: 'border-emerald-400/80 bg-[#0F2C3F] ring-1 ring-emerald-400/30',
      homeCard: 'border-emerald-400/40 bg-gradient-to-br from-emerald-500/15 via-[#0A1C2B] to-[#071121] hover:border-emerald-300/80 hover:from-emerald-500/25',
      iconBoxIdle: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300',
      iconBoxActive: 'border-emerald-300/75 bg-emerald-400/25 text-emerald-200',
      iconMobileIdle: 'text-emerald-400',
      iconMobileActive: 'text-emerald-300',
      codeText: 'text-emerald-300',
      titleText: 'text-emerald-100',
    },
  },
  {
    id: NavigationSection.SERVICES,
    code: '06',
    labelKey: 'services',
    group: 'operations',
    icon: Wrench,
    theme: {
      cardIdle: 'border-indigo-400/25 bg-[#0D1730] hover:border-indigo-400/60 hover:bg-[#121F40]',
      cardActive: 'border-indigo-400/80 bg-[#16254A] ring-1 ring-indigo-400/30',
      homeCard: 'border-indigo-400/40 bg-gradient-to-br from-indigo-500/15 via-[#0D1730] to-[#071121] hover:border-indigo-300/80 hover:from-indigo-500/25',
      iconBoxIdle: 'border-indigo-400/40 bg-indigo-500/15 text-indigo-300',
      iconBoxActive: 'border-indigo-300/75 bg-indigo-400/25 text-indigo-200',
      iconMobileIdle: 'text-indigo-400',
      iconMobileActive: 'text-indigo-300',
      codeText: 'text-indigo-300',
      titleText: 'text-indigo-100',
    },
  },
  {
    id: NavigationSection.TOOLS,
    code: '07',
    labelKey: 'tools',
    group: 'reference',
    icon: Compass,
    theme: {
      cardIdle: 'border-orange-400/25 bg-[#14182A] hover:border-orange-400/60 hover:bg-[#1C2137]',
      cardActive: 'border-orange-400/80 bg-[#22273E] ring-1 ring-orange-400/30',
      homeCard: 'border-orange-400/40 bg-gradient-to-br from-orange-500/15 via-[#13182A] to-[#071121] hover:border-orange-300/80 hover:from-orange-500/25',
      iconBoxIdle: 'border-orange-400/40 bg-orange-500/15 text-orange-300',
      iconBoxActive: 'border-orange-300/75 bg-orange-400/25 text-orange-200',
      iconMobileIdle: 'text-orange-400',
      iconMobileActive: 'text-orange-300',
      codeText: 'text-orange-300',
      titleText: 'text-orange-100',
    },
  },
  {
    id: NavigationSection.DOCUMENTS,
    code: '08',
    labelKey: 'documents',
    group: 'reference',
    icon: FileText,
    theme: {
      cardIdle: 'border-rose-400/25 bg-[#13162B] hover:border-rose-400/60 hover:bg-[#1A1D38]',
      cardActive: 'border-rose-400/80 bg-[#212341] ring-1 ring-rose-400/30',
      homeCard: 'border-rose-400/40 bg-gradient-to-br from-rose-500/15 via-[#13162B] to-[#071121] hover:border-rose-300/80 hover:from-rose-500/25',
      iconBoxIdle: 'border-rose-400/40 bg-rose-500/15 text-rose-300',
      iconBoxActive: 'border-rose-300/75 bg-rose-400/25 text-rose-200',
      iconMobileIdle: 'text-rose-400',
      iconMobileActive: 'text-rose-300',
      codeText: 'text-rose-300',
      titleText: 'text-rose-100',
    },
  },
];
