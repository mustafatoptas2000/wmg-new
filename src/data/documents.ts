import { MaritimeDocument } from '../types/maritime';

export const MARITIME_DOCUMENTS: MaritimeDocument[] = [
  {
    id: 'doc-tr-transit-log',
    code: 'WMG-CLR-101',
    title: 'Turkish Coastal Transit Log & Port Clearance Procedure',
    category: 'clearance',
    authority: 'Turkish Chamber of Shipping / Port Authority',
    updatedDate: '2026-09-15',
    summary: 'Step-by-step arrival and departure formalities for private and commercial yachts entering Turkish waters via Bodrum, Marmaris, Fethiye, Antalya, Izmir, or Didim.',
    sections: [
      {
        heading: 'Pre-Arrival & VHF Protocol',
        items: [
          'Hoist Q-flag (Yellow) upon entering territorial waters until Pratique is granted.',
          'Contact Port Control / Marina Office on assigned VHF working channel at 2 NM distance.',
          'Prepare Crew List, Passenger List, Certificate of Registry, and Third-Party Liability Insurance.',
        ],
      },
      {
        heading: 'Clearance Sequence',
        items: [
          '1. Health & Pratique clearance (Hudut ve Sahiller Saglik Genel Mudurlugu).',
          '2. Passport Control & Immigration stamping for all crew and guests.',
          '3. Customs inspection and Transit Log endorsement (valid up to 1 year for cruising).',
          '4. Harbour Master (Liman Baskanligi) registration and berth verification.',
        ],
      },
    ],
  },
  {
    id: 'doc-passage-plan',
    code: 'WMG-NAV-204',
    title: 'SOLAS Chapter V Passage Planning Checklist',
    category: 'navigation',
    authority: 'IMO / SOLAS Regulation V/34',
    updatedDate: '2026-08-22',
    summary: 'Four-stage operational framework (Appraisal, Planning, Execution, Monitoring) required prior to leaving berth.',
    sections: [
      {
        heading: 'Appraisal & Planning',
        items: [
          'Verify latest Notices to Mariners (NtM) and electronic navigational chart (ENC) updates.',
          'Calculate Under-Keel Clearance (UKC), tidal heights, and restricted anchorage zones.',
          'Identify ports of refuge along the route (e.g. Sigacik, Yalikavak, Netsel Marmaris).',
        ],
      },
      {
        heading: 'Execution & Monitoring',
        items: [
          'Log hourly position fixes via GNSS cross-checked with radar/visual bearings.',
          'Monitor VHF Ch 16 and Navtex meteorological bulletins continuously.',
          'Brief watchkeeping officers on abort points and wheel-over bearings.',
        ],
      },
    ],
  },
  {
    id: 'doc-solas-safety',
    code: 'WMG-SAF-308',
    title: 'Offshore Safety Equipment & Watchkeeping Inventory',
    category: 'safety',
    authority: 'IMO / STCW & Coast Guard Standards',
    updatedDate: '2026-10-04',
    summary: 'Mandatory life-saving appliances, pyrotechnics, GMDSS communications, and fire-fighting inspection schedule.',
    sections: [
      {
        heading: 'Life-Saving & GMDSS',
        items: [
          'SOLAS-approved liferaft with valid hydrostatic release unit (HRU) and annual service tag.',
          '406 MHz EPIRB registered to current vessel MMSI and battery expiry verified.',
          'DSC-enabled VHF fixed transceiver plus waterproof handheld VHF units.',
        ],
      },
      {
        heading: 'Fire & Damage Control',
        items: [
          'Engine room fixed CO2 / FM-200 suppression system annual inspection certificate.',
          'Portable dry powder and foam extinguishers mounted at galley, helm, and cabins.',
          'Emergency bilge pump test and wooden damage-control plugs accessible.',
        ],
      },
    ],
  },
  {
    id: 'doc-marpol-env',
    code: 'WMG-CMP-412',
    title: 'MARPOL Annex I, IV & V Mediterranean Compliance',
    category: 'compliance',
    authority: 'IMO / Mediterranean Special Area',
    updatedDate: '2026-07-30',
    summary: 'Zero-discharge regulations for oil, sewage, and garbage within Mediterranean & Aegean coastal waters and Blue Card (Mavi Kart) tracking.',
    sections: [
      {
        heading: 'Waste & Discharge Rules',
        items: [
          'Strict prohibition on discharging untreated black or grey water inside bays and marinas.',
          'Maintain Blue Card (Mavi Kart) electronic pump-out records at Turkish marinas.',
          'Segregate plastics, food waste, and oily bilge water for shore reception facilities.',
        ],
      },
    ],
  },
];
