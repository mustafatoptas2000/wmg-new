import React, { useMemo, useState } from 'react';
import { Plus, RefreshCw, Search, X } from 'lucide-react';
import { SectionHeader } from '../components/common/SectionHeader';
import { useLanguage } from '../i18n/LanguageContext';
import { createVesselRecord, cycleVesselStatus } from '../services/fleetService';
import { Marina, Vessel, VesselStatus } from '../types/maritime';

interface FleetVesselsViewProps {
  vessels: Vessel[];
  marinas: Marina[];
  onAddVessel: (vessel: Vessel) => void;
  onUpdateVessel: (vessel: Vessel) => void;
}

export const FleetVesselsView: React.FC<FleetVesselsViewProps> = ({
  vessels,
  marinas,
  onAddVessel,
  onUpdateVessel,
}) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Add Vessel form state
  const [name, setName] = useState('');
  const [imo, setImo] = useState('');
  const [mmsi, setMmsi] = useState('');
  const [flag, setFlag] = useState('Turkey');
  const [vesselType, setVesselType] = useState('Motor Yacht');
  const [loaMeters, setLoaMeters] = useState('34.5');
  const [beamMeters, setBeamMeters] = useState('7.4');
  const [draftMeters, setDraftMeters] = useState('2.6');
  const [assignedMarinaId, setAssignedMarinaId] = useState(marinas[0]?.id ?? '');
  const [captain, setCaptain] = useState('');
  const [crewCount, setCrewCount] = useState('5');

  const filteredVessels = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vessels.filter((v) => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      if (!q) return true;
      return [v.name, v.imo, v.mmsi, v.flag, v.homePort, v.captain, v.vesselType]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [vessels, query, statusFilter]);

  const statusColorClass = (status: VesselStatus) => {
    switch (status) {
      case VesselStatus.MOORED:
        return 'text-sky-300';
      case VesselStatus.UNDERWAY:
        return 'text-emerald-400';
      case VesselStatus.ANCHORED:
        return 'text-amber-300';
      case VesselStatus.MAINTENANCE:
        return 'text-rose-400';
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const marina = marinas.find((m) => m.id === assignedMarinaId) ?? marinas[0];
    const newVessel = createVesselRecord({
      name: name.trim().toUpperCase(),
      imo: imo.trim() || '9900000',
      mmsi: mmsi.trim() || '271000000',
      callSign: 'TCWMG',
      flag: flag.trim() || 'Turkey',
      vesselType: vesselType.trim() || 'Motor Yacht',
      loaMeters: Number(loaMeters) || 30,
      beamMeters: Number(beamMeters) || 7,
      draftMeters: Number(draftMeters) || 2.5,
      homePort: marina?.city ?? 'Bodrum',
      assignedMarinaId: marina?.id ?? '',
      status: VesselStatus.MOORED,
      captain: captain.trim() || 'Capt. Assigned',
      crewCount: Number(crewCount) || 4,
      lastPositionLat: marina?.latitude ?? 37.1058,
      lastPositionLon: marina?.longitude ?? 27.2836,
    });
    onAddVessel(newVessel);
    setName('');
    setImo('');
    setMmsi('');
    setCaptain('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t.fleet.title}
        subtitle={t.fleet.subtitle}
        action={
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>{t.fleet.registerVessel}</span>
          </button>
        }
      />

      {/* Search & Status Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-sky-400/20 bg-[#0A1628] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${t.common.search}...`}
            className="w-full rounded-lg border border-sky-400/20 bg-[#040B16] py-2 pe-4 ps-9 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#040B16] p-1">
          {(['all', VesselStatus.MOORED, VesselStatus.UNDERWAY, VesselStatus.ANCHORED, VesselStatus.MAINTENANCE] as const).map(
            (st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-sky-500/20 text-sky-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'all' ? t.common.all : t.fleet.statuses[st]}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Fleet Registry Table */}
      <div className="overflow-x-auto rounded-xl border border-sky-400/20 bg-[#0A1628]">
        <table className="w-full border-collapse text-start text-sm">
          <thead>
            <tr className="border-b border-sky-400/15 bg-[#071121] text-xs font-medium text-slate-400">
              <th className="px-4 py-3 text-start">{t.fleet.vesselName}</th>
              <th className="px-4 py-3 text-start">{t.fleet.imoMmsi}</th>
              <th className="px-4 py-3 text-start">{t.fleet.flag}</th>
              <th className="px-4 py-3 text-start">{t.fleet.dimensions}</th>
              <th className="px-4 py-3 text-start">{t.fleet.homePort}</th>
              <th className="px-4 py-3 text-start">{t.fleet.captain}</th>
              <th className="px-4 py-3 text-start">{t.fleet.status}</th>
              <th className="px-4 py-3 text-end">{t.fleet.cycleStatus}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-400/10">
            {filteredVessels.map((vessel) => {
              const assignedMarina = marinas.find((m) => m.id === vessel.assignedMarinaId);
              return (
                <tr key={vessel.id} className="hover:bg-slate-800/35">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-100">{vessel.name}</div>
                    <div className="text-xs text-slate-400">{vessel.vesselType}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-300">
                    <div>IMO {vessel.imo}</div>
                    <div className="text-slate-400">MMSI {vessel.mmsi}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-200">{vessel.flag}</td>
                  <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-300 whitespace-nowrap">
                    {vessel.loaMeters}m · {vessel.beamMeters}m · {vessel.draftMeters}m
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-200">{vessel.homePort}</div>
                    {assignedMarina && (
                      <div className="text-xs text-slate-400">{assignedMarina.name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <div>{vessel.captain}</div>
                    <div className="text-xs text-slate-400">Crew: {vessel.crewCount}</div>
                  </td>
                  <td className={`px-4 py-3 text-xs font-semibold ${statusColorClass(vessel.status)}`}>
                    {t.fleet.statuses[vessel.status]}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateVessel({
                          ...vessel,
                          status: cycleVesselStatus(vessel.status),
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-md border border-sky-400/25 bg-[#040B16] px-2.5 py-1.5 text-xs font-medium text-sky-300 hover:border-sky-400/50 whitespace-nowrap"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>{t.fleet.cycleStatus}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Register Vessel Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-lg rounded-xl border border-sky-400/25 bg-[#0A1628] p-6">
            <div className="flex items-center justify-between border-b border-sky-400/15 pb-3">
              <h2 className="font-display text-lg font-semibold text-slate-50">
                {t.fleet.registerVessel}
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300">{t.fleet.vesselName}</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="M/Y BODRUM VOYAGER"
                    className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">IMO</label>
                  <input
                    value={imo}
                    onChange={(e) => setImo(e.target.value)}
                    placeholder="9845120"
                    className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 font-mono text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">MMSI</label>
                  <input
                    value={mmsi}
                    onChange={(e) => setMmsi(e.target.value)}
                    placeholder="271055120"
                    className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 font-mono text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">{t.fleet.flag}</label>
                  <input
                    value={flag}
                    onChange={(e) => setFlag(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">{t.fleet.type}</label>
                  <input
                    value={vesselType}
                    onChange={(e) => setVesselType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">LOA (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={loaMeters}
                    onChange={(e) => setLoaMeters(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 font-mono text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Beam / Draft (m)</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={beamMeters}
                      onChange={(e) => setBeamMeters(e.target.value)}
                      className="w-1/2 rounded-lg border border-sky-400/20 bg-[#040B16] px-2.5 py-2 font-mono text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={draftMeters}
                      onChange={(e) => setDraftMeters(e.target.value)}
                      className="w-1/2 rounded-lg border border-sky-400/20 bg-[#040B16] px-2.5 py-2 font-mono text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">{t.common.selectMarina}</label>
                  <select
                    value={assignedMarinaId}
                    onChange={(e) => setAssignedMarinaId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  >
                    {marinas.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.city} — {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">{t.fleet.captain}</label>
                  <input
                    value={captain}
                    onChange={(e) => setCaptain(e.target.value)}
                    placeholder="Capt. Ali Yilmaz"
                    className="mt-1 w-full rounded-lg border border-sky-400/20 bg-[#040B16] px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-sky-400/15 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-sky-400/20 px-4 py-2 text-xs font-medium text-slate-300 hover:text-slate-100"
                >
                  {t.fleet.formCancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400"
                >
                  {t.fleet.formSubmit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
