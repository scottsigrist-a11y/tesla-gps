import React, { MutableRefObject } from 'react';
import { COLORS, LANDMARKS, TripData, VISUALIZATIONS } from '../../telemetry/types';
import {
  clamp,
  lerp,
  mixColor,
  speedColor,
  traceSmooth,
} from '../../telemetry/math';
import { StageHeader, useCanvasLoop } from '../CanvasStage';

interface VizProps {
  tripRef: MutableRefObject<TripData>;
}

// 05: The Rhythm of the Road (Stop-and-Go Barcode)
export function ViewRoadBarcode({ tripRef }: VizProps) {
  const ref = useCanvasLoop((ctx, w, h, now) => {
    const t = tripRef.current;
    const padX = 56;
    const stripW = w - padX * 2;
    const stripH = h * 0.48;
    const cy = h * 0.54;
    const topY = cy - stripH / 2;
    const botY = cy + stripH / 2;

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(padX, topY, stripW, stripH);

    const bars = t.barcodeBars;
    const slotW = stripW / Math.max(40, bars.length);
    const barW = Math.max(1.5, slotW * 0.78);

    bars.forEach((b, i) => {
      const bx = padX + i * slotW;
      if (b.isStop) {
        ctx.fillStyle = '#030407';
        ctx.fillRect(bx, topY + 2, barW, stripH - 4);
        ctx.fillStyle = 'rgba(244,63,94,0.45)';
        ctx.fillRect(bx, botY - 3, barW, 2);
      } else if (b.avg >= 50) {
        const bh = stripH * clamp((b.avg - 45) / 38, 0.72, 0.96);
        ctx.fillStyle = 'rgba(248,250,252,0.8)';
        ctx.fillRect(bx, cy - bh / 2, barW, bh);
      } else if (b.avg >= 18) {
        const bh = stripH * lerp(0.38, 0.68, (b.avg - 18) / 32);
        ctx.fillStyle = speedColor(b.avg, 0.78);
        ctx.fillRect(bx, cy - bh / 2, barW, bh);
      } else {
        const bh = stripH * lerp(0.18, 0.34, b.avg / 18);
        ctx.fillStyle = 'rgba(245,158,11,0.9)';
        ctx.fillRect(bx, cy - bh / 2, barW, bh);
      }
    });

    const curX = Math.min(padX + stripW - 3, padX + bars.length * slotW);
    ctx.fillStyle = `rgba(6,182,212,${0.55 + 0.45 * Math.sin(now * 0.008)})`;
    ctx.fillRect(curX, topY - 10, 2.5, stripH + 20);

    const ly = botY + 34;
    ctx.font = '500 12px "Plus Jakarta Sans", system-ui, sans-serif';
    const legItems = [
      { label: '▮ Highway Cruise (50+ mph)', color: 'rgba(248,250,252,0.85)' },
      { label: '▮ Urban Flow (18–49 mph)', color: COLORS.teal },
      { label: '▪ Slow Traffic (2–17 mph)', color: COLORS.amber },
      { label: '▯ Black Gap = Complete Stop', color: COLORS.coral },
    ];
    legItems.forEach((item, idx) => {
      ctx.fillStyle = item.color;
      ctx.fillText(item.label, padX + idx * Math.min(210, (stripW - 110) / 4), ly);
    });

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(148,163,184,0.75)';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillText(`${bars.length * 2}s encoded`, padX + stripW, ly);
    ctx.textAlign = 'left';
  });

  return (
    <div className="relative h-full w-full">
      <StageHeader viz={VISUALIZATIONS[5]} />
      <canvas ref={ref} data-testid="viz-canvas" className="block h-full w-full" />
    </div>
  );
}

