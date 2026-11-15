import { INITIAL_FLEET } from '../data/fleet';
import { Vessel, VesselStatus } from '../types/maritime';

const STORAGE_KEY = 'wmg_fleet_registry_v1';

export function loadFleet(): Vessel[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_FLEET;
    const parsed = JSON.parse(raw) as Vessel[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_FLEET;
  } catch {
    return INITIAL_FLEET;
  }
}

export function saveFleet(vessels: Vessel[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vessels));
  } catch {
    // Ignore storage quota errors in restricted sandboxes
  }
}

export function createVesselRecord(
  input: Omit<Vessel, 'id'>,
): Vessel {
  return {
    ...input,
    id: `vsl-${Date.now().toString(36)}`,
  };
}

export function cycleVesselStatus(current: VesselStatus): VesselStatus {
  const order: VesselStatus[] = [
    VesselStatus.MOORED,
    VesselStatus.UNDERWAY,
    VesselStatus.ANCHORED,
    VesselStatus.MAINTENANCE,
  ];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}
