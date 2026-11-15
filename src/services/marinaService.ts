import { WORLD_MARINAS } from '../data/marinas';
import { Marina } from '../types/maritime';
import { formatCoordinateFormats } from './navigationCalcService';

const CUSTOM_MARINAS_STORAGE_KEY = 'wmg_custom_marinas_v1';

export interface MarinaFilterOptions {
  query?: string;
  country?: string;
  region?: string;
  city?: string;
  regionGroup?: 'all' | 'turkey' | 'europe';
  portOfEntryOnly?: boolean;
}

class MarinaRegistryService {
  private marinas: Marina[] = [];

  constructor() {
    this.marinas = [...WORLD_MARINAS, ...this.loadCustomMarinas()];
  }

  private loadCustomMarinas(): Marina[] {
    try {
      const raw = window.localStorage.getItem(CUSTOM_MARINAS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Marina[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveCustomMarinas(customMarinas: Marina[]): void {
    try {
      window.localStorage.setItem(CUSTOM_MARINAS_STORAGE_KEY, JSON.stringify(customMarinas));
    } catch {
      // Ignore storage quota restrictions
    }
  }

  getAll(): Marina[] {
    return this.marinas;
  }

  getById(id: string): Marina | undefined {
    return this.marinas.find((m) => m.id === id);
  }

  getCountries(): string[] {
    return Array.from(new Set(this.marinas.map((m) => m.country)));
  }

  getTurkishHubCities(): string[] {
    return ['Bodrum', 'Marmaris', 'Fethiye', 'Antalya', 'Izmir', 'Didim', 'Istanbul'];
  }

  getRegions(country?: string): string[] {
    const filtered =
      country && country !== 'all'
        ? this.marinas.filter((m) => m.country === country)
        : this.marinas;
    return Array.from(new Set(filtered.map((m) => m.region)));
  }

  isEuropeanMarina(marina: Marina): boolean {
    return marina.region.startsWith('Europe');
  }

  search(options: MarinaFilterOptions): Marina[] {
    const q = (options.query || '').trim().toLowerCase();

    return this.marinas.filter((marina) => {
      if (options.regionGroup === 'turkey' && marina.countryCode !== 'TR') {
        return false;
      }
      if (options.regionGroup === 'europe' && !this.isEuropeanMarina(marina)) {
        return false;
      }
      if (options.country && options.country !== 'all' && marina.country !== options.country) {
        return false;
      }
      if (options.region && options.region !== 'all' && marina.region !== options.region) {
        return false;
      }
      if (options.city && options.city !== 'all' && marina.city !== options.city) {
        return false;
      }
      if (options.portOfEntryOnly && !marina.portOfEntry) {
        return false;
      }
      if (!q) return true;

      const searchable = [
        marina.name,
        marina.country,
        marina.region,
        marina.city,
        marina.seaBasin,
        marina.coordinates,
        marina.latitude.toFixed(4),
        marina.longitude.toFixed(4),
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(q);
    });
  }

  registerMarina(input: {
    name: string;
    country: string;
    countryCode?: string;
    region: string;
    city: string;
    seaBasin: string;
    latitude: number;
    longitude: number;
    vhfChannel?: string;
    maxLoaMeters?: number;
    maxDraftMeters?: number;
    berths?: number;
    portOfEntry?: boolean;
    summary?: string;
  }): Marina {
    const coords = formatCoordinateFormats(input.latitude, input.longitude);
    const newMarina: Marina = {
      id: `custom-${Date.now().toString(36)}`,
      name: input.name.trim(),
      country: input.country.trim(),
      countryCode: (input.countryCode || input.country.slice(0, 2)).toUpperCase(),
      region: input.region.trim(),
      city: input.city.trim(),
      seaBasin: input.seaBasin.trim() || 'Open Sea',
      latitude: Number(input.latitude.toFixed(4)),
      longitude: Number(input.longitude.toFixed(4)),
      coordinates: coords.dms,
      vhfChannel: input.vhfChannel?.trim() || 'Ch 16 / Ch 72',
      maxLoaMeters: input.maxLoaMeters || 60,
      maxDraftMeters: input.maxDraftMeters || 5.0,
      berths: input.berths || 200,
      portOfEntry: Boolean(input.portOfEntry),
      amenities: ['Shore Power', 'Freshwater', 'Mooring Assistance'],
      summary:
        input.summary?.trim() ||
        `Registered marina facility in ${input.city}, ${input.country}.`,
    };

    this.marinas = [...this.marinas, newMarina];
    const customOnly = this.marinas.filter((m) => m.id.startsWith('custom-'));
    this.saveCustomMarinas(customOnly);
    return newMarina;
  }
}

export const marinaService = new MarinaRegistryService();
