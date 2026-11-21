import { COLORS, RouteProfileId, TripData } from './types';
import { getSimulatorRegion } from './treemap';

export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const wrapDeg = (d: number): number => ((d % 360) + 360) % 360;

export const diffDeg = (a: number, b: number): number => ((b - a + 540) % 360) - 180;

export function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mixColor(hexA: string, hexB: string, t: number, alpha = 1): string {
  const k = clamp(t, 0, 1);
  const [r1, g1, b1] = hexRgb(hexA);
  const [r2, g2, b2] = hexRgb(hexB);
  const r = Math.round(lerp(r1, r2, k));
  const g = Math.round(lerp(g1, g2, k));
  const b = Math.round(lerp(b1, b2, k));
  return alpha < 1 ? `rgba(${r},${g},${b},${alpha})` : `rgb(${r},${g},${b})`;
}

export const speedColor = (mph: number, a = 1): string =>
  mph <= 35
    ? mixColor(COLORS.teal, COLORS.cyan, mph / 35, a)
    : mixColor(COLORS.cyan, COLORS.amber, (mph - 35) / 45, a);

export const gradeColor = (pct: number, a = 1): string => {
  if (pct < -0.5) return mixColor(COLORS.cyan, COLORS.emerald, clamp(-pct / 6, 0, 1), a);
  if (pct <= 2.5) return mixColor(COLORS.cyan, COLORS.amber, clamp(pct / 2.5, 0, 1), a);
  return mixColor(COLORS.amber, COLORS.coral, clamp((pct - 2.5) / 5.5, 0, 1), a);
};

export const efficiencyColor = (whPerMi: number, a = 1): string => {
  if (whPerMi < 0) return mixColor(COLORS.teal, COLORS.emerald, clamp(-whPerMi / 240, 0, 1), a);
  if (whPerMi <= 260) return mixColor(COLORS.teal, COLORS.cyan, clamp(whPerMi / 260, 0, 1), a);
  if (whPerMi <= 420) return mixColor(COLORS.cyan, COLORS.amber, (whPerMi - 260) / 160, a);
  return mixColor(COLORS.amber, COLORS.coral, clamp((whPerMi - 420) / 300, 0, 1), a);
};

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r;
  const dLon = (lon2 - lon1) * r;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = Math.PI / 180;
  const y = Math.sin((lon2 - lon1) * r) * Math.cos(lat2 * r);
  const x =
    Math.cos(lat1 * r) * Math.sin(lat2 * r) -
    Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lon2 - lon1) * r);
  return wrapDeg((Math.atan2(y, x) * 180) / Math.PI);
}

export interface Point2D {
  x: number;
  y: number;
}

export interface SmoothBounds {
  minY?: number;
  maxY?: number;
  moveToStart?: boolean;
}

