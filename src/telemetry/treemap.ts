import { RouteProfileId, TripData } from './types';

export type MosaicCategory = 'all' | 'counties' | 'energy' | 'pace';

export interface MosaicInputItem {
  id: string;
  category: Exclude<MosaicCategory, 'all'>;
  value: number;
  headline: string;
  subtext: string;
  bg: string;
  fg: string;
}

export interface TreemapRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LaidOutMosaicTile extends MosaicInputItem, TreemapRect {}

const COUNTY_CORRIDORS: Record<
  RouteProfileId,
  { name: string; subtitle: string; spanMi: number }[]
> = {
  canyon: [
    { name: 'Marin County', subtitle: 'Coastal Canyon Ascent', spanMi: 0.75 },
    { name: 'Sonoma County', subtitle: 'Highway 101 Express', spanMi: 1.05 },
    { name: 'Napa County', subtitle: 'Oakville Grade Descent', spanMi: 0.85 },
    { name: 'Solano County', subtitle: 'Valley Floor Approach', spanMi: 0.65 },
  ],
  city: [
    { name: 'San Francisco', subtitle: 'Market & Embarcadero Grid', spanMi: 0.55 },
    { name: 'San Mateo County', subtitle: 'El Camino Signal Run', spanMi: 0.65 },
    { name: 'Santa Clara County', subtitle: 'Bayshore Urban Loop', spanMi: 0.7 },
  ],
  mountain: [
    { name: 'El Dorado County', subtitle: 'Sierra Foothill Climb', spanMi: 0.9 },
    { name: 'Alpine County', subtitle: 'High Summit Switchbacks', spanMi: 0.85 },
    { name: 'Mono County', subtitle: 'Long Regen Descent', spanMi: 0.95 },
  ],
};

export function getSimulatorRegion(
  profile: RouteProfileId,
  distanceMiles: number
): { key: string; label: string; subtitle: string } {
  const list = COUNTY_CORRIDORS[profile];
  const totalLoop = list.reduce((acc, c) => acc + c.spanMi, 0);
  const pos = distanceMiles % totalLoop;
  let cursor = 0;
  for (const c of list) {
    cursor += c.spanMi;
    if (pos <= cursor) {
      return { key: `sim:${c.name}`, label: c.name, subtitle: c.subtitle };
    }
  }
  const last = list[list.length - 1];
  return { key: `sim:${last.name}`, label: last.name, subtitle: last.subtitle };
}

export function getGpsSectorRegion(
  lat: number,
  lon: number
): { key: string; label: string; subtitle: string } {
  // ~3.5 mile grid cells without requiring any external geocoding API key
  const latCell = Math.round(lat * 20) / 20;
  const lonCell = Math.round(lon * 20) / 20;
  const ns = `${Math.abs(latCell).toFixed(2)}°${latCell >= 0 ? 'N' : 'S'}`;
  const ew = `${Math.abs(lonCell).toFixed(2)}°${lonCell >= 0 ? 'E' : 'W'}`;
  return {
    key: `gps:${ns}:${ew}`,
    label: `Sector ${ns}`,
    subtitle: `GPS Cell ${ns}, ${ew}`,
  };
}

function worstAspectRatio(rowAreas: number[], shortSide: number): number {
  if (!rowAreas.length || shortSide <= 0) return Infinity;
  let sum = 0;
  let minA = Infinity;
  let maxA = 0;
  for (const a of rowAreas) {
    sum += a;
    if (a < minA) minA = a;
    if (a > maxA) maxA = a;
  }
  const s2 = sum * sum;
  const w2 = shortSide * shortSide;
  return Math.max((w2 * maxA) / s2, s2 / (w2 * minA));
}

export function computeSquarifiedTreemap(
  items: MosaicInputItem[],
  container: TreemapRect
): LaidOutMosaicTile[] {
  const valid = items
    .filter((it) => it.value > 0 && Number.isFinite(it.value))
    .sort((a, b) => b.value - a.value);

  if (!valid.length || container.w <= 0 || container.h <= 0) return [];

  const totalVal = valid.reduce((s, it) => s + it.value, 0);
  const totalArea = container.w * container.h;
  const scaled = valid.map((it) => ({
    item: it,
    area: (it.value / totalVal) * totalArea,
  }));

  const result: LaidOutMosaicTile[] = [];
  let rx = container.x;
  let ry = container.y;
  let rw = container.w;
  let rh = container.h;

  let row: { item: MosaicInputItem; area: number }[] = [];

  const layoutRow = (r: { item: MosaicInputItem; area: number }[]) => {
    if (!r.length) return;
    const rowSum = r.reduce((s, x) => s + x.area, 0);
    const horizontal = rw >= rh; // lay out along shorter side (rh if rw>=rh, vertical strip)
    if (horizontal) {
      const stripW = rowSum / rh;
      let cy = ry;
      for (const entry of r) {
        const tileH = entry.area / stripW;
        result.push({ ...entry.item, x: rx, y: cy, w: stripW, h: tileH });
        cy += tileH;
      }
      rx += stripW;
      rw = Math.max(0, rw - stripW);
    } else {
      const stripH = rowSum / rw;
      let cx = rx;
      for (const entry of r) {
        const tileW = entry.area / stripH;
        result.push({ ...entry.item, x: cx, y: ry, w: tileW, h: stripH });
        cx += tileW;
      }
      ry += stripH;
      rh = Math.max(0, rh - stripH);
    }
  };

  for (const next of scaled) {
    const shortSide = Math.min(rw, rh);
    if (shortSide <= 0) break;

    if (!row.length) {
      row.push(next);
      continue;
    }

    const currentAreas = row.map((x) => x.area);
    const nextAreas = [...currentAreas, next.area];
    if (worstAspectRatio(nextAreas, shortSide) <= worstAspectRatio(currentAreas, shortSide)) {
      row.push(next);
    } else {
      layoutRow(row);
      row = [next];
    }
  }
  if (row.length) layoutRow(row);

  return result;
}

