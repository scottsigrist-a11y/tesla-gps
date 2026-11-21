export const COLORS = {
  bg: '#080A0F',
  surface: '#0E121B',
  teal: '#14B8A6',
  emerald: '#10B981',
  cyan: '#06B6D4',
  amber: '#F59E0B',
  coral: '#F43F5E',
  magenta: '#EC4899',
  white: '#F8FAFC',
} as const;

export type VizId =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21;

export interface VisualizationMeta {
  id: VizId;
  code: string;
  title: string;
  subtitle: string;
  accent: string;
}

export const VISUALIZATIONS: VisualizationMeta[] = [
  {
    id: 0,
    code: '00',
    title: 'Speed & Altitude Histograms',
    subtitle: 'Dual velocity & grade-tinted elevation distributions',
    accent: COLORS.cyan,
  },
  {
    id: 1,
    code: '01',
    title: 'The Velocity Bloom',
    subtitle: '360° polar speed rose across 5-mph radial petals',
    accent: COLORS.teal,
  },
  {
    id: 2,
    code: '02',
    title: 'Topographic Ribbon',
    subtitle: 'Mirrored elevation streamgraph colored by road grade',
    accent: COLORS.coral,
  },
  {
    id: 3,
    code: '03',
    title: 'The Momentum Nebula',
    subtitle: 'Acceleration vs. regen constellation & energy pool',
    accent: COLORS.magenta,
  },
  {
    id: 4,
    code: '04',
    title: 'Compass Wind-Rose Tapestry',
    subtitle: '16-point heading radar with Bezier turn chords',
    accent: COLORS.amber,
  },
  {
    id: 5,
    code: '05',
    title: 'The Rhythm of the Road',
    subtitle: '2-second stop-and-go architectural barcode strip',
    accent: COLORS.white,
  },
  {
    id: 6,
    code: '06',
    title: 'Kinetic Energy Sankey Flow',
    subtitle: 'Proportional cruise, climb & regen power ribbons',
    accent: COLORS.emerald,
  },
  {
    id: 7,
    code: '07',
    title: 'Altitude vs. Speed Gravity Wells',
    subtitle: '2D dwell-time bubble matrix across terrain & pace',
    accent: COLORS.cyan,
  },
  {
    id: 8,
    code: '08',
    title: 'Cornering Curvature Rings',
    subtitle: 'Concentric left-cyan & right-magenta G-turn ripples',
    accent: COLORS.magenta,
  },
  {
    id: 9,
    code: '09',
    title: 'The Trip Horizon',
    subtitle: 'Cumulative climb silhouette & landmark thresholds',
    accent: COLORS.amber,
  },
  {
    id: 10,
    code: '10',
    title: 'Pulse of Pace',
    subtitle: 'Rolling speed-variance ridgeline joyplot',
    accent: COLORS.teal,
  },
  {
    id: 11,
    code: '11',
    title: 'Powertrain Efficiency Halo',
    subtitle: 'Speed × road grade polar map colored by Wh/mi draw',
    accent: COLORS.emerald,
  },
  {
    id: 12,
    code: '12',
    title: 'Dead-Reckoning Ribbon Map',
    subtitle: 'Live 2D route path weighted by speed, grade & apex turns',
    accent: COLORS.cyan,
  },
  {
    id: 13,
    code: '13',
    title: 'The G-G Traction Mandala',
    subtitle: 'Lateral × longitudinal G-force orbit & quadrant dwell',
    accent: COLORS.magenta,
  },
  {
    id: 14,
    code: '14',
    title: 'Aero vs. Gravity Tug-of-War',
    subtitle: 'Stacked drag, climb resistance & regen assist forces',
    accent: COLORS.amber,
  },
  {
    id: 15,
    code: '15',
    title: 'Trip Symphony Loom',
    subtitle: '4-track synchronized speed, grade, turn & power waves',
    accent: COLORS.teal,
  },
  {
    id: 16,
    code: '16',
    title: 'Elevation-Velocity Phase Portrait',
    subtitle: 'Hysteresis loops in (Speed × Altitude) state space',
    accent: COLORS.coral,
  },
  {
    id: 17,
    code: '17',
    title: 'Cadence Time Spiral',
    subtitle: 'Unfolding Archimedean spiral of pace, stops & regen',
    accent: COLORS.cyan,
  },
  {
    id: 18,
    code: '18',
    title: 'Grade-Bucket Violin Orchestra',
    subtitle: 'Mirrored speed density violins across 7 road steepnesses',
    accent: COLORS.amber,
  },
  {
    id: 19,
    code: '19',
    title: 'Regen Harvest Ledger',
    subtitle: 'Braking harvest blooms & cumulative reclaimed range miles',
    accent: COLORS.emerald,
  },
  {
    id: 20,
    code: '20',
    title: 'Driving Persona Fingerprint',
    subtitle: '6-axis behavioral radar synthesizing trip dynamics',
    accent: COLORS.magenta,
  },
  {
    id: 21,
    code: '21',
    title: 'The Drive Mosaic',
    subtitle: 'Proportional Beautiful-News treemap of counties, miles & wins',
    accent: COLORS.amber,
  },
];

export type RouteProfileId = 'canyon' | 'city' | 'mountain';
export type TelemetryMode = 'simulator' | 'gps';
export type PlaybackSpeed = 1 | 5 | 20;
export type GpsStatus = 'idle' | 'searching' | 'active' | 'error';