// 06: Kinetic Energy Sankey Flow
export function ViewSankeyFlow({ tripRef }: VizProps) {
  const ref = useCanvasLoop((ctx, w, h, now) => {
    const t = tripRef.current;
    const total = Math.max(0.002, t.aeroKwh + t.climbKwh + t.regenKwh);
    const streams = [
      { label: 'Aerodynamic Cruise', kwh: t.aeroKwh, kw: t.instAeroKw, color: COLORS.cyan, yRatio: 0.34 },
      { label: 'Elevation Climb', kwh: t.climbKwh, kw: t.instClimbKw, color: COLORS.coral, yRatio: 0.56 },
      { label: 'Regen Recovery', kwh: t.regenKwh, kw: t.instRegenKw, color: COLORS.emerald, yRatio: 0.78 },
    ];

    const startX = 186;
    const endX = w - 270;
    const maxThick = h * 0.44;
    const thicks = streams.map((s) => Math.max(10, (s.kwh / total) * maxThick));
    const totalThick = thicks.reduce((a, b) => a + b, 0);

    const srcCy = h * 0.55;
    const srcTop = srcCy - totalThick / 2;
    ctx.fillStyle = 'rgba(248,250,252,0.06)';
    ctx.strokeStyle = 'rgba(248,250,252,0.24)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(56, srcTop - 16, 130, totalThick + 32, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.white;
    ctx.font = '700 13px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Trip Energy', 121, srcCy - 6);
    ctx.fillStyle = 'rgba(148,163,184,0.9)';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillText(`${total.toFixed(3)} kWh`, 121, srcCy + 14);
    ctx.textAlign = 'left';

    let yCursor = srcTop;
    streams.forEach((s, idx) => {
      const th = thicks[idx];
      const y1 = yCursor + th / 2;
      const y2 = h * s.yRatio;
      yCursor += th;

      const cp1x = lerp(startX, endX, 0.44);
      const cp2x = lerp(startX, endX, 0.56);
      const grad = ctx.createLinearGradient(startX, 0, endX, 0);
      grad.addColorStop(0, mixColor(COLORS.white, s.color, 0.5, 0.32));
      grad.addColorStop(1, mixColor(s.color, s.color, 1, 0.76));

      ctx.beginPath();
      ctx.moveTo(startX, y1 - th / 2);
      ctx.bezierCurveTo(cp1x, y1 - th / 2, cp2x, y2 - th / 2, endX, y2 - th / 2);
      ctx.lineTo(endX, y2 + th / 2);
      ctx.bezierCurveTo(cp2x, y2 + th / 2, cp1x, y1 + th / 2, startX, y1 + th / 2);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      const pulseSpeed = clamp(s.kw / 25, 0.12, 1.4);
      for (let p = 0; p < 4; p++) {
        const u = (now * 0.00028 * pulseSpeed + p * 0.25 + idx * 0.13) % 1;
        const inv = 1 - u;
        const px =
          inv ** 3 * startX +
          3 * inv ** 2 * u * cp1x +
          3 * inv * u ** 2 * cp2x +
          u ** 3 * endX;
        const py =
          inv ** 3 * y1 + 3 * inv ** 2 * u * y1 + 3 * inv * u ** 2 * y2 + u ** 3 * y2;
        ctx.beginPath();
        ctx.arc(px, py, clamp(th * 0.16, 2.5, 6), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(248,250,252,0.78)';
        ctx.fill();
      }

      const pct = Math.round((s.kwh / total) * 100);
      ctx.fillStyle = s.color;
      ctx.fillRect(endX, y2 - th / 2, 6, th);
      ctx.fillStyle = COLORS.white;
      ctx.font = '700 15px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(s.label, endX + 18, y2 - 8);
      ctx.fillStyle = 'rgba(148,163,184,0.9)';
      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.fillText(`${pct}% · ${s.kwh.toFixed(3)} kWh (${s.kw.toFixed(1)} kW)`, endX + 18, y2 + 12);
    });
  });

  return (
    <div className="relative h-full w-full">
      <StageHeader viz={VISUALIZATIONS[6]} />
      <canvas ref={ref} data-testid="viz-canvas" className="block h-full w-full" />
    </div>
  );
}