export function buildDriveMosaicTiles(
  t: TripData,
  category: MosaicCategory
): MosaicInputItem[] {
  const items: MosaicInputItem[] = [];

  // 1. Counties / Geographic Sectors
  const regions = Array.from(t.regionStats.values()).sort((a, b) => b.miles - a.miles);
  regions.forEach((r, idx) => {
    const avgMph = r.sec > 0 ? Math.round(r.spdSum / r.sec) : 0;
    const isEven = idx % 2 === 0;
    items.push({
      id: `region-${r.label}`,
      category: 'counties',
      value: Math.max(0.02, r.miles),
      headline: `${r.miles.toFixed(2)} MI IN ${r.label.toUpperCase()}`,
      subtext: `${r.subtitle} · ${avgMph} mph avg · +${Math.round(r.climbFt)} ft`,
      bg: isEven ? '#2563EB' : '#0891B2',
      fg: '#F8FAFC',
    });
  });

  // 2. Energy & Regen Milestones
  const reclaimedMiles = (t.regenKwh * 1000) / 260;
  const totalEnergy = Math.max(0.001, t.aeroKwh + t.climbKwh);
  const regenPct = Math.round((t.regenKwh / totalEnergy) * 100);
  const totalEffSec =
    t.effBuckets.regenSec +
    t.effBuckets.sweetSec +
    t.effBuckets.midSec +
    t.effBuckets.highSec;
  const sweetPct =
    totalEffSec > 0
      ? Math.round(((t.effBuckets.regenSec + t.effBuckets.sweetSec) / totalEffSec) * 100)
      : 50;

  items.push({
    id: 'energy-regen',
    category: 'energy',
    value: Math.max(0.05, reclaimedMiles * 3.5 + t.regenKwh * 12),
    headline: `+${reclaimedMiles.toFixed(2)} MI RECLAIMED BY REGEN`,
    subtext: `${regenPct}% of drive energy recovered (${t.regenKwh.toFixed(3)} kWh)`,
    bg: '#10B981',
    fg: '#052E16',
  });

  items.push({
    id: 'energy-sweet',
    category: 'energy',
    value: Math.max(0.08, (sweetPct / 100) * Math.max(0.4, t.distanceMiles)),
    headline: `${sweetPct}% OF TIME IN SWEET-SPOT EFFICIENCY`,
    subtext: `Under 260 Wh/mi cruise & regenerative glide`,
    bg: '#14B8A6',
    fg: '#042F2E',
  });

  items.push({
    id: 'energy-climb',
    category: 'energy',
    value: Math.max(0.04, t.climbFt / 280),
    headline: `${Math.round(t.climbFt).toLocaleString()} FT VERTICAL CLIMBED`,
    subtext: `${t.climbKwh.toFixed(3)} kWh potential energy invested in elevation`,
    bg: '#E11D48',
    fg: '#FFF1F2',
  });

  // 3. Pace, Speed Regimes & Road Rhythm
  let hwySec = 0;
  let urbanSec = 0;
  let slowSec = 0;
  for (let i = 0; i < 18; i++) {
    const mph = i * 5;
    if (mph >= 50) hwySec += t.speedBrackets[i];
    else if (mph >= 20) urbanSec += t.speedBrackets[i];
    else slowSec += t.speedBrackets[i];
  }
  const totPaceSec = Math.max(0.1, hwySec + urbanSec + slowSec);

  items.push({
    id: 'pace-highway',
    category: 'pace',
    value: Math.max(0.06, (hwySec / totPaceSec) * Math.max(0.5, t.distanceMiles)),
    headline: `${Math.round((hwySec / totPaceSec) * 100)}% AT HIGHWAY PACE (50+ MPH)`,
    subtext: `Peak speed ${Math.round(Math.max(t.speedMph, ...t.stream.map((s) => s.spd), 0))} mph`,
    bg: '#F59E0B',
    fg: '#1C1917',
  });

  items.push({
    id: 'pace-urban',
    category: 'pace',
    value: Math.max(0.06, (urbanSec / totPaceSec) * Math.max(0.5, t.distanceMiles)),
    headline: `${Math.round((urbanSec / totPaceSec) * 100)}% IN SMOOTH ARTERIAL FLOW`,
    subtext: `20–49 mph balanced canyon & avenue cruising`,
    bg: '#7C3AED',
    fg: '#F5F3FF',
  });

  const stopCount = t.barcodeBars.filter((b) => b.isStop).length;
  items.push({
    id: 'pace-stops',
    category: 'pace',
    value: Math.max(0.04, (slowSec / totPaceSec) * 0.7 + stopCount * 0.03),
    headline:
      stopCount > 0
        ? `${stopCount * 2}S SPENT AT COMPLETE STOPS`
        : `${Math.round((slowSec / totPaceSec) * 100)}% LOW-SPEED MANEUVERING`,
    subtext: `${t.turnRipples.length} dynamic cornering waves logged`,
    bg: '#DB2777',
    fg: '#FDF2F8',
  });

  const filtered = category === 'all' ? items : items.filter((it) => it.category === category);
  if (filtered.length <= 1) return filtered;

  const maxVal = Math.max(...filtered.map((it) => it.value), 0.001);
  const minVisualWeight = maxVal * 0.09;
  return filtered.map((it) => ({
    ...it,
    value: Math.max(it.value, minVisualWeight),
  }));
}