export const ROUTE_PROFILES: { id: RouteProfileId; label: string }[] = [
  { id: 'canyon', label: 'Canyon & Highway Run' },
  { id: 'city', label: 'City Stop-and-Go' },
  { id: 'mountain', label: 'Mountain Pass' },
];

export const LANDMARKS = [
  { name: 'Statue of Liberty', ft: 305, color: COLORS.teal },
  { name: 'Empire State Building', ft: 1454, color: COLORS.amber },
  { name: 'Burj Khalifa', ft: 2717, color: COLORS.coral },
] as const;

export interface StreamPoint {
  t: number;
  spd: number;
  alt: number;
  grd: number;
  longG: number;
  latG: number;
  hdg: number;
  netKw: number;
  trn: number;
}

export interface ClimbPoint {
  t: number;
  climbFt: number;
}

export interface MomentumPoint {
  spd: number;
  g: number;
  born: number;
}

export interface RegenParticle {
  xNorm: number;
  yOff: number;
  vx: number;
  vy: number;
  r: number;
  magenta: boolean;
  phase: number;
}

export interface BarcodeBar {
  avg: number;
  isStop: boolean;
}

export interface TurnRipple {
  xNorm: number;
  yNorm: number;
  side: 'left' | 'right';
  born: number;
  intensity: number;
}

export interface RidgeWindow {
  label: string;
  bins: Float64Array;
}

export interface PathPoint {
  xM: number;
  yM: number;
  alt: number;
  grd: number;
  spd: number;
  turnInt: number;
}

export interface GForcePoint {
  latG: number;
  longG: number;
  spd: number;
  born: number;
}

export interface PhasePoint {
  spd: number;
  alt: number;
  grd: number;
  netKw: number;
  whPerMi: number;
  born: number;
}

export interface ForceSample {
  t: number;
  fAero: number;
  fRoll: number;
  fClimb: number;
  fRegen: number;
  spd: number;
}

export interface SpiralSlice {
  spd: number;
  grd: number;
  isStop: boolean;
  isRegen: boolean;
}

export interface RegenEpisode {
  tStart: number;
  durSec: number;
  kwh: number;
  peakKw: number;
  avgGrd: number;
  cumMilesReclaimed: number;
}

export interface LastGpsSample {
  lat: number;
  lon: number;
  altFt: number;
  spd: number;
  hdg: number;
  ts: number;
}

export interface TripData {
  elapsedSec: number;
  distanceMiles: number;
  startAlt: number;
  altFt: number;
  minAlt: number;
  maxAlt: number;
  climbFt: number;
  speedMph: number;
  headingDeg: number;
  gradePct: number;
  longG: number;
  latG: number;
  turnRate: number;
  netKw: number;
  whPerMi: number;
  speedSum: number;
  speedSqSum: number;
  speedSamples: number;
  speedBrackets: Float64Array;
  altBands: Map<number, { sec: number; grdSum: number }>;
  stream: StreamPoint[];
  climbTimeline: ClimbPoint[];
  momentumPts: MomentumPoint[];
  regenParticles: RegenParticle[];
  energyPool: number;
  compassDist: Float64Array;
  compassSpdSum: Float64Array;
  compassTime: Float64Array;
  compassChords: Float64Array;
  recentChords: { from: number; to: number; born: number }[];
  lastCompassBin: number | null;
  barcodeBars: BarcodeBar[];
  barcodeAccum: number;
  barcodeSpdSum: number;
  barcodeSamples: number;
  aeroKwh: number;
  climbKwh: number;
  regenKwh: number;
  instAeroKw: number;
  instClimbKw: number;
  instRegenKw: number;
  gravityCells: Map<string, number>;
  turnRipples: TurnRipple[];
  lastRippleT: number;
  ridgeWindows: RidgeWindow[];
  activeRidge: Float64Array;
  activeRidgeStart: number;

  // Extended datasets for Visualizations 11-20
  pathPoints: PathPoint[];
  _posXM: number;
  _posYM: number;
  _lastPathXM: number;
  _lastPathYM: number;
  ggTrail: GForcePoint[];
  ggSectors: Float64Array;
  phaseTrail: PhasePoint[];
  effBuckets: { regenSec: number; sweetSec: number; midSec: number; highSec: number };
  forceStream: ForceSample[];
  spiralSlices: SpiralSlice[];
  _spiralAccum: number;
  _spiralSpdSum: number;
  _spiralGrdSum: number;
  _spiralSamples: number;
  gradeSpeedViolin: Float64Array; // 7 grade bands x 18 speed brackets
  gradeBandTime: Float64Array;
  regenEpisodes: RegenEpisode[];
  _activeRegenEp: {
    tStart: number;
    durSec: number;
    kwh: number;
    peakKw: number;
    grdSum: number;
  } | null;
  regionStats: Map<
    string,
    { label: string; subtitle: string; miles: number; sec: number; climbFt: number; spdSum: number }
  >;

  _simSpd: number;
  _simAlt: number;
  _simHdg: number;
  _lastGps: LastGpsSample | null;
}

export interface HudSnapshot {
  speedMph: number;
  altitudeFt: number;
  netGainFt: number;
  climbFt: number;
  gradePct: number;
  distanceMiles: number;
  elapsedSec: number;
}
