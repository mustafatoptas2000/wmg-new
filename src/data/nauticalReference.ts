export interface BeaufortEntry {
  force: number;
  name: string;
  knotsMin: number;
  knotsMax: number;
  msRange: string;
  waveHeightMeters: string;
  seaDescription: string;
}

export const BEAUFORT_SCALE: BeaufortEntry[] = [
  { force: 0, name: 'Calm', knotsMin: 0, knotsMax: 1, msRange: '0.0 - 0.2', waveHeightMeters: '0.0', seaDescription: 'Mirror-like sea surface.' },
  { force: 1, name: 'Light Air', knotsMin: 1, knotsMax: 3, msRange: '0.3 - 1.5', waveHeightMeters: '0.1', seaDescription: 'Ripples with appearance of scales; no foam crests.' },
  { force: 2, name: 'Light Breeze', knotsMin: 4, knotsMax: 6, msRange: '1.6 - 3.3', waveHeightMeters: '0.2 - 0.3', seaDescription: 'Small wavelets; glassy crests do not break.' },
  { force: 3, name: 'Gentle Breeze', knotsMin: 7, knotsMax: 10, msRange: '3.4 - 5.4', waveHeightMeters: '0.6 - 1.0', seaDescription: 'Large wavelets; crests begin to break, scattered whitecaps.' },
  { force: 4, name: 'Moderate Breeze', knotsMin: 11, knotsMax: 16, msRange: '5.5 - 7.9', waveHeightMeters: '1.0 - 1.5', seaDescription: 'Small waves becoming longer; fairly frequent whitecaps.' },
  { force: 5, name: 'Fresh Breeze', knotsMin: 17, knotsMax: 21, msRange: '8.0 - 10.7', waveHeightMeters: '2.0 - 2.5', seaDescription: 'Moderate waves taking longer form; many whitecaps and spray.' },
  { force: 6, name: 'Strong Breeze', knotsMin: 22, knotsMax: 27, msRange: '10.8 - 13.8', waveHeightMeters: '3.0 - 4.0', seaDescription: 'Large waves begin to form; extensive white foam crests.' },
  { force: 7, name: 'Near Gale', knotsMin: 28, knotsMax: 33, msRange: '13.9 - 17.1', waveHeightMeters: '4.0 - 5.5', seaDescription: 'Sea heaps up and white foam from breaking waves blows in streaks.' },
  { force: 8, name: 'Gale', knotsMin: 34, knotsMax: 40, msRange: '17.2 - 20.7', waveHeightMeters: '5.5 - 7.5', seaDescription: 'Moderately high waves of greater length; spindrift begins to blow.' },
  { force: 9, name: 'Strong Gale', knotsMin: 41, knotsMax: 47, msRange: '20.8 - 24.4', waveHeightMeters: '7.0 - 10.0', seaDescription: 'High waves; dense streaks of foam; crests topple and roll over.' },
  { force: 10, name: 'Storm', knotsMin: 48, knotsMax: 55, msRange: '24.5 - 28.4', waveHeightMeters: '9.0 - 12.5', seaDescription: 'Very high waves with long overhanging crests; white sea surface.' },
  { force: 11, name: 'Violent Storm', knotsMin: 56, knotsMax: 63, msRange: '28.5 - 32.6', waveHeightMeters: '11.5 - 16.0', seaDescription: 'Exceptionally high waves; sea completely covered with long white patches of foam.' },
  { force: 12, name: 'Hurricane', knotsMin: 64, knotsMax: 99, msRange: '32.7+', waveHeightMeters: '14.0+', seaDescription: 'Air filled with foam and spray; sea completely white; visibility seriously affected.' },
];

export interface VhfChannelEntry {
  channel: string;
  frequencyMhz: string;
  mode: 'Simplex' | 'Duplex';
  usage: string;
  notes: string;
}

export const VHF_CHANNELS: VhfChannelEntry[] = [
  { channel: 'Ch 16', frequencyMhz: '156.800', mode: 'Simplex', usage: 'Distress, Safety & Calling', notes: 'Mandatory continuous watch at sea; switch to working channel after initial contact.' },
  { channel: 'Ch 70', frequencyMhz: '156.525', mode: 'Simplex', usage: 'Digital Selective Calling (DSC)', notes: 'Automated distress and urgency alerts only. Voice transmission prohibited.' },
  { channel: 'Ch 06', frequencyMhz: '156.300', mode: 'Simplex', usage: 'Intership Safety / Search & Rescue', notes: 'Coordinated SAR operations and vessel-to-aircraft communications.' },
  { channel: 'Ch 08', frequencyMhz: '156.400', mode: 'Simplex', usage: 'Intership / Coast Guard SAR', notes: 'Primary intership working frequency and regional Coast Guard tactical channel.' },
  { channel: 'Ch 09', frequencyMhz: '156.450', mode: 'Simplex', usage: 'Harbor & Marina Operations', notes: 'Secondary calling and port approach operations across Mediterranean hubs.' },
  { channel: 'Ch 11 / 12', frequencyMhz: '156.550 / 156.600', mode: 'Simplex', usage: 'Port Operations & VTS', notes: 'Vessel Traffic Services (Turkish Straits VTS) and commercial port clearance.' },
  { channel: 'Ch 13', frequencyMhz: '156.650', mode: 'Simplex', usage: 'Bridge-to-Bridge Navigation Safety', notes: 'Collision avoidance, narrow-strait passing agreements, and pilotage.' },
  { channel: 'Ch 14', frequencyMhz: '156.700', mode: 'Simplex', usage: 'VTS / Pilotage / Harbor Control', notes: 'Active vessel traffic sector reporting and pilot boarding coordination.' },
  { channel: 'Ch 67', frequencyMhz: '156.375', mode: 'Simplex', usage: 'Coast Guard / Maritime Weather', notes: 'Coastal meteorological broadcasts (Türk Radyo / NAVTEX voice) and safety warnings.' },
  { channel: 'Ch 68 / 69', frequencyMhz: '156.425 / 156.475', mode: 'Simplex', usage: 'Port Operations & Pleasure Craft', notes: 'Non-commercial intership traffic and regatta/harbor support.' },
  { channel: 'Ch 72 / 73', frequencyMhz: '156.625 / 156.675', mode: 'Simplex', usage: 'Marina Dockmaster Working Channels', notes: 'Primary berth allocation and mooring RIB dispatch in Turkish & Med marinas.' },
  { channel: 'Ch 77', frequencyMhz: '156.875', mode: 'Simplex', usage: 'Intership Navigation Safety', notes: 'Low-power (1W/25W) yacht-to-yacht passing and anchor watch traffic.' },
];

