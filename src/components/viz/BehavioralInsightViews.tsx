import React, { MutableRefObject } from 'react';
import { COLORS, TripData, VISUALIZATIONS } from '../../telemetry/types';
import {
  clamp,
  computePersonaScores,
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

// 16: Elevation-Velocity Phase Portrait (Speed x Altitude State-Space Loops)
export function ViewPhasePortrait({ tripRef }: VizProps) {
  const ref = useCanvasLoop((ctx, w, h, now) => {
    const t = tripRef.current;
    const padL = 88;
    const padR = 56;
    const topY = 124;
    const botY = h - 56;
    const plotW = w - padL - padR;
    const plotH = botY - topY;

    const minA = Math.floor(t.minAlt / 25) * 25;
    const maxA = Math.max(minA + 100, Math.ceil(t.maxAlt / 25) * 25);
    const spanA = maxA - minA;

    // Subtle coordinate grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    [0, 15, 30, 45, 60, 75, 90].forEach((mph) => {
      const x = padL + (mph / 90) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, topY);
      ctx.lineTo(x, botY);
      ctx.stroke();
      ctx.fillStyle = 'rgba(148,163,184,0.8)';
      ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${mph} mph`, x, botY + 22);
    });
    for (let i = 0; i <= 4; i++) {
      const alt = minA + (spanA * i) / 4;
      const y = botY - (i / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(148,163,184,0.8)';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(alt)} ft`, padL - 12, y + 4);
    }
    ctx.textAlign = 'left';

    const trail = t.phaseTrail;
    for (let i = 1; i < trail.length; i++) {
      const p0 = trail[i - 1];
      const p1 = trail[i];
      const x0 = padL + clamp(p0.spd / 90, 0, 1) * plotW;
      const y0 = botY - clamp((p0.alt - minA) / spanA, 0, 1) * plotH;
      const x1 = padL + clamp(p1.spd / 90, 0, 1) * plotW;
      const y1 = botY - clamp((p1.alt - minA) / spanA, 0, 1) * plotH;
      const fade = i / trail.length;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = efficiencyColor(p1.whPerMi, 0.16 + fade * 0.8);
      ctx.lineWidth = 1.6 + fade * 3.0;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    const cx = padL + clamp(t.speedMph / 90, 0, 1) * plotW;
    const cy = botY - clamp((t.altFt - minA) / spanA, 0, 1) * plotH;
    ctx.beginPath();
    ctx.arc(cx, cy, 9 + Math.sin(now * 0.008) * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = efficiencyColor(t.whPerMi, 0.25);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.white;
    ctx.fill();
  });

  return (
    <div className="relative h-full w-full">
      <StageHeader viz={VISUALIZATIONS[16]} />
      <canvas ref={ref} data-testid="viz-canvas" className="block h-full w-full" />
    </div>
  );
}

