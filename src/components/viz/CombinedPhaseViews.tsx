import React, { MutableRefObject } from 'react';
import { COLORS, TripData, VISUALIZATIONS } from '../../telemetry/types';
import {
  clamp,
  efficiencyColor,
  gradeColor,
  lerp,
  mixColor,
  speedColor,
  traceSmooth,
} from '../../telemetry/math';
import { StageHeader, useCanvasLoop } from '../CanvasStage';

interface VizProps {
  tripRef: MutableRefObject<TripData>;
}

// 11: Powertrain Efficiency Halo (Speed x Grade x Wh/mi Polar Phase Map)
export function ViewEfficiencyHalo({ tripRef }: VizProps) {
  const ref = useCanvasLoop((ctx, w, h, now) => {
    const t = tripRef.current;
    const cx = w * 0.44;
    const cy = h * 0.54;
    const maxR = Math.min(w * 0.36, h * 0.37);
    const innerR = maxR * 0.16;

    // Concentric speed rings (30, 60, 90 mph)
    [30, 60, 90].forEach((mph) => {
      const r = lerp(innerR, maxR, mph / 90);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(148,163,184,0.6)';
      ctx.font = '500 10px "JetBrains Mono", monospace';
      ctx.fillText(`${mph}mph`, cx + 6, cy - r + 12);
    });

    // Grade rays: -10% (left-down), 0% (top), +10% (right-up)
    const gradeToAngle = (grd: number) =>
      -Math.PI / 2 + clamp(grd / 10, -1, 1) * (Math.PI * 0.72);

    [-8, -4, 0, 4, 8].forEach((grd) => {
      const a = gradeToAngle(grd);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.strokeStyle = grd === 0 ? 'rgba(6,182,212,0.22)' : 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const lx = cx + Math.cos(a) * (maxR + 22);
      const ly = cy + Math.sin(a) * (maxR + 22);
      ctx.fillStyle = gradeColor(grd, 0.9);
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${grd > 0 ? `+${grd}` : grd}%`, lx, ly);
    });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Orbiting phase trail colored by Wh/mi efficiency
    const trail = t.phaseTrail;
    for (let i = 1; i < trail.length; i++) {
      const p0 = trail[i - 1];
      const p1 = trail[i];
      const a0 = gradeToAngle(p0.grd);
      const r0 = lerp(innerR, maxR, clamp(p0.spd / 90, 0, 1));
      const a1 = gradeToAngle(p1.grd);
      const r1 = lerp(innerR, maxR, clamp(p1.spd / 90, 0, 1));
      const fade = i / trail.length;

      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a0) * r0, cy + Math.sin(a0) * r0);
      ctx.lineTo(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1);
      ctx.strokeStyle = efficiencyColor(p1.whPerMi, 0.14 + fade * 0.78);
      ctx.lineWidth = 1.6 + fade * 2.8;
      ctx.stroke();
    }

    // Live vehicle marker
    const curA = gradeToAngle(t.gradePct);
    const curR = lerp(innerR, maxR, clamp(t.speedMph / 90, 0, 1));
    const curX = cx + Math.cos(curA) * curR;
    const curY = cy + Math.sin(curA) * curR;
    const pulseR = 9 + Math.sin(now * 0.008) * 2.5;
    ctx.beginPath();
    ctx.arc(curX, curY, pulseR, 0, Math.PI * 2);
    ctx.fillStyle = efficiencyColor(t.whPerMi, 0.25);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(curX, curY, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.white;
    ctx.fill();

    // Center readout
    ctx.beginPath();
    ctx.arc(cx, cy, innerR - 3, 0, Math.PI * 2);
    ctx.fillStyle = '#0B0F17';
    ctx.fill();
    ctx.strokeStyle = efficiencyColor(t.whPerMi, 0.8);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.white;
    ctx.font = '700 18px "JetBrains Mono", monospace';
    ctx.fillText(`${Math.round(t.whPerMi)}`, cx, cy - 2);
    ctx.fillStyle = 'rgba(148,163,184,0.85)';
    ctx.font = '600 9px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('WH / MI', cx, cy + 14);
    ctx.textAlign = 'left';

    // Right side Efficiency Zone Breakdown Bars
    const bx = Math.max(cx + maxR + 68, w - 260);
    const by = h * 0.34;
    const bw = Math.min(200, w - bx - 40);
    if (bw > 90) {
      const eb = t.effBuckets;
      const tot = Math.max(0.1, eb.regenSec + eb.sweetSec + eb.midSec + eb.highSec);
      const zones = [
        { label: 'Net Regen (<0 Wh/mi)', sec: eb.regenSec, col: COLORS.emerald },
        { label: 'Sweet Spot (0–260)', sec: eb.sweetSec, col: COLORS.cyan },
        { label: 'Moderate (260–400)', sec: eb.midSec, col: COLORS.amber },
        { label: 'Peak Climb (>400)', sec: eb.highSec, col: COLORS.coral },
      ];
      ctx.fillStyle = 'rgba(226,232,240,0.88)';
      ctx.font = '600 12px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('Efficiency Zones', bx, by - 18);

      zones.forEach((z, idx) => {
        const y = by + idx * 46;
        const pct = z.sec / tot;
        ctx.fillStyle = 'rgba(226,232,240,0.82)';
        ctx.font = '500 11px "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillText(z.label, bx, y);
        ctx.textAlign = 'right';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.fillText(`${Math.round(pct * 100)}%`, bx + bw, y);
        ctx.textAlign = 'left';

        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.beginPath();
        ctx.roundRect(bx, y + 7, bw, 8, 4);
        ctx.fill();
        ctx.fillStyle = z.col;
        ctx.beginPath();
        ctx.roundRect(bx, y + 7, Math.max(4, bw * pct), 8, 4);
        ctx.fill();
      });
    }
  });

  return (
    <div className="relative h-full w-full">
      <StageHeader viz={VISUALIZATIONS[11]} />
      <canvas ref={ref} data-testid="viz-canvas" className="block h-full w-full" />
    </div>
  );
}

// 12: Dead-Reckoning Ribbon Map (2D Heading x Speed x Grade x Apex Beacons)
export function ViewDeadReckoningMap({ tripRef }: VizProps) {
  const ref = useCanvasLoop((ctx, w, h, now) => {
    const t = tripRef.current;
    const pts = t.pathPoints;
    const padX = 80;
    const padTop = 124;
    const padBot = 58;

    // Subtle cartographic grid
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for (let x = padX; x < w - padX; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, h - padBot);
      ctx.stroke();
    }
    for (let y = padTop; y < h - padBot; y += 64) {
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(w - padX, y);
      ctx.stroke();
    }

    if (pts.length < 2) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.xM);
      maxX = Math.max(maxX, p.xM);
      minY = Math.min(minY, p.yM);
      maxY = Math.max(maxY, p.yM);
    }
    const spanX = Math.max(120, maxX - minX);
    const spanY = Math.max(120, maxY - minY);
    const availW = w - padX * 2;
    const availH = h - padTop - padBot;
    const scale = Math.min(availW / spanX, availH / spanY) * 0.88;
    const offX = padX + (availW - spanX * scale) / 2 - minX * scale;
    const offY = padTop + (availH - spanY * scale) / 2 - minY * scale;

    const toScreen = (p: { xM: number; yM: number }) => ({
      x: p.xM * scale + offX,
      y: p.yM * scale + offY,
    });

    // Elevation shadow echo offset beneath the driven ribbon
    ctx.beginPath();
    pts.forEach((p, idx) => {
      const s = toScreen(p);
      const lift = clamp((p.alt - t.minAlt) / Math.max(80, t.maxAlt - t.minAlt), 0, 1) * 18;
      if (idx === 0) ctx.moveTo(s.x, s.y + 14 - lift);
      else ctx.lineTo(s.x, s.y + 14 - lift);
    });
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Grade-colored, speed-weighted route ribbon + apex turn beacons
    for (let i = 1; i < pts.length; i++) {
      const p0 = toScreen(pts[i - 1]);
      const p1 = toScreen(pts[i]);
      const cur = pts[i];
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = gradeColor(cur.grd, 0.9);
      ctx.lineWidth = lerp(2.2, 9.5, clamp(cur.spd / 80, 0, 1));
      ctx.lineCap = 'round';
      ctx.stroke();

      if (cur.turnInt > 14 && i % 2 === 0) {
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(236,72,153,0.45)';
        ctx.fill();
      }
    }

    // Start & Live Vehicle Head
    const startS = toScreen(pts[0]);
    ctx.beginPath();
    ctx.arc(startS.x, startS.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.teal;
    ctx.fill();

    const endS = toScreen(pts[pts.length - 1]);
    const hRad = ((t.headingDeg - 90) * Math.PI) / 180;
    ctx.beginPath();
    ctx.arc(endS.x, endS.y, 11 + Math.sin(now * 0.008) * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6,182,212,0.22)';
    ctx.fill();

    ctx.save();
    ctx.translate(endS.x, endS.y);
    ctx.rotate(hRad);
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-7, -6);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-7, 6);
    ctx.closePath();
    ctx.fillStyle = COLORS.white;
    ctx.fill();
    ctx.restore();

    // Footer legend
    ctx.fillStyle = 'rgba(148,163,184,0.85)';
    ctx.font = '500 11px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('Ribbon Width = Speed (mph) · Color = Road Grade % · Magenta Dots = Sharp Apexes', padX, h - 22);
    ctx.textAlign = 'right';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillStyle = COLORS.white;
    ctx.fillText(`${t.distanceMiles.toFixed(2)} mi mapped`, w - padX, h - 22);
    ctx.textAlign = 'left';
  });

  return (
    <div className="relative h-full w-full">
      <StageHeader viz={VISUALIZATIONS[12]} />
      <canvas ref={ref} data-testid="viz-canvas" className="block h-full w-full" />
    </div>
  );
}

// 13: The G-G Traction Mandala (Lateral x Longitudinal G-Force Orbit)
export function ViewGGMandala({ tripRef }: VizProps) {
  const ref = useCanvasLoop((ctx, w, h, now) => {
    const t = tripRef.current;
    const cx = w * 0.5;
    const cy = h * 0.54;
    const maxR = Math.min(w, h) * 0.36;
    const maxG = 0.45;

    // Concentric G-rings (0.15G, 0.30G, 0.45G)
    [0.15, 0.3, 0.45].forEach((gRing) => {
      const r = (gRing / maxG) * maxR;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(148,163,184,0.6)';
      ctx.font = '500 10px "JetBrains Mono", monospace';
      ctx.fillText(`${gRing.toFixed(2)}G`, cx + 6, cy - r + 12);
    });

    // Crosshairs
    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.beginPath();
    ctx.moveTo(cx - maxR, cy);
    ctx.lineTo(cx + maxR, cy);
    ctx.moveTo(cx, cy - maxR);
    ctx.lineTo(cx, cy + maxR);
    ctx.stroke();

    // Sector dwell petals underneath
    let maxSec = 0.1;
    for (let i = 0; i < 16; i++) maxSec = Math.max(maxSec, t.ggSectors[i]);
    const stepA = (Math.PI * 2) / 16;
    for (let i = 0; i < 16; i++) {
      const a = i * stepA;
      const r = Math.pow(t.ggSectors[i] / maxSec, 0.7) * maxR * 0.78;
      if (r < 4) continue;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a - stepA * 0.35, a + stepA * 0.35);
      ctx.closePath();
      ctx.fillStyle = Math.sin(a) < 0 ? 'rgba(245,158,11,0.14)' : 'rgba(20,184,166,0.16)';
      ctx.fill();
    }

    // Glowing G-force comet filament
    const trail = t.ggTrail;
    for (let i = 1; i < trail.length; i++) {
      const p0 = trail[i - 1];
      const p1 = trail[i];
      const x0 = cx + clamp(p0.latG / maxG, -1.05, 1.05) * maxR;
      const y0 = cy - clamp(p0.longG / maxG, -1.05, 1.05) * maxR;
      const x1 = cx + clamp(p1.latG / maxG, -1.05, 1.05) * maxR;
      const y1 = cy - clamp(p1.longG / maxG, -1.05, 1.05) * maxR;
      const fade = i / trail.length;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = speedColor(p1.spd, 0.14 + fade * 0.8);
      ctx.lineWidth = 1.5 + fade * 2.8;
      ctx.stroke();
    }

    // Live vector & dot
    const lx = cx + clamp(t.latG / maxG, -1.05, 1.05) * maxR;
    const ly = cy - clamp(t.longG / maxG, -1.05, 1.05) * maxR;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(lx, ly);
    ctx.strokeStyle = 'rgba(248,250,252,0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(lx, ly, 9 + Math.sin(now * 0.008) * 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(236,72,153,0.28)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lx, ly, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.white;
    ctx.fill();

    // Axis captions
    ctx.textAlign = 'center';
    ctx.font = '600 11px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = COLORS.amber;
    ctx.fillText('ACCEL (+G)', cx, cy - maxR - 14);
    ctx.fillStyle = COLORS.teal;
    ctx.fillText('REGEN (−G)', cx, cy + maxR + 22);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.cyan;
    ctx.fillText('LEFT TURN', cx - maxR - 14, cy + 4);
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.magenta;
    ctx.fillText('RIGHT TURN', cx + maxR + 14, cy + 4);
  });

  return (
    <div className="relative h-full w-full">
      <StageHeader viz={VISUALIZATIONS[13]} />
      <canvas ref={ref} data-testid="viz-canvas" className="block h-full w-full" />
    </div>
  );
}

// 14: Aero vs. Gravity Tug-of-War (Real-Time Physics Force Balance)
export function ViewForceTugOfWar({ tripRef }: VizProps) {
  const ref = useCanvasLoop((ctx, w, h) => {
    const t = tripRef.current;
    const fs = t.forceStream;
    const padX = 64;
    const drawW = w - padX * 2;
    const hy = h * 0.62;
    const upScale = (hy - 134) / 3.4; // max ~3.4 kN upward
    const downScale = (h - 58 - hy) / 2.6;

    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(padX, hy);
    ctx.lineTo(w - padX, hy);
    ctx.stroke();

    if (fs.length < 2) return;

    const rollPts = fs.map((f, i) => ({
      x: padX + (i / (fs.length - 1)) * drawW,
      y: clamp(hy - f.fRoll * upScale, 130, hy),
    }));
    const aeroPts = fs.map((f, i) => ({
      x: padX + (i / (fs.length - 1)) * drawW,
      y: clamp(hy - (f.fRoll + f.fAero) * upScale, 130, hy),
    }));
    const climbPts = fs.map((f, i) => ({
      x: padX + (i / (fs.length - 1)) * drawW,
      y: clamp(hy - (f.fRoll + f.fAero + f.fClimb) * upScale, 130, hy),
    }));
    const regenPts = fs.map((f, i) => ({
      x: padX + (i / (fs.length - 1)) * drawW,
      y: clamp(hy + f.fRegen * downScale, hy, h - 56),
    }));

    const drawStackedBand = (
      topPts: { x: number; y: number }[],
      botPts: { x: number; y: number }[],
      fill: string,
      stroke: string
    ) => {
      ctx.beginPath();
      traceSmooth(ctx, topPts, { minY: 130, maxY: h - 56, moveToStart: true });
      const rev = [...botPts].reverse();
      ctx.lineTo(rev[0].x, rev[0].y);
      traceSmooth(ctx, rev, { minY: 130, maxY: h - 56, moveToStart: false });
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();

      ctx.beginPath();
      traceSmooth(ctx, topPts, { minY: 130, maxY: h - 56, moveToStart: true });
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    const baseLine = fs.map((_, i) => ({ x: padX + (i / (fs.length - 1)) * drawW, y: hy }));

    drawStackedBand(climbPts, aeroPts, 'rgba(244,63,94,0.45)', COLORS.coral);
    drawStackedBand(aeroPts, rollPts, 'rgba(6,182,212,0.5)', COLORS.cyan);
    drawStackedBand(rollPts, baseLine, 'rgba(20,184,166,0.4)', COLORS.teal);
    drawStackedBand(regenPts, baseLine, 'rgba(16,185,129,0.52)', COLORS.emerald);

    // Live kN callouts on right edge
    const last = fs[fs.length - 1];
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillStyle = COLORS.coral;
    ctx.fillText(`Gravity Climb: ${last.fClimb.toFixed(2)} kN`, padX, 134);
    ctx.fillStyle = COLORS.cyan;
    ctx.fillText(`Aero Drag (v²): ${last.fAero.toFixed(2)} kN`, padX + 185, 134);
    ctx.fillStyle = COLORS.teal;
    ctx.fillText(`Rolling: ${last.fRoll.toFixed(2)} kN`, padX + 370, 134);
    ctx.fillStyle = COLORS.emerald;
    ctx.fillText(`Regen Assist: ${last.fRegen.toFixed(2)} kN`, padX + 510, 134);
  });

  return (
    <div className="relative h-full w-full">
      <StageHeader viz={VISUALIZATIONS[14]} />
      <canvas ref={ref} data-testid="viz-canvas" className="block h-full w-full" />
    </div>
  );
}

// 15: Trip Symphony Loom (4-Track Synchronized Speed, Grade, Turn, Power)
export function ViewTripSymphony({ tripRef }: VizProps) {
  const ref = useCanvasLoop((ctx, w, h) => {
    const t = tripRef.current;
    const st = t.stream;
    const padL = 138;
    const padR = 54;
    const drawW = w - padL - padR;
    const topY = 122;
    const botY = h - 42;
    const trackH = (botY - topY) / 4;

    const tracks = [
      { label: 'PACE (MPH)', color: COLORS.cyan },
      { label: 'GRADE (%)', color: COLORS.coral },
      { label: 'STEERING (°/s)', color: COLORS.magenta },
      { label: 'NET POWER (kW)', color: COLORS.amber },
    ];

    tracks.forEach((tr, idx) => {
      const cy = topY + (idx + 0.5) * trackH;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, cy);
      ctx.lineTo(w - padR, cy);
      ctx.stroke();

      ctx.fillStyle = tr.color;
      ctx.font = '700 11px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(tr.label, padL - 16, cy + 4);
    });
    ctx.textAlign = 'left';

    if (st.length < 2) return;

    const amp = trackH * 0.4;
    const y0 = topY + 0.5 * trackH;
    const y1 = topY + 1.5 * trackH;
    const y2 = topY + 2.5 * trackH;
    const y3 = topY + 3.5 * trackH;

    // Harmonic resonance vertical threads when climb + turn + power align
    st.forEach((p, i) => {
      if (i % 3 !== 0) return;
      const x = padL + (i / (st.length - 1)) * drawW;
      if (Math.abs(p.trn) > 12 && p.netKw > 25) {
        ctx.strokeStyle = 'rgba(248,250,252,0.08)';
        ctx.beginPath();
        ctx.moveTo(x, y0 - amp * 0.6);
        ctx.lineTo(x, y3 + amp * 0.6);
        ctx.stroke();
      }
    });

    // Track 1: Speed envelope
    const sPts = st.map((p, i) => ({
      x: padL + (i / (st.length - 1)) * drawW,
      y: y0 + amp * 0.7 - (clamp(p.spd / 85, 0, 1) * amp * 1.4),
    }));
    ctx.beginPath();
    traceSmooth(ctx, sPts, { minY: y0 - amp, maxY: y0 + amp, moveToStart: true });
    ctx.strokeStyle = COLORS.cyan;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Track 2: Grade mirrored wave
    const gTop = st.map((p, i) => ({
      x: padL + (i / (st.length - 1)) * drawW,
      y: y1 - clamp(Math.abs(p.grd) / 9, 0.05, 1) * amp,
    }));
    const gBot = st.map((p, i) => ({
      x: padL + (i / (st.length - 1)) * drawW,
      y: y1 + clamp(Math.abs(p.grd) / 9, 0.05, 1) * amp,
    }));
    ctx.beginPath();
    traceSmooth(ctx, gTop, { minY: y1 - amp, maxY: y1, moveToStart: true });
    const gRev = [...gBot].reverse();
    ctx.lineTo(gRev[0].x, gRev[0].y);
    traceSmooth(ctx, gRev, { minY: y1, maxY: y1 + amp, moveToStart: false });
    ctx.closePath();
    ctx.fillStyle = gradeColor(st[st.length - 1].grd, 0.42);
    ctx.fill();
    ctx.beginPath();
    traceSmooth(ctx, gTop, { minY: y1 - amp, maxY: y1, moveToStart: true });
    ctx.strokeStyle = COLORS.coral;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Track 3: Turn rate oscillation
    const tPts = st.map((p, i) => ({
      x: padL + (i / (st.length - 1)) * drawW,
      y: y2 - clamp(p.trn / 28, -1, 1) * amp,
    }));
    ctx.beginPath();
    traceSmooth(ctx, tPts, { minY: y2 - amp, maxY: y2 + amp, moveToStart: true });
    ctx.strokeStyle = COLORS.magenta;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Track 4: Net kW bars (amber positive, emerald negative regen)
    const barW = Math.max(2, drawW / st.length - 1);
    st.forEach((p, i) => {
      const x = padL + (i / (st.length - 1)) * drawW;
      const norm = clamp(p.netKw / 75, -1, 1);
      const bh = Math.abs(norm) * amp;
      ctx.fillStyle = norm >= 0 ? 'rgba(245,158,11,0.82)' : 'rgba(16,185,129,0.88)';
      ctx.fillRect(x - barW / 2, norm >= 0 ? y3 - bh : y3, barW, Math.max(2, bh));
    });
  });

  return (
    <div className="relative h-full w-full">
      <StageHeader viz={VISUALIZATIONS[15]} />
      <canvas ref={ref} data-testid="viz-canvas" className="block h-full w-full" />
    </div>
  );
}