export interface EmergencyFrequencyEntry {
  id: string;
  band: 'VHF' | 'MF' | 'HF' | 'Satellite / SAR';
  system: string;
  frequency: string;
  mode: string;
  coverage: string;
  protocol: string;
}

export const GLOBAL_EMERGENCY_FREQUENCIES: EmergencyFrequencyEntry[] = [
  {
    id: 'em-vhf-16',
    band: 'VHF',
    system: 'VHF Channel 16 (International Distress)',
    frequency: '156.800 MHz',
    mode: 'FM Radiotelephony (Voice)',
    coverage: '20 – 40 NM (Coastal / Line of Sight)',
    protocol: 'MAYDAY (Distress), PAN-PAN (Urgency), SECURITE (Safety). Continuous watch required on all SOLAS & pleasure vessels.',
  },
  {
    id: 'em-vhf-70',
    band: 'VHF',
    system: 'VHF Channel 70 (GMDSS DSC)',
    frequency: '156.525 MHz',
    mode: 'Digital Selective Calling (DSC)',
    coverage: 'Sea Area A1 (20 – 40 NM)',
    protocol: 'Automated digital distress alert with MMSI & GPS coordinates. Voice transmissions strictly prohibited.',
  },
  {
    id: 'em-mf-2182',
    band: 'MF',
    system: 'MF Radiotelephony Distress',
    frequency: '2182.0 kHz',
    mode: 'J3E / H3E SSB Voice',
    coverage: 'Sea Area A2 (100 – 250 NM)',
    protocol: 'Medium-range coastal & offshore distress voice channel. Silence periods: 00-03 and 30-33 min past each hour (legacy watch).',
  },
  {
    id: 'em-mf-2187',
    band: 'MF',
    system: 'MF GMDSS DSC Alerting',
    frequency: '2187.5 kHz',
    mode: 'DSC Digital Alert',
    coverage: 'Sea Area A2 (100 – 250 NM)',
    protocol: 'Primary MF digital distress alerting channel paired with 2182 kHz voice follow-up.',
  },
  {
    id: 'em-hf-dsc',
    band: 'HF',
    system: 'HF GMDSS DSC Ocean Distress',
    frequency: '4207.5 · 6312.0 · 8414.5 · 12577.0 · 16804.5 kHz',
    mode: 'HF DSC Digital',
    coverage: 'Sea Area A3 / A4 (Global Ocean)',
    protocol: 'Long-range ocean distress alerting. 8414.5 kHz is the primary global 24/7 watch frequency.',
  },
  {
    id: 'em-hf-voice',
    band: 'HF',
    system: 'HF SSB Radiotelephony Distress',
    frequency: '4125 · 6215 · 8291 · 12290 · 16420 kHz',
    mode: 'J3E USB Voice',
    coverage: 'Sea Area A3 / A4 (Global Ocean)',
    protocol: 'Associated voice channels following an HF DSC distress alert.',
  },
  {
    id: 'em-navtex',
    band: 'MF',
    system: 'NAVTEX Maritime Safety Information',
    frequency: '518 kHz (Intl) · 490 kHz (National) · 4209.5 kHz',
    mode: 'NBDP / FEC Text Broadcast',
    coverage: '200 – 400 NM Offshore',
    protocol: 'Automated gale warnings, navigational hazards, and SAR broadcasts (e.g., Antalya, Samsun, Izmir, Istanbul stations).',
  },
  {
    id: 'em-epirb',
    band: 'Satellite / SAR',
    system: 'COSPAS-SARSAT EPIRB / PLB',
    frequency: '406.0 MHz (Uplink) + 121.5 MHz (Homing)',
    mode: 'Satellite Burst + Homing',
    coverage: 'Global (Polar + Geostationary)',
    protocol: 'Emergency Position-Indicating Radio Beacon transmitting vessel MMSI and GNSS fix to global MRCCs.',
  },
  {
    id: 'em-sart',
    band: 'Satellite / SAR',
    system: 'AIS-SART & Radar SART',
    frequency: '161.975 / 162.025 MHz (AIS) · 9.2–9.5 GHz (X-Band)',
    mode: 'AIS Burst / Radar Transponder',
    coverage: '5 – 15 NM Local SAR Homing',
    protocol: 'Survival craft locating devices displaying 12-dot line on X-band radar or AIS safety-related target.',
  },
  {
    id: 'em-air-sar',
    band: 'VHF',
    system: 'Aeronautical SAR & On-Scene',
    frequency: '121.5 MHz (Emergency) · 123.1 MHz (SAR)',
    mode: 'AM Aeronautical Voice',
    coverage: 'Line of Sight (High Altitude)',
    protocol: 'International air distress and aircraft-to-vessel on-scene search & rescue coordination.',
  },
];