// 17: Cadence Time Spiral (Unfolding Archimedean Spiral of Pace, Stops & Regen)
export function ViewCadenceSpiral({ tripRef }: VizProps) {
  const ref = useCanvasLoop((ctx, w, h, now) => {
    const t = tripRef.current;
    const cx = w * 0.5;
    const cy = h * 0.54;
    const maxR = Math.min(w, h) * 0.39;
    const startR = 24;
    const slices = t.spiralSlices;

    // Subtle concentric ring markers
    [0.33, 0.66, 1.0].forEach((f) => {
      ctx.beginPath();
      ctx.arc(cx, cy, lerp(startR, maxR, f), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    const total = Math.max(120, slices.length);
    const turns = Math.max(2.5, total / 75);
    const ptFor = (idx: number) => {
      const frac = idx / total;
      const angle = -Math.PI / 2 + frac * turns * Math.PI * 2;
      const r = lerp(startR, maxR, frac);
      return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
    };

    for (let i = 1; i < slices.length; i++) {
      const s = slices[i];
      const p0 = ptFor(i - 1);
      const p1 = ptFor(i);

      if (s.isStop) {
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = 'rgba(244,63,94,0.28)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = s.isRegen ? COLORS.emerald : speedColor(s.spd, 0.9);
        ctx.lineWidth = lerp(2.5, 11, clamp(s.spd / 80, 0, 1));
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }

    if (slices.length > 0) {
      const tip = ptFor(slices.length - 1);
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 7 + Math.sin(now * 0.008) * 2, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.white;
      ctx.fill();
    }

    // Legend
    ctx.font = '500 11px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = COLORS.cyan;
    ctx.fillText('● Highway / Cruise Arc', 56, h - 24);
    ctx.fillStyle = COLORS.amber;
    ctx.fillText('● High Pace', 216, h - 24);
    ctx.fillStyle = COLORS.emerald;
    ctx.fillText('● Regen Glide', 310, h - 24);
    ctx.fillStyle = COLORS.coral;
    ctx.fillText('— Complete Stop', 418, h - 24);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(226,232,240,0.85)';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillText(`${slices.length}s spiraled`, w - 56, h - 24);
    ctx.textAlign = 'left';
  });

  return (
    <div className="relative h-full w-full">
      <StageHeader viz={VISUALIZATIONS[17]} />
      <canvas ref={ref} data-testid="viz-canvas" className="block h-full w-full" />
    </div>
  );
}

// 18: Grade-Bucket Violin Orchestra (7 Road Steepnesses x Speed Density Violins)
export function ViewGradeViolins({ tripRef }: VizProps) {
  const GRADES = ['≤ −5%', '−3%', '−1%', '0% Flat', '+1%', '+3%', '≥ +5%'];
  const GRADE_VALS = [-6, -3, -1, 0, 1, 3, 6];

  const ref = useCanvasLoop((ctx, w, h) => {
    const t = tripRef.current;
    const padL = 82;
    const padR = 56;
    const topY = 128;
    const botY = h - 56;
    const colW = (w - padL - padR) / 7;
    const plotH = botY - topY;

    // Horizontal speed axis lines (0, 30, 60, 90 mph)
    [0, 30, 60, 90].forEach((mph) => {
      const y = botY - (mph / 90) * plotH;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(148,163,184,0.8)';
      ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${mph}mph`, padL - 10, y + 4);
    });
    ctx.textAlign = 'left';

    const activeGradeIdx = clamp(Math.round((t.gradePct + 6) / 2), 0, 6);

    for (let g = 0; g < 7; g++) {
      const cx = padL + (g + 0.5) * colW;
      const isAct = g === activeGradeIdx;
      const col = gradeColor(GRADE_VALS[g]);

      // Vertical spine
      ctx.strokeStyle = isAct ? 'rgba(248,250,252,0.28)' : 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.moveTo(cx, topY);
      ctx.lineTo(cx, botY);
      ctx.stroke();

      let maxBin = 0.05;
      for (let b = 0; b < 18; b++) {
        maxBin = Math.max(maxBin, t.gradeSpeedViolin[g * 18 + b]);
      }

      if (t.gradeBandTime[g] > 0.1) {
        const rightPts = [];
        const leftPts = [];
        const halfMaxW = colW * 0.42;

        for (let b = 0; b < 18; b++) {
          const prev = t.gradeSpeedViolin[g * 18 + Math.max(0, b - 1)];
          const cur = t.gradeSpeedViolin[g * 18 + b];
          const next = t.gradeSpeedViolin[g * 18 + Math.min(17, b + 1)];
          const smooth = (prev * 0.25 + cur * 0.5 + next * 0.25) / maxBin;
          const halfW = Math.pow(smooth, 0.72) * halfMaxW;
          const y = botY - ((b + 0.5) / 18) * plotH;
          rightPts.push({ x: cx + halfW, y });
          leftPts.push({ x: cx - halfW, y });
        }

        ctx.beginPath();
        traceSmooth(ctx, rightPts, { minY: topY, maxY: botY, moveToStart: true });
        const revLeft = [...leftPts].reverse();
        ctx.lineTo(revLeft[0].x, revLeft[0].y);
        traceSmooth(ctx, revLeft, { minY: topY, maxY: botY, moveToStart: false });
        ctx.closePath();
        ctx.fillStyle = gradeColor(GRADE_VALS[g], isAct ? 0.65 : 0.38);
        ctx.fill();
        ctx.strokeStyle = isAct ? COLORS.white : col;
        ctx.lineWidth = isAct ? 2 : 1.2;
        ctx.stroke();
      }

      if (isAct) {
        const curY = botY - clamp(t.speedMph / 90, 0, 1) * plotH;
        ctx.beginPath();
        ctx.arc(cx, curY, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.white;
        ctx.fill();
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = isAct ? COLORS.white : col;
      ctx.font = isAct
        ? '700 12px "JetBrains Mono", monospace'
        : '600 11px "JetBrains Mono", monospace';
      ctx.fillText(GRADES[g], cx, botY + 24);
    }
    ctx.textAlign = 'left';
  });

  return (
    <div className="relative h-full w-full">
      <StageHeader viz={VISUALIZATIONS[18]} />
      <canvas ref={ref} data-testid="viz-canvas" className="block h-full w-full" />
    </div>
  );
}

// 19: Regen Harvest Ledger (Braking Harvest Blooms & Reclaimed Range Miles)
export function ViewRegenHarvest({ tripRef }: VizProps) {
  const ref = useCanvasLoop((ctx, w, h) => {
    const t = tripRef.current;
    const padX = 64;
    const topY = 128;
    const botY = h - 58;
    const plotW = w - padX * 2;
    const plotH = botY - topY;

    const totalMilesReclaimed = (t.regenKwh * 1000) / 260;
    const maxScaleMi = Math.max(0.2, totalMilesReclaimed * 1.25);

    // Baseline
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(padX, botY);
    ctx.lineTo(w - padX, botY);
    ctx.stroke();

    const eps = [...t.regenEpisodes];
    if (t._activeRegenEp) {
      eps.push({
        tStart: t._activeRegenEp.tStart,
        durSec: t._activeRegenEp.durSec,
        kwh: t._activeRegenEp.kwh,
        peakKw: t._activeRegenEp.peakKw,
        avgGrd: t._activeRegenEp.grdSum / Math.max(0.01, t._activeRegenEp.durSec),
        cumMilesReclaimed: totalMilesReclaimed,
      });
    }

    if (eps.length > 0) {
      let maxKwh = 0.005;
      eps.forEach((e) => (maxKwh = Math.max(maxKwh, e.kwh)));

      // Cumulative reclaimed miles ribbon
      const cumPts = eps.map((e, idx) => ({
        x: padX + ((idx + 0.5) / Math.max(1, eps.length)) * plotW,
        y: botY - clamp(e.cumMilesReclaimed / maxScaleMi, 0, 1) * (plotH * 0.85),
      }));

      if (cumPts.length >= 2) {
        const g = ctx.createLinearGradient(0, topY, 0, botY);
        g.addColorStop(0, 'rgba(16,185,129,0.28)');
        g.addColorStop(1, 'rgba(20,184,166,0.03)');
        ctx.beginPath();
        ctx.moveTo(padX, botY);
        traceSmooth(ctx, cumPts, { minY: topY, maxY: botY, moveToStart: false });
        ctx.lineTo(cumPts[cumPts.length - 1].x, botY);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();

        ctx.beginPath();
        traceSmooth(ctx, cumPts, { minY: topY, maxY: botY, moveToStart: true });
        ctx.strokeStyle = COLORS.emerald;
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }

      // Individual harvest bloom stems
      eps.forEach((e, idx) => {
        const x = padX + ((idx + 0.5) / Math.max(1, eps.length)) * plotW;
        const stemH = Math.max(18, Math.pow(e.kwh / maxKwh, 0.7) * (plotH * 0.62));
        const topBloomY = botY - stemH;
        const r = clamp(4 + (e.peakKw / 45) * 10, 4, 15);
        const col = e.avgGrd < -2 ? COLORS.emerald : COLORS.magenta;

        ctx.strokeStyle = mixColor(col, COLORS.teal, 0.3, 0.55);
        ctx.lineWidth = clamp(e.durSec * 0.4, 1.5, 5);
        ctx.beginPath();
        ctx.moveTo(x, botY);
        ctx.lineTo(x, topBloomY);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, topBloomY, r, 0, Math.PI * 2);
        ctx.fillStyle = mixColor(col, COLORS.white, 0.2, 0.85);
        ctx.fill();
      });
    } else {
      ctx.fillStyle = 'rgba(148,163,184,0.75)';
      ctx.font = '500 13px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Accelerating or cruising — harvest blooms appear on braking & descents', w / 2, h * 0.54);
      ctx.textAlign = 'left';
    }

    ctx.fillStyle = COLORS.emerald;
    ctx.font = '700 14px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(
      `+${totalMilesReclaimed.toFixed(2)} mi reclaimed (${t.regenKwh.toFixed(3)} kWh)`,
      w - padX,
      topY - 8
    );
    ctx.textAlign = 'left';
  });

  return (
    <div className="relative h-full w-full">
      <StageHeader viz={VISUALIZATIONS[19]} />
      <canvas ref={ref} data-testid="viz-canvas" className="block h-full w-full" />
    </div>
  );
}

// 20: Driving Persona Fingerprint (6-Axis Behavioral Radar)
export function ViewDrivingPersona({ tripRef }: VizProps) {
  const ref = useCanvasLoop((ctx, w, h) => {
    const t = tripRef.current;
    const axes = computePersonaScores(t);
    const cx = w * 0.5;
    const cy = h * 0.55;
    const maxR = Math.min(w, h) * 0.34;
    const stepA = (Math.PI * 2) / 6;

    // Hexagonal contour rings
    [0.25, 0.5, 0.75, 1.0].forEach((f) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + i * stepA;
        const x = cx + Math.cos(a) * maxR * f;
        const y = cy + Math.sin(a) * maxR * f;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Radial spokes & labels
    axes.forEach((ax, i) => {
      const a = -Math.PI / 2 + i * stepA;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.stroke();

      const lx = cx + Math.cos(a) * (maxR + 30);
      const ly = cy + Math.sin(a) * (maxR + 30);
      ctx.textAlign = Math.cos(a) > 0.25 ? 'left' : Math.cos(a) < -0.25 ? 'right' : 'center';
      ctx.fillStyle = COLORS.white;
      ctx.font = '600 12px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(ax.label, lx, ly - 3);
      ctx.fillStyle = 'rgba(148,163,184,0.85)';
      ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.fillText(ax.detail, lx, ly + 13);
    });
    ctx.textAlign = 'left';

    // Cumulative Trip Polygon
    ctx.beginPath();
    axes.forEach((ax, i) => {
      const a = -Math.PI / 2 + i * stepA;
      const r = ax.tripScore * maxR;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxR);
    grad.addColorStop(0, 'rgba(6,182,212,0.18)');
    grad.addColorStop(1, 'rgba(236,72,153,0.48)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = COLORS.cyan;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Live-Moment Shadow Polygon
    ctx.beginPath();
    axes.forEach((ax, i) => {
      const a = -Math.PI / 2 + i * stepA;
      const r = ax.liveScore * maxR;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(245,158,11,0.16)';
    ctx.fill();
    ctx.strokeStyle = COLORS.amber;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Legend
    ctx.font = '500 11px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = COLORS.cyan;
    ctx.fillText('● Cumulative Trip Signature', 56, h - 24);
    ctx.fillStyle = COLORS.amber;
    ctx.fillText('--- Live Instantaneous Pulse', 250, h - 24);
  });

  return (
    <div className="relative h-full w-full">
      <StageHeader viz={VISUALIZATIONS[20]} />
      <canvas ref={ref} data-testid="viz-canvas" className="block h-full w-full" />
    </div>
  );
}