// 07: Altitude vs. Speed Gravity Wells (Bubble Matrix)
export function ViewGravityWells({ tripRef }: VizProps) {
  const ZONES = ['0–14', '15–29', '30–44', '45–59', '60–74', '75+'];
  const ref = useCanvasLoop((ctx, w, h, now) => {
    const t = tripRef.current;
    const padL = 96;
    const padR = 56;
    const topY = 124;
    const botY = h - 58;
    const gridW = w - padL - padR;
    const gridH = botY - topY;
    const colW = gridW / 6;

    const minBand = Math.floor(t.minAlt / 25) * 25;
    const maxBand = Math.max(minBand + 100, Math.floor(t.maxAlt / 25) * 25);
    const bandList: number[] = [];
    const totalBands = Math.floor((maxBand - minBand) / 25) + 1;
    const stepBand = Math.max(1, Math.ceil(totalBands / 7)) * 25;
    for (let b = minBand; b <= maxBand; b += stepBand) bandList.push(b);
    while (bandList.length < 4) bandList.push(bandList[bandList.length - 1] + stepBand);
    const rowH = gridH / bandList.length;

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ZONES.forEach((z, c) => {
      const cx = padL + (c + 0.5) * colW;
      ctx.beginPath();
      ctx.moveTo(padL + c * colW, topY);
      ctx.lineTo(padL + c * colW, botY);
      ctx.stroke();
      ctx.fillStyle = 'rgba(148,163,184,0.85)';
      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${z} mph`, cx, botY + 24);
    });
    bandList.forEach((b, r) => {
      const ry = botY - (r + 0.5) * rowH;
      ctx.beginPath();
      ctx.moveTo(padL, topY + r * rowH);
      ctx.lineTo(w - padR, topY + r * rowH);
      ctx.stroke();
      ctx.fillStyle = 'rgba(148,163,184,0.85)';
      ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(b)} ft`, padL - 12, ry + 4);
    });
    ctx.textAlign = 'left';

    const cellTotals = new Map<string, number>();
    let maxSec = 0.5;
    t.gravityCells.forEach((sec, key) => {
      const [z, rawBand] = key.split(':').map(Number);
      const rIdx = clamp(Math.floor((rawBand - minBand) / stepBand), 0, bandList.length - 1);
      const dk = `${z}:${rIdx}`;
      const next = (cellTotals.get(dk) || 0) + sec;
      cellTotals.set(dk, next);
      maxSec = Math.max(maxSec, next);
    });

    const curZ = clamp(Math.floor(t.speedMph / 15), 0, 5);
    const curR = clamp(
      Math.floor((Math.floor(t.altFt / 25) * 25 - minBand) / stepBand),
      0,
      bandList.length - 1
    );
    const maxOrbR = Math.min(colW, rowH) * 0.44;

    cellTotals.forEach((sec, dk) => {
      const [z, r] = dk.split(':').map(Number);
      const cx = padL + (z + 0.5) * colW;
      const cy = botY - (r + 0.5) * rowH;
      const isLive = z === curZ && r === curR;
      const pulse = isLive
        ? 1 + 0.08 * Math.sin(now * 0.008)
        : 1 + 0.03 * Math.sin(now * 0.003 + z + r);
      const orbR = Math.max(6, Math.sqrt(sec / maxSec) * maxOrbR) * pulse;
      const col = mixColor(
        speedColor(z * 15 + 7),
        COLORS.magenta,
        r / Math.max(1, bandList.length - 1)
      );

      const rg = ctx.createRadialGradient(cx, cy, orbR * 0.1, cx, cy, orbR * 1.45);
      rg.addColorStop(0, mixColor(col, COLORS.white, 0.3, 0.92));
      rg.addColorStop(0.65, mixColor(col, col, 1, 0.45));
      rg.addColorStop(1, mixColor(col, col, 1, 0));
      ctx.beginPath();
      ctx.arc(cx, cy, orbR * 1.45, 0, Math.PI * 2);
      ctx.fillStyle = rg;
      ctx.fill();

      if (isLive) {
        ctx.beginPath();
        ctx.arc(cx, cy, orbR + 4, 0, Math.PI * 2);
        ctx.strokeStyle = COLORS.white;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
    });
  });

  return (
    <div className="relative h-full w-full">
      <StageHeader viz={VISUALIZATIONS[7]} />
      <canvas ref={ref} data-testid="viz-canvas" className="block h-full w-full" />
    </div>
  );
}