export function traceSmooth(
  ctx: CanvasRenderingContext2D,
  pts: Point2D[],
  bounds: SmoothBounds = {}
): void {
  if (!pts.length) return;
  const { minY = -Infinity, maxY = Infinity, moveToStart = true } = bounds;
  if (moveToStart) {
    ctx.moveTo(pts[0].x, pts[0].y);
  } else {
    ctx.lineTo(pts[0].x, pts[0].y);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = clamp(p1.y + (p2.y - p0.y) / 6, minY, maxY);
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = clamp(p2.y - (p3.y - p1.y) / 6, minY, maxY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}

export function simTargets(
  profile: RouteProfileId,
  t: number
): { spd: number; grd: number; trn: number } {
  if (profile === 'canyon') {
    const c = t % 180;
    if (c < 45) {
      return {
        spd: 42 + 9 * Math.sin(c * 0.22),
        grd: 4.4 + 2.4 * Math.sin(c * 0.14),
        trn: 14 * Math.sin(c * 0.42) + 5 * Math.cos(c * 0.78),
      };
    }
    if (c < 110) {
      return {
        spd: lerp(45, 74, clamp((c - 45) / 8, 0, 1)) + 4.5 * Math.sin(c * 0.18),
        grd: 0.7 * Math.sin(c * 0.09),
        trn: 2.5 * Math.sin(c * 0.12),
      };
    }
    if (c < 158) {
      return {
        spd: 48 + 8 * Math.cos(c * 0.2),
        grd: -4.8 - 2.2 * Math.sin((c - 110) * 0.13),
        trn: -16 * Math.sin(c * 0.39) + 4 * Math.sin(c * 0.85),
      };
    }
    if (c < 170) {
      return { spd: 0, grd: -0.3, trn: 0 };
    }
    return { spd: 32, grd: 1.5, trn: c < 175 ? 18 : 2 };
  }

  if (profile === 'city') {
    const b = t % 90;
    const grd = 0.6 * Math.sin(t * 0.08);
    if (b < 9) return { spd: 0, grd, trn: 0 };
    if (b < 24) return { spd: 36 + 4 * Math.sin(t * 0.5), grd, trn: b > 11 && b < 14.5 ? 26 : 0 };
    if (b < 38) return { spd: 13 + 5 * Math.sin(t * 0.9), grd, trn: 0 };
    if (b < 44) return { spd: 0, grd, trn: 0 };
    if (b < 64) return { spd: 41 + 3 * Math.cos(t * 0.4), grd, trn: b > 47 && b < 50.5 ? -25 : 0 };
    if (b < 75) return { spd: 11 + 6 * Math.sin(t * 1.1), grd: -1.8, trn: 0 };
    return { spd: 28, grd, trn: b > 78 && b < 81 ? 24 : 0 };
  }

  const p = t % 200;
  if (p < 105) {
    return {
      spd: 34 + 7 * Math.sin(p * 0.16),
      grd: 6.4 + 2.8 * Math.sin(p * 0.07),
      trn: 22 * Math.sin(p * 0.34),
    };
  }
  if (p < 120) {
    return {
      spd: 44 + 3 * Math.sin(p * 0.3),
      grd: 0.4 * Math.cos(p * 0.2),
      trn: 4 * Math.sin(p * 0.25),
    };
  }
  return {
    spd: 39 + 8 * Math.sin(p * 0.19),
    grd: -6.5 - 2.3 * Math.sin((p - 120) * 0.08),
    trn: 23 * Math.cos(p * 0.33),
  };
}

export function createInitialTripData(startAlt = 420): TripData {
  return {
    elapsedSec: 0,
    distanceMiles: 0,
    startAlt,
    altFt: startAlt,
    minAlt: startAlt,
    maxAlt: startAlt,
    climbFt: 0,
    speedMph: 0,
    headingDeg: 35,
    gradePct: 0,
    longG: 0,
    latG: 0,
    turnRate: 0,
    netKw: 0,
    whPerMi: 220,
    speedSum: 0,
    speedSqSum: 0,
    speedSamples: 0,
    speedBrackets: new Float64Array(18),
    altBands: new Map(),
    stream: [],
    climbTimeline: [{ t: 0, climbFt: 0 }],
    momentumPts: [],
    regenParticles: [],
    energyPool: 0.06,
    compassDist: new Float64Array(16),
    compassSpdSum: new Float64Array(16),
    compassTime: new Float64Array(16),
    compassChords: new Float64Array(256),
    recentChords: [],
    lastCompassBin: null,
    barcodeBars: [],
    barcodeAccum: 0,
    barcodeSpdSum: 0,
    barcodeSamples: 0,
    aeroKwh: 0.001,
    climbKwh: 0.0005,
    regenKwh: 0.0002,
    instAeroKw: 0,
    instClimbKw: 0,
    instRegenKw: 0,
    gravityCells: new Map(),
    turnRipples: [],
    lastRippleT: -1,
    ridgeWindows: [],
    activeRidge: new Float64Array(36),
    activeRidgeStart: 0,

    // Extended datasets for Visualizations 11-20
    pathPoints: [{ xM: 0, yM: 0, alt: startAlt, grd: 0, spd: 0, turnInt: 0 }],
    _posXM: 0,
    _posYM: 0,
    _lastPathXM: 0,
    _lastPathYM: 0,
    ggTrail: [],
    ggSectors: new Float64Array(16),
    phaseTrail: [],
    effBuckets: { regenSec: 0, sweetSec: 0, midSec: 0, highSec: 0 },
    forceStream: [],
    spiralSlices: [],
    _spiralAccum: 0,
    _spiralSpdSum: 0,
    _spiralGrdSum: 0,
    _spiralSamples: 0,
    gradeSpeedViolin: new Float64Array(7 * 18),
    gradeBandTime: new Float64Array(7),
    regenEpisodes: [],
    _activeRegenEp: null,
    regionStats: new Map(),

    _simSpd: 0,
    _simAlt: startAlt,
    _simHdg: 35,
    _lastGps: null,
  };
}

export function ingestTelemetryStep(
  t: TripData,
  dt: number,
  spd: number,
  alt: number,
  hdg: number,
  grd: number,
  longG: number,
  trn: number,
  nowMs: number = Date.now(),
  regionInfo?: { key: string; label: string; subtitle: string }
): void {
  if (dt <= 0 || dt > 10) return;

  const altDelta = alt - t.altFt;
  t.elapsedSec += dt;
  const distDelta = (spd * dt) / 3600;
  t.distanceMiles += distDelta;
  t.speedMph = spd;
  t.altFt = alt;
  t.headingDeg = wrapDeg(hdg);
  t.gradePct = grd;
  t.longG = longG;
  t.turnRate = trn;
  t.speedSum += spd * dt;
  t.speedSqSum += spd * spd * dt;
  t.speedSamples += dt;

  const vMs = spd * 0.44704;
  const omegaRad = (trn * Math.PI) / 180;
  t.latG = clamp((vMs * omegaRad) / 9.80665, -0.8, 0.8);

  t.minAlt = Math.min(t.minAlt, alt);
  t.maxAlt = Math.max(t.maxAlt, alt);
  if (altDelta > 0) t.climbFt += altDelta;

  if (regionInfo) {
    const prevReg = t.regionStats.get(regionInfo.key) || {
      label: regionInfo.label,
      subtitle: regionInfo.subtitle,
      miles: 0,
      sec: 0,
      climbFt: 0,
      spdSum: 0,
    };
    prevReg.miles += distDelta;
    prevReg.sec += dt;
    if (altDelta > 0) prevReg.climbFt += altDelta;
    prevReg.spdSum += spd * dt;
    t.regionStats.set(regionInfo.key, prevReg);
  }

  // Physics forces (Model 3 ~ 1850 kg)
  const fAero = 0.5 * 1.225 * 0.52 * vMs * vMs;
  const fRoll = spd > 0.5 ? 0.009 * 1850 * 9.81 : 0;
  const fSlope = 1850 * 9.81 * clamp(grd / 100, -0.25, 0.25);
  const fAccel = 1850 * (longG * 9.81);

  const pAero = ((fAero + fRoll) * vMs) / 1000;
  const pSlope = (fSlope * vMs) / 1000;
  const pAccel = (fAccel * vMs) / 1000;
  const pClimb = Math.max(0, pSlope);
  const netWheel = pAero + pSlope + pAccel;
  const pRegen = netWheel < 0 && vMs > 1 ? Math.min(75, -netWheel * 0.76) : 0;
  const netKw = netWheel >= 0 ? netWheel / 0.91 : -pRegen;
  const whPerMi = spd > 3 ? clamp((netKw * 1000) / spd, -600, 1200) : 0;

  t.netKw = netKw;
  t.whPerMi = whPerMi;
  t.instAeroKw = pAero;
  t.instClimbKw = pClimb;
  t.instRegenKw = pRegen;

  const dHr = dt / 3600;
  t.aeroKwh += pAero * dHr;
  t.climbKwh += pClimb * dHr;
  t.regenKwh += pRegen * dHr;
  t.energyPool = clamp(0.06 + t.regenKwh * 0.34, 0.06, 0.92);

  // 0 & 1: Speed brackets + Altitude 25-ft bands
  const spdBracket = clamp(Math.floor(spd / 5), 0, 17);
  t.speedBrackets[spdBracket] += dt;
  const band = Math.floor(alt / 25) * 25;
  const prevBand = t.altBands.get(band) || { sec: 0, grdSum: 0 };
  prevBand.sec += dt;
  prevBand.grdSum += grd * dt;
  t.altBands.set(band, prevBand);

  // 18: Grade-Bucket Violin Matrix (7 grade bands: <=-5, -3, -1, 0, +1, +3, >=+5)
  const gradeIdx = clamp(Math.round((grd + 6) / 2), 0, 6);
  t.gradeSpeedViolin[gradeIdx * 18 + spdBracket] += dt;
  t.gradeBandTime[gradeIdx] += dt;

  // 11: Efficiency buckets
  if (spd > 2) {
    if (whPerMi < 0) t.effBuckets.regenSec += dt;
    else if (whPerMi <= 260) t.effBuckets.sweetSec += dt;
    else if (whPerMi <= 400) t.effBuckets.midSec += dt;
    else t.effBuckets.highSec += dt;
  }

  // 12: Dead-Reckoning 2D Path Integration (North = -Y, East = +X)
  const hdgRad = (t.headingDeg * Math.PI) / 180;
  const stepM = vMs * dt;
  t._posXM += Math.sin(hdgRad) * stepM;
  t._posYM -= Math.cos(hdgRad) * stepM;
  const pathDist = Math.hypot(t._posXM - t._lastPathXM, t._posYM - t._lastPathYM);
  const turnInt = Math.abs(trn) * Math.min(spd / 25, 1.8);

  if (pathDist >= 12) {
    t.pathPoints.push({
      xM: t._posXM,
      yM: t._posYM,
      alt,
      grd,
      spd,
      turnInt,
    });
    t._lastPathXM = t._posXM;
    t._lastPathYM = t._posYM;
    if (t.pathPoints.length > 640) {
      const thinned = t.pathPoints.filter((_, idx) => idx % 2 === 0);
      thinned.push(t.pathPoints[t.pathPoints.length - 1]);
      t.pathPoints = thinned;
    }
  }

  // 13: G-G Traction Mandala Sectors
  const gMag = Math.hypot(t.latG, t.longG);
  if (gMag > 0.025) {
    const gAngle = Math.atan2(-t.longG, t.latG);
    const sec = Math.floor((((gAngle * 180) / Math.PI + 360 + 11.25) % 360) / 22.5);
    t.ggSectors[sec] += gMag * dt;
  }

  // 2, 11, 13, 14, 15, 16: Streamed ~5Hz histories
  const lastS = t.stream[t.stream.length - 1];
  const shouldSampleStream = !lastS || t.elapsedSec - lastS.t >= 0.2;
  if (shouldSampleStream) {
    t.stream.push({
      t: t.elapsedSec,
      spd,
      alt,
      grd,
      longG,
      latG: t.latG,
      hdg: t.headingDeg,
      netKw,
      trn,
    });
    if (t.stream.length > 340) t.stream.shift();

    t.phaseTrail.push({ spd, alt, grd, netKw, whPerMi, born: nowMs });
    if (t.phaseTrail.length > 260) t.phaseTrail.shift();

    t.ggTrail.push({ latG: t.latG, longG: t.longG, spd, born: nowMs });
    if (t.ggTrail.length > 180) t.ggTrail.shift();

    t.forceStream.push({
      t: t.elapsedSec,
      fAero: fAero / 1000,
      fRoll: fRoll / 1000,
      fClimb: Math.max(0, fSlope) / 1000,
      fRegen: pRegen > 0 && vMs > 0.5 ? Math.min(3.5, (pRegen * 1000) / vMs / 1000) : 0,
      spd,
    });
    if (t.forceStream.length > 220) t.forceStream.shift();
  }

  // 9: Full-trip Climb Silhouette
  const lastC = t.climbTimeline[t.climbTimeline.length - 1];
  if (!lastC || t.elapsedSec - lastC.t >= Math.max(0.5, t.elapsedSec / 260)) {
    t.climbTimeline.push({ t: t.elapsedSec, climbFt: t.climbFt });
    if (t.climbTimeline.length > 320) {
      const next = t.climbTimeline.filter((_, idx) => idx % 2 === 0);
      next.push(t.climbTimeline[t.climbTimeline.length - 1]);
      t.climbTimeline = next;
    }
  }

  // 3: Momentum Nebula
  if (spd > 1 && shouldSampleStream) {
    t.momentumPts.push({ spd, g: longG, born: nowMs });
    if (t.momentumPts.length > 240) t.momentumPts.shift();
    if (longG < -0.04 || (grd < -2.2 && spd > 12)) {
      const count = longG < -0.15 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        t.regenParticles.push({
          xNorm: clamp(spd / 88 + (Math.random() - 0.5) * 0.03, 0.05, 0.95),
          yOff: clamp(-longG / 0.42, 0.08, 0.85),
          vx: (Math.random() - 0.5) * 0.14,
          vy: 0.45 + Math.random() * 0.55,
          r: 2 + Math.random() * 3,
          magenta: Math.random() > 0.45,
          phase: Math.random() * Math.PI * 2,
        });
      }
      if (t.regenParticles.length > 180) {
        t.regenParticles.splice(0, t.regenParticles.length - 180);
      }
    }
  }

  // 4: Compass Wind-Rose Tapestry
  if (spd > 1.5) {
    const bin = Math.floor(((t.headingDeg + 11.25) % 360) / 22.5);
    t.compassDist[bin] += distDelta + dt * 0.002;
    t.compassSpdSum[bin] += spd * dt;
    t.compassTime[bin] += dt;
    if (t.lastCompassBin !== null && t.lastCompassBin !== bin) {
      t.compassChords[t.lastCompassBin * 16 + bin] += 1;
      t.recentChords.push({ from: t.lastCompassBin, to: bin, born: nowMs });
      if (t.recentChords.length > 36) t.recentChords.shift();
    }
    t.lastCompassBin = bin;
  }

  // 5: Stop-and-Go Barcode (2-second slices)
  t.barcodeAccum += dt;
  t.barcodeSpdSum += spd * dt;
  t.barcodeSamples += dt;
  while (t.barcodeAccum >= 2.0) {
    const avg = t.barcodeSpdSum / Math.max(0.01, t.barcodeSamples);
    t.barcodeBars.push({ avg, isStop: avg < 2.2 });
    if (t.barcodeBars.length > 1200) t.barcodeBars.shift();
    t.barcodeAccum -= 2.0;
    t.barcodeSpdSum = 0;
    t.barcodeSamples = 0;
  }

  // 17: Cadence Time Spiral (1-second slices)
  t._spiralAccum += dt;
  t._spiralSpdSum += spd * dt;
  t._spiralGrdSum += grd * dt;
  t._spiralSamples += dt;
  while (t._spiralAccum >= 1.0) {
    const avgSpd = t._spiralSpdSum / Math.max(0.01, t._spiralSamples);
    const avgGrd = t._spiralGrdSum / Math.max(0.01, t._spiralSamples);
    t.spiralSlices.push({
      spd: avgSpd,
      grd: avgGrd,
      isStop: avgSpd < 2.2,
      isRegen: pRegen > 1.5 || avgGrd < -2.2,
    });
    if (t.spiralSlices.length > 960) t.spiralSlices.shift();
    t._spiralAccum -= 1.0;
    t._spiralSpdSum = 0;
    t._spiralGrdSum = 0;
    t._spiralSamples = 0;
  }

  // 19: Regen Harvest Ledger (discrete regenerative episodes)
  if (pRegen > 1.5) {
    if (!t._activeRegenEp) {
      t._activeRegenEp = {
        tStart: t.elapsedSec,
        durSec: dt,
        kwh: pRegen * dHr,
        peakKw: pRegen,
        grdSum: grd * dt,
      };
    } else {
      t._activeRegenEp.durSec += dt;
      t._activeRegenEp.kwh += pRegen * dHr;
      t._activeRegenEp.peakKw = Math.max(t._activeRegenEp.peakKw, pRegen);
      t._activeRegenEp.grdSum += grd * dt;
    }
  } else if (t._activeRegenEp) {
    if (t._activeRegenEp.kwh >= 0.0004 || t._activeRegenEp.durSec >= 1.0) {
      t.regenEpisodes.push({
        tStart: t._activeRegenEp.tStart,
        durSec: t._activeRegenEp.durSec,
        kwh: t._activeRegenEp.kwh,
        peakKw: t._activeRegenEp.peakKw,
        avgGrd: t._activeRegenEp.grdSum / Math.max(0.01, t._activeRegenEp.durSec),
        cumMilesReclaimed: (t.regenKwh * 1000) / 260,
      });
      if (t.regenEpisodes.length > 90) t.regenEpisodes.shift();
    }
    t._activeRegenEp = null;
  }

  // 7: Gravity Wells 2D Matrix
  const zSpd = clamp(Math.floor(spd / 15), 0, 5);
  const cellKey = `${zSpd}:${band}`;
  t.gravityCells.set(cellKey, (t.gravityCells.get(cellKey) || 0) + dt);

  // 8: Cornering Curvature Rings
  if (turnInt > 6.5 && t.elapsedSec - t.lastRippleT >= 0.42) {
    const side = trn < 0 ? 'left' : 'right';
    t.turnRipples.push({
      xNorm:
        side === 'left'
          ? 0.33 + (Math.random() - 0.5) * 0.08
          : 0.67 + (Math.random() - 0.5) * 0.08,
      yNorm: 0.5 + (Math.random() - 0.5) * 0.16,
      side,
      born: nowMs,
      intensity: clamp(turnInt / 28, 0.35, 1.3),
    });
    if (t.turnRipples.length > 42) t.turnRipples.shift();
    t.lastRippleT = t.elapsedSec;
  }

  // 10: Pulse of Pace Ridgeline Windows (12s windows)
  t.activeRidge[clamp(Math.floor((spd / 90) * 36), 0, 35)] += dt;
  if (t.elapsedSec - t.activeRidgeStart >= 12) {
    const m = Math.floor(t.activeRidgeStart / 60);
    const s = Math.floor(t.activeRidgeStart % 60);
    t.ridgeWindows.push({
      label: `${m}:${String(s).padStart(2, '0')}`,
      bins: new Float64Array(t.activeRidge),
    });
    if (t.ridgeWindows.length > 12) t.ridgeWindows.shift();
    t.activeRidge.fill(0);
    t.activeRidgeStart = t.elapsedSec;
  }
}

export function stepSimulatorPhysics(
  t: TripData,
  profile: RouteProfileId,
  subDt: number,
  nowMs: number
): void {
  const { spd: tgtSpd, grd: tgtGrd, trn: tgtTrn } = simTargets(profile, t.elapsedSec);
  const resp = tgtSpd > t._simSpd ? 1.15 : 1.55;
  const nextSpd = Math.max(0, t._simSpd + (tgtSpd - t._simSpd) * clamp(subDt * resp, 0, 1));
  const longG = clamp(((nextSpd - t._simSpd) * 0.44704) / subDt / 9.81, -0.45, 0.45);
  const effTurn = tgtTrn * clamp(nextSpd / 20, 0, 1.2);
  const nextHdg = wrapDeg(t._simHdg + effTurn * subDt);
  const nextAlt = t._simAlt + nextSpd * 1.46667 * subDt * (tgtGrd / 100);

  t._simSpd = nextSpd;
  t._simHdg = nextHdg;
  t._simAlt = nextAlt;

  const region = getSimulatorRegion(profile, t.distanceMiles);
  ingestTelemetryStep(t, subDt, nextSpd, nextAlt, nextHdg, tgtGrd, longG, effTurn, nowMs, region);
}

export interface PersonaAxis {
  key: string;
  label: string;
  tripScore: number;
  liveScore: number;
  detail: string;
}

export function computePersonaScores(t: TripData): PersonaAxis[] {
  const meanSpd = t.speedSamples > 0 ? t.speedSum / t.speedSamples : 0;
  const variance =
    t.speedSamples > 0 ? Math.max(0, t.speedSqSum / t.speedSamples - meanSpd * meanSpd) : 0;
  const stdDev = Math.sqrt(variance);

  const climbPerMile = t.distanceMiles > 0.05 ? t.climbFt / t.distanceMiles : Math.abs(t.gradePct) * 52.8;
  let gActivity = 0;
  for (let i = 0; i < 16; i++) gActivity += t.ggSectors[i];
  const gRate = t.elapsedSec > 1 ? gActivity / t.elapsedSec : 0;

  const totalEnergy = Math.max(0.001, t.aeroKwh + t.climbKwh);
  const regenRatio = t.regenKwh / totalEnergy;

  const stopBars = t.barcodeBars.filter((b) => b.isStop).length;
  const stopRatio = t.barcodeBars.length > 0 ? stopBars / t.barcodeBars.length : 0;

  return [
    {
      key: 'pace',
      label: 'Pace Intensity',
      tripScore: clamp(meanSpd / 75, 0.08, 1),
      liveScore: clamp(t.speedMph / 75, 0.08, 1),
      detail: `${Math.round(meanSpd)} mph avg`,
    },
    {
      key: 'elevation',
      label: 'Elevation Demand',
      tripScore: clamp(climbPerMile / 320, 0.08, 1),
      liveScore: clamp(Math.abs(t.gradePct) / 8, 0.08, 1),
      detail: `${Math.round(climbPerMile)} ft/mi`,
    },
    {
      key: 'cornering',
      label: 'Cornering Fluidity',
      tripScore: clamp(gRate / 0.16, 0.08, 1),
      liveScore: clamp((Math.abs(t.latG) + Math.abs(t.longG)) / 0.45, 0.08, 1),
      detail: `${Math.abs(t.latG).toFixed(2)}G lat`,
    },
    {
      key: 'regen',
      label: 'Regen Mastery',
      tripScore: clamp(regenRatio / 0.45, 0.08, 1),
      liveScore: clamp(t.instRegenKw / 35, 0.08, 1),
      detail: `${Math.round(regenRatio * 100)}% recov`,
    },
    {
      key: 'steadiness',
      label: 'Cruise Steadiness',
      tripScore: clamp(1 - stdDev / 28, 0.12, 1),
      liveScore: clamp(1 - Math.abs(t.longG) / 0.25, 0.12, 1),
      detail: `±${Math.round(stdDev)} mph σ`,
    },
    {
      key: 'urban',
      label: 'Urban Friction',
      tripScore: clamp(stopRatio * 2.2 + (meanSpd < 28 ? 0.25 : 0), 0.08, 1),
      liveScore: clamp(t.speedMph < 18 ? 0.85 : 0.15, 0.08, 1),
      detail: `${Math.round(stopRatio * 100)}% stops`,
    },
  ];
}