// 08: Cornering Curvature Rings (Concentric G-Turn Ripple)
export function ViewCorneringRings({ tripRef }: VizProps) {
  const ref = useCanvasLoop((ctx, w, h, now) => {
    const t = tripRef.current;
    const cx = w * 0.5;
    const cy = h * 0.53;

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, 100);
    ctx.lineTo(cx, h - 40);
    ctx.stroke();

    ctx.font = '700 12px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = COLORS.cyan;
    ctx.fillText('◀ Left Curvature', 56, h - 28);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.magenta;
    ctx.fillText('Right Curvature ▶', w - 56, h - 28);
    ctx.textAlign = 'left';

    const alive = [];
    for (const r of t.turnRipples) {
      const age = (now - r.born) / 1000;
      if (age > 6.5) continue;
      alive.push(r);
      const rx = r.xNorm * w;
      const ry = r.yNorm * h;
      const baseColor = r.side === 'left' ? COLORS.cyan : COLORS.magenta;
      for (let ring = 0; ring < 3; ring++) {
        const ringAge = age - ring * 0.28;
        if (ringAge <= 0) continue;
        const rad = ringAge * 68 * r.intensity;
        const alpha = clamp((1 - ringAge / 6.0) * 0.65, 0, 0.7);
        ctx.beginPath();
        ctx.arc(rx, ry, rad, 0, Math.PI * 2);
        ctx.strokeStyle = mixColor(baseColor, COLORS.white, ring === 0 ? 0.2 : 0, alpha);
        ctx.lineWidth = ring === 0 ? 2.4 : 1.4;
        ctx.stroke();
      }
    }
    t.turnRipples = alive;

    const steerX = cx + clamp(t.turnRate / 28, -1, 1) * (w * 0.22);
    ctx.beginPath();
    ctx.arc(steerX, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle =
      t.turnRate < -1 ? COLORS.cyan : t.turnRate > 1 ? COLORS.magenta : COLORS.white;
    ctx.fill();
    ctx.fillStyle = 'rgba(226,232,240,0.85)';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${Math.abs(t.turnRate).toFixed(1)}°/s ${
        t.turnRate < -1 ? 'LEFT' : t.turnRate > 1 ? 'RIGHT' : 'STRAIGHT'
      }`,
      cx,
      118
    );
    ctx.textAlign = 'left';
  });

  return (
    <div className="relative h-full w-full">
      <StageHeader viz={VISUALIZATIONS[8]} />
      <canvas ref={ref} data-testid="viz-canvas" className="block h-full w-full" />
    </div>
  );
}

// 09: The Trip Horizon (Cumulative Climb Stacked Area)
export function ViewTripHorizon({ tripRef }: VizProps) {
  const ref = useCanvasLoop((ctx, w, h) => {
    const t = tripRef.current;
    const tl = t.climbTimeline;
    const padX = 64;
    const topY = 124;
    const botY = h - 52;
    const plotW = w - padX * 2;
    const plotH = botY - topY;
    const maxScaleFt = Math.max(
      450,
      t.climbFt * 1.18,
      t.climbFt > 1200 ? 3000 : t.climbFt > 260 ? 1650 : 450
    );

    LANDMARKS.forEach((lm) => {
      if (lm.ft > maxScaleFt * 1.05) return;
      const ly = botY - (lm.ft / maxScaleFt) * plotH;
      const passed = t.climbFt >= lm.ft;
      ctx.strokeStyle = passed ? lm.color : 'rgba(255,255,255,0.14)';
      ctx.lineWidth = passed ? 1.8 : 1;
      ctx.setLineDash(passed ? [] : [5, 5]);
      ctx.beginPath();
      ctx.moveTo(padX, ly);
      ctx.lineTo(w - padX, ly);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = passed ? lm.color : 'rgba(148,163,184,0.7)';
      ctx.font = passed
        ? '700 12px "Plus Jakarta Sans", system-ui, sans-serif'
        : '500 11px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(
        `${passed ? '★ ' : ''}${lm.name} (${lm.ft.toLocaleString()} ft)`,
        padX + 6,
        ly - 7
      );
    });

    if (tl.length < 2) return;
    const pts = tl.map((p, i) => ({
      x: padX + (i / (tl.length - 1)) * plotW,
      y: botY - clamp(p.climbFt / maxScaleFt, 0, 1) * plotH,
    }));

    const mGrad = ctx.createLinearGradient(0, topY, 0, botY);
    mGrad.addColorStop(0, 'rgba(244,63,94,0.72)');
    mGrad.addColorStop(0.55, 'rgba(245,158,11,0.42)');
    mGrad.addColorStop(1, 'rgba(20,184,166,0.15)');

    ctx.beginPath();
    ctx.moveTo(padX, botY);
    traceSmooth(ctx, pts, { minY: topY, maxY: botY, moveToStart: false });
    ctx.lineTo(padX + plotW, botY);
    ctx.closePath();
    ctx.fillStyle = mGrad;
    ctx.fill();

    ctx.beginPath();
    traceSmooth(ctx, pts, { minY: topY, maxY: botY, moveToStart: true });
    ctx.strokeStyle = COLORS.amber;
    ctx.lineWidth = 2.8;
    ctx.stroke();

    const last = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.white;
    ctx.fill();
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.white;
    ctx.font = '700 15px "JetBrains Mono", monospace';
    ctx.fillText(
      `${Math.round(t.climbFt).toLocaleString()} ft climbed`,
      w - padX,
      Math.max(topY + 14, last.y - 14)
    );
    ctx.textAlign = 'left';
  });

  return (
    <div className="relative h-full w-full">
      <StageHeader viz={VISUALIZATIONS[9]} />
      <canvas ref={ref} data-testid="viz-canvas" className="block h-full w-full" />
    </div>
  );
}

// 10: Pulse of Pace (Speed Variance Joyplot / Ridgeline)
export function ViewPulseOfPace({ tripRef }: VizProps) {
  const ref = useCanvasLoop((ctx, w, h) => {
    const t = tripRef.current;
    const padL = 96;
    const padR = 56;
    const topY = 136;
    const botY = h - 54;
    const plotW = w - padL - padR;

    const rows = [
      ...t.ridgeWindows.map((rw) => ({ ...rw, live: false })),
      { label: 'LIVE', bins: t.activeRidge, live: true },
    ];
    const rowStep = (botY - topY) / Math.max(1, rows.length);
    const amp = Math.min(82, rowStep * 1.9);

    rows.forEach((row, rIdx) => {
      const baseY = topY + (rIdx + 0.85) * rowStep;
      let maxB = 0.05;
      for (let i = 0; i < 36; i++) maxB = Math.max(maxB, row.bins[i]);

      const pts = Array.from({ length: 36 }, (_, i) => {
        const sm =
          (row.bins[Math.max(0, i - 1)] * 0.25 +
            row.bins[i] * 0.5 +
            row.bins[Math.min(35, i + 1)] * 0.25) /
          maxB;
        return {
          x: padL + (i / 35) * plotW,
          y: baseY - Math.pow(sm, 0.8) * amp,
        };
      });

      ctx.beginPath();
      ctx.moveTo(padL, baseY);
      traceSmooth(ctx, pts, { minY: baseY - amp, maxY: baseY, moveToStart: false });
      ctx.lineTo(padL + plotW, baseY);
      ctx.closePath();
      ctx.fillStyle = row.live ? 'rgba(20,184,166,0.28)' : 'rgba(8,10,15,0.92)';
      ctx.fill();

      const st = ctx.createLinearGradient(padL, 0, padL + plotW, 0);
      st.addColorStop(0, COLORS.teal);
      st.addColorStop(0.5, COLORS.cyan);
      st.addColorStop(1, COLORS.amber);
      ctx.beginPath();
      traceSmooth(ctx, pts, { minY: baseY - amp, maxY: baseY, moveToStart: true });
      ctx.strokeStyle = row.live ? COLORS.white : st;
      ctx.lineWidth = row.live ? 2.4 : 1.7;
      ctx.stroke();

      ctx.fillStyle = row.live ? COLORS.teal : 'rgba(148,163,184,0.75)';
      ctx.font = row.live
        ? '700 11px "JetBrains Mono", monospace'
        : '500 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(row.label, padL - 12, baseY - 2);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(148,163,184,0.8)';
    ctx.font = '600 11px "JetBrains Mono", monospace';
    [0, 15, 30, 45, 60, 75, 90].forEach((mph) =>
      ctx.fillText(`${mph} mph`, padL + (mph / 90) * plotW, botY + 24)
    );
    ctx.textAlign = 'left';
  });

  return (
    <div className="relative h-full w-full">
      <StageHeader viz={VISUALIZATIONS[10]} />
      <canvas ref={ref} data-testid="viz-canvas" className="block h-full w-full" />
    </div>
  );
}
