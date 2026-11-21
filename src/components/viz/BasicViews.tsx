import React, { MutableRefObject } from 'react';
import { COLORS, TripData, VISUALIZATIONS } from '../../telemetry/types';
import {
  clamp,
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

// 00: Speed & Altitude Histograms (Default View)
export function ViewHistograms({ tripRef }: VizProps) {
  const ref = useCanvasLoop((ctx, w, h) => {
    const t = tripRef.current;
    const padX = 56;
    const topY = 128;
    const botY = h - 58;
    const plotH = Math.max(80, botY - topY);
    const gap = 52;
    const panelW = (w - padX * 2 - gap) / 2;

    // Left Panel: Speed Distribution (5-mph brackets)
    const br = t.speedBrackets;
    let maxS = 0.5;
    let totS = 0.01;
    for (let i = 0; i < 18; i++) {
      maxS = Math.max(maxS, br[i]);
      totS += br[i];
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, botY);
    ctx.lineTo(padX + panelW, botY);
    ctx.stroke();

    ctx.fillStyle = 'rgba(226,232,240,0.88)';
    ctx.font = '600 12px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('Speed Distribution (5-mph Brackets)', padX, topY - 14);

    const sPts = Array.from({ length: 18 }, (_, i) => ({
      x: padX + (i / 17) * panelW,
      y: botY - Math.pow(br[i] / maxS, 0.78) * (plotH * 0.84),
      mph: i * 5 + 2.5,
      sec: br[i],
    }));

    const gL = ctx.createLinearGradient(padX, 0, padX + panelW, 0);
    gL.addColorStop(0, 'rgba(20,184,166,0.55)');
    gL.addColorStop(0.5, 'rgba(6,182,212,0.62)');
    gL.addColorStop(1, 'rgba(245,158,11,0.72)');
    ctx.beginPath();
    ctx.moveTo(padX, botY);
    traceSmooth(ctx, sPts, { minY: topY, maxY: botY, moveToStart: false });
    ctx.lineTo(padX + panelW, botY);
    ctx.closePath();
    ctx.fillStyle = gL;
    ctx.fill();

    const stL = ctx.createLinearGradient(padX, 0, padX + panelW, 0);
    stL.addColorStop(0, COLORS.teal);
    stL.addColorStop(0.5, COLORS.cyan);
    stL.addColorStop(1, COLORS.amber);
    ctx.beginPath();
    traceSmooth(ctx, sPts, { minY: topY, maxY: botY, moveToStart: true });
    ctx.strokeStyle = stL;
    ctx.lineWidth = 2.6;
    ctx.stroke();

    const activeBin = clamp(Math.floor(t.speedMph / 5), 0, 17);
    sPts.forEach((p, i) => {
      if (i === activeBin) {
        ctx.fillStyle = speedColor(p.mph, 0.24);
        ctx.fillRect(p.x - 7, topY + 10, 14, plotH - 10);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.white;
        ctx.fill();
      }
      if (i % 3 === 0 || i === 17) {
        ctx.fillStyle = 'rgba(148,163,184,0.82)';
        ctx.font = '500 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${i * 5}`, p.x, bottomLabelY(botY));
      }
      const pct = (p.sec / totS) * 100;
      if (pct >= 9 && p.y < botY - 22) {
        ctx.fillStyle = 'rgba(248,250,252,0.78)';
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(pct)}%`, p.x, p.y - 9);
      }
    });
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(148,163,184,0.65)';
    ctx.font = '500 11px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('MPH', padX + panelW - 24, botY + 36);

    // Right Panel: Altitude Bands Colored by Road Grade
    const rx = padX + panelW + gap;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(rx, botY);
    ctx.lineTo(rx + panelW, botY);
    ctx.stroke();

    ctx.fillStyle = 'rgba(226,232,240,0.88)';
    ctx.font = '600 12px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('Altitude Bands (Colored by Grade %)', rx, topY - 14);

    const rawBands = Array.from(t.altBands.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([alt, d]) => ({
        alt,
        sec: d.sec,
        grd: d.sec > 0 ? d.grdSum / d.sec : 0,
      }));

    // Pad zero-height skirts so single/dual bands render as smooth organic bells
    const bands =
      rawBands.length >= 1 && rawBands.length <= 3
        ? [
            { alt: rawBands[0].alt - 25, sec: 0, grd: rawBands[0].grd },
            ...rawBands,
            {
              alt: rawBands[rawBands.length - 1].alt + 25,
              sec: 0,
              grd: rawBands[rawBands.length - 1].grd,
            },
          ]
        : rawBands;

    if (bands.length >= 2) {
      let maxA = 0.5;
      bands.forEach((b) => (maxA = Math.max(maxA, b.sec)));
      const aPts = bands.map((b, idx) => ({
        x: rx + (idx / (bands.length - 1)) * panelW,
        y: botY - Math.pow(b.sec / maxA, 0.78) * (plotH * 0.84),
        alt: b.alt,
        grd: b.grd,
      }));
      const gR = ctx.createLinearGradient(rx, 0, rx + panelW, 0);
      const stR = ctx.createLinearGradient(rx, 0, rx + panelW, 0);
      aPts.forEach((p, idx) => {
        const stop = idx / (aPts.length - 1);
        gR.addColorStop(stop, gradeColor(p.grd, 0.65));
        stR.addColorStop(stop, gradeColor(p.grd, 1));
      });
      ctx.beginPath();
      ctx.moveTo(rx, botY);
      traceSmooth(ctx, aPts, { minY: topY, maxY: botY, moveToStart: false });
      ctx.lineTo(rx + panelW, botY);
      ctx.closePath();
      ctx.fillStyle = gR;
      ctx.fill();

      ctx.beginPath();
      traceSmooth(ctx, aPts, { minY: topY, maxY: botY, moveToStart: true });
      ctx.strokeStyle = stR;
      ctx.lineWidth = 2.6;
      ctx.stroke();

      const curIdx = bands.findIndex((b) => b.alt === Math.floor(t.altFt / 25) * 25);
      if (curIdx >= 0) {
        ctx.beginPath();
        ctx.arc(aPts[curIdx].x, aPts[curIdx].y, 5, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.white;
        ctx.fill();
      }
      const step = Math.max(1, Math.floor(aPts.length / 5));
      aPts.forEach((p, idx) => {
        if (idx % step === 0 || idx === aPts.length - 1) {
          ctx.fillStyle = 'rgba(148,163,184,0.82)';
          ctx.font = '500 11px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${Math.round(p.alt)}ft`, p.x, bottomLabelY(botY));
        }
      });
      ctx.textAlign = 'left';
    }

    ctx.font = '500 11px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillStyle = COLORS.emerald;
    ctx.fillText('● Downhill Regen', rx, botY + 37);
    ctx.fillStyle = COLORS.cyan;
    ctx.fillText('● Level', rx + 124, botY + 37);
    ctx.fillStyle = COLORS.coral;
    ctx.fillText('● Steep Climb', rx + 190, botY + 37);
  });

  return (
    <div className="relative h-full w-full">
      <StageHeader viz={VISUALIZATIONS[0]} />
      <canvas ref={ref} data-testid="viz-canvas" className="block h-full w-full" />
    </div>
  );
}

function bottomLabelY(botY: number) {
  return botY + 19;
}

// 01: The Velocity Bloom (Polar Speed Rose)
export function ViewVelocityBloom({ tripRef }: VizProps) {
  const ref = useCanvasLoop((ctx, w, h, now) => {
    const t = tripRef.current;
    const cx = w * 0.5;
    const cy = h * 0.54;
    const maxR = Math.min(w, h) * 0.36;
    const innerR = maxR * 0.19;

    [0.35, 0.6, 0.85, 1].forEach((f) => {
      ctx.beginPath();
      ctx.arc(cx, cy, lerp(innerR, maxR, f), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    let maxS = 0.5;
    for (let i = 0; i < 18; i++) maxS = Math.max(maxS, t.speedBrackets[i]);
    const active = clamp(Math.floor(t.speedMph / 5), 0, 17);
    const step = (Math.PI * 2) / 18;

    for (let i = 0; i < 18; i++) {
      const a = -Math.PI / 2 + i * step;
      const len = innerR + Math.pow(t.speedBrackets[i] / maxS, 0.65) * (maxR - innerR);
      const mph = i * 5 + 2.5;
      const isAct = i === active;

      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a - step * 0.36) * innerR, cy + Math.sin(a - step * 0.36) * innerR);
      ctx.quadraticCurveTo(
        cx + Math.cos(a - step * 0.25) * len * 0.85,
        cy + Math.sin(a - step * 0.25) * len * 0.85,
        cx + Math.cos(a) * len,
        cy + Math.sin(a) * len
      );
      ctx.quadraticCurveTo(
        cx + Math.cos(a + step * 0.25) * len * 0.85,
        cy + Math.sin(a + step * 0.25) * len * 0.85,
        cx + Math.cos(a + step * 0.36) * innerR,
        cy + Math.sin(a + step * 0.36) * innerR
      );
      ctx.closePath();

      const grad = ctx.createRadialGradient(cx, cy, innerR * 0.8, cx, cy, Math.max(innerR + 4, len));
      grad.addColorStop(0, speedColor(mph, 0.16));
      grad.addColorStop(1, speedColor(mph, isAct ? 0.94 : 0.68));
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = isAct ? COLORS.white : speedColor(mph);
      ctx.lineWidth = isAct ? 2.2 : 1;
      ctx.stroke();

      const lr = maxR + 22;
      ctx.fillStyle = isAct ? COLORS.white : 'rgba(148,163,184,0.72)';
      ctx.font = isAct
        ? '700 12px "JetBrains Mono", monospace'
        : '500 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i * 5}`, cx + Math.cos(a) * lr, cy + Math.sin(a) * lr);
      if (isAct) {
        ctx.beginPath();
        ctx.arc(
          cx + Math.cos(a) * len,
          cy + Math.sin(a) * len,
          4.5 + Math.sin(now * 0.008) * 1.5,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = COLORS.white;
        ctx.fill();
      }
    }

    ctx.beginPath();
    ctx.arc(cx, cy, innerR - 4, 0, Math.PI * 2);
    ctx.fillStyle = '#0B0F17';
    ctx.fill();
    ctx.strokeStyle = speedColor(t.speedMph, 0.85);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = COLORS.white;
    ctx.font = '700 28px "JetBrains Mono", monospace';
    ctx.fillText(`${Math.round(t.speedMph)}`, cx, cy - 6);
    ctx.fillStyle = 'rgba(148,163,184,0.85)';
    ctx.font = '600 10px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('MPH', cx, cy + 16);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  });

  return (
    <div className="relative h-full w-full">
      <StageHeader viz={VISUALIZATIONS[1]} />
      <canvas ref={ref} data-testid="viz-canvas" className="block h-full w-full" />
    </div>
  );
}

// 02: Topographic Ribbon (Mirrored Elevation Streamgraph)
export function ViewTopographicRibbon({ tripRef }: VizProps) {
  const ref = useCanvasLoop((ctx, w, h) => {
    const t = tripRef.current;
    const hist = t.stream;
    const cy = h * 0.54;
    const padX = 56;
    const drawW = w - padX * 2;
    const maxH = h * 0.33;

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(padX, cy);
    ctx.lineTo(w - padX, cy);
    ctx.stroke();
    ctx.setLineDash([]);
    if (hist.length < 2) return;

    const span = Math.max(80, t.maxAlt - t.minAlt);
    const topPts: { x: number; y: number }[] = [];
    const botPts: { x: number; y: number }[] = [];
    hist.forEach((p, i) => {
      const x = padX + (i / (hist.length - 1)) * drawW;
      const half =
        18 + ((p.alt - t.minAlt) / span) * (maxH - 34) + clamp(Math.abs(p.grd) * 3.5, 0, 24);
      topPts.push({ x, y: cy - half });
      botPts.push({ x, y: cy + half });
    });

    const grad = ctx.createLinearGradient(padX, 0, padX + drawW, 0);
    const step = Math.max(1, Math.floor(hist.length / 32));
    for (let i = 0; i < hist.length; i += step) {
      grad.addColorStop(i / (hist.length - 1), gradeColor(hist[i].grd, 0.74));
    }
    grad.addColorStop(1, gradeColor(hist[hist.length - 1].grd, 0.88));

    ctx.beginPath();
    traceSmooth(ctx, topPts);
    const rev = [...botPts].reverse();
    ctx.lineTo(rev[0].x, rev[0].y);
    for (let i = 0; i < rev.length - 1; i++) {
      ctx.quadraticCurveTo(
        rev[i].x,
        rev[i].y,
        (rev[i].x + rev[i + 1].x) / 2,
        (rev[i].y + rev[i + 1].y) / 2
      );
    }
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    [0.45, 1].forEach((sc, idx) => {
      ctx.beginPath();
      traceSmooth(
        ctx,
        topPts.map((p) => ({ x: p.x, y: cy - (cy - p.y) * sc }))
      );
      ctx.strokeStyle = idx ? 'rgba(248,250,252,0.55)' : 'rgba(255,255,255,0.22)';
      ctx.lineWidth = idx ? 2 : 1;
      ctx.stroke();
      ctx.beginPath();
      traceSmooth(
        ctx,
        botPts.map((p) => ({ x: p.x, y: cy + (p.y - cy) * sc }))
      );
      ctx.stroke();
    });

    const lt = topPts[topPts.length - 1];
    const lb = botPts[botPts.length - 1];
    ctx.strokeStyle = gradeColor(t.gradePct);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(lt.x, lt.y);
    ctx.lineTo(lb.x, lb.y);
    ctx.stroke();

    ctx.fillStyle = COLORS.white;
    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(
      `${Math.round(t.altFt)} ft (${t.gradePct >= 0 ? '+' : ''}${t.gradePct.toFixed(1)}%)`,
      w - padX,
      lt.y - 12
    );
    ctx.textAlign = 'left';
  });

  return (
    <div className="relative h-full w-full">
      <StageHeader
        viz={VISUALIZATIONS[2]}
        right={
          <div className="flex gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
              Regen Descent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#F43F5E]" />
              Uphill Climb
            </span>
          </div>
        }
      />
      <canvas ref={ref} data-testid="viz-canvas" className="block h-full w-full" />
    </div>
  );
}

// 03: The Momentum Nebula (Acceleration vs. Regen Constellation)
export function ViewMomentumNebula({ tripRef }: VizProps) {
  const lastRef = useCanvasLoopRefTime();
  const ref = useCanvasLoop((ctx, w, h, now) => {
    const dt = clamp((now - lastRef.current) / 1000, 0.004, 0.05);
    lastRef.current = now;
    const t = tripRef.current;
    const padX = 60;
    const plotW = w - padX * 2;
    const hy = h * 0.53;
    const maxH = h * 0.34;
    const poolTop = h - lerp(26, h * 0.14, t.energyPool);

    const pGrad = ctx.createLinearGradient(0, poolTop - 16, 0, h);
    pGrad.addColorStop(0, 'rgba(20,184,166,0)');
    pGrad.addColorStop(0.3, 'rgba(20,184,166,0.28)');
    pGrad.addColorStop(0.7, 'rgba(236,72,153,0.34)');
    pGrad.addColorStop(1, 'rgba(20,184,166,0.62)');

    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 24) {
      ctx.lineTo(
        x,
        poolTop + Math.sin(x * 0.015 + now * 0.0025) * 5 + Math.cos(x * 0.03 - now * 0.002) * 3
      );
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = pGrad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(padX, hy);
    ctx.lineTo(w - padX, hy);
    ctx.stroke();

    ctx.fillStyle = 'rgba(148,163,184,0.65)';
    ctx.font = '600 11px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('+ Acceleration (G)', padX, hy - 12);
    ctx.fillText('− Regenerative Braking (G)', padX, hy + 20);

    t.momentumPts.forEach((p) => {
      const alpha = clamp(1 - (now - p.born) / 38000, 0.12, 0.92);
      const px = padX + clamp(p.spd / 88, 0, 1) * plotW;
      const py = hy - clamp(p.g / 0.42, -1, 1) * maxH;
      ctx.beginPath();
      ctx.arc(px, py, p.g < -0.05 ? 3.5 : 3, 0, Math.PI * 2);
      ctx.fillStyle =
        p.g >= 0
          ? mixColor(COLORS.amber, COLORS.coral, p.g / 0.35, alpha)
          : mixColor(COLORS.teal, COLORS.magenta, -p.g / 0.35, alpha);
      ctx.fill();
    });

    const alive = [];
    for (const p of t.regenParticles) {
      p.yOff += p.vy * dt * 0.45;
      p.xNorm += (p.vx + Math.sin(now * 0.004 + p.phase) * 0.025) * dt;
      const py = hy + p.yOff * (poolTop - hy);
      const px = padX + clamp(p.xNorm, 0, 1) * plotW;
      if (py < poolTop + 8) {
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.magenta ? 'rgba(236,72,153,0.9)' : 'rgba(20,184,166,0.9)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, p.r * 2.3, 0, Math.PI * 2);
        ctx.fillStyle = p.magenta ? 'rgba(236,72,153,0.16)' : 'rgba(20,184,166,0.16)';
        ctx.fill();
        alive.push(p);
      }
    }
    t.regenParticles = alive;

    ctx.beginPath();
    ctx.arc(
      padX + clamp(t.speedMph / 88, 0, 1) * plotW,
      hy - clamp(t.longG / 0.42, -1, 1) * maxH,
      6.5,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = COLORS.white;
    ctx.fill();
    ctx.fillStyle = 'rgba(248,250,252,0.85)';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Energy Pool · ${t.regenKwh.toFixed(3)} kWh Recovered`, w / 2, h - 16);
    ctx.textAlign = 'left';
  });

  return (
    <div className="relative h-full w-full">
      <StageHeader viz={VISUALIZATIONS[3]} />
      <canvas ref={ref} data-testid="viz-canvas" className="block h-full w-full" />
    </div>
  );
}

function useCanvasLoopRefTime() {
  return React.useRef<number>(typeof performance !== 'undefined' ? performance.now() : 0);
}

// 04: Compass Wind-Rose Tapestry (Heading & Speed Chord Diagram)
export function ViewCompassTapestry({ tripRef }: VizProps) {
  const LBL = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const ref = useCanvasLoop((ctx, w, h, now) => {
    const t = tripRef.current;
    const cx = w * 0.5;
    const cy = h * 0.54;
    const outR = Math.min(w, h) * 0.36;
    const inR = outR * 0.62;
    const step = (Math.PI * 2) / 16;

    [inR, outR * 0.81, outR].forEach((r) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    let maxCh = 1;
    for (let k = 0; k < 256; k++) maxCh = Math.max(maxCh, t.compassChords[k]);
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        const cnt = t.compassChords[i * 16 + j];
        if (!cnt) continue;
        const a1 = -Math.PI / 2 + i * step;
        const a2 = -Math.PI / 2 + j * step;
        const wt = clamp(Math.sqrt(cnt / maxCh), 0.15, 1);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a1) * (inR - 4), cy + Math.sin(a1) * (inR - 4));
        ctx.quadraticCurveTo(cx, cy, cx + Math.cos(a2) * (inR - 4), cy + Math.sin(a2) * (inR - 4));
        ctx.strokeStyle = mixColor(COLORS.cyan, COLORS.magenta, i > j ? 0.25 : 0.8, 0.22 + wt * 0.5);
        ctx.lineWidth = 1 + wt * 2.5;
        ctx.stroke();
      }
    }

    t.recentChords.forEach((ch) => {
      const age = (now - ch.born) / 1000;
      if (age > 4) return;
      const a1 = -Math.PI / 2 + ch.from * step;
      const a2 = -Math.PI / 2 + ch.to * step;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a1) * (inR - 4), cy + Math.sin(a1) * (inR - 4));
      ctx.quadraticCurveTo(cx, cy, cx + Math.cos(a2) * (inR - 4), cy + Math.sin(a2) * (inR - 4));
      ctx.strokeStyle = `rgba(248,250,252,${0.85 * (1 - age / 4)})`;
      ctx.lineWidth = 2.4;
      ctx.stroke();
    });

    let maxD = 0.02;
    for (let i = 0; i < 16; i++) maxD = Math.max(maxD, t.compassDist[i]);
    const act = Math.floor(((t.headingDeg + 11.25) % 360) / 22.5);
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI / 2 + i * step;
      const avgSpd = t.compassTime[i] > 0 ? t.compassSpdSum[i] / t.compassTime[i] : 25;
      const rTip = inR + Math.pow(t.compassDist[i] / maxD, 0.72) * (outR - inR);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a - step * 0.34) * inR, cy + Math.sin(a - step * 0.34) * inR);
      ctx.lineTo(cx + Math.cos(a - step * 0.22) * rTip, cy + Math.sin(a - step * 0.22) * rTip);
      ctx.lineTo(cx + Math.cos(a + step * 0.22) * rTip, cy + Math.sin(a + step * 0.22) * rTip);
      ctx.lineTo(cx + Math.cos(a + step * 0.34) * inR, cy + Math.sin(a + step * 0.34) * inR);
      ctx.closePath();
      ctx.fillStyle = speedColor(avgSpd, i === act ? 0.92 : 0.62);
      ctx.fill();

      const lr = outR + 22;
      const card = i % 4 === 0;
      ctx.fillStyle =
        i === act ? COLORS.white : card ? 'rgba(226,232,240,0.9)' : 'rgba(148,163,184,0.55)';
      ctx.font = card
        ? '700 13px "Plus Jakarta Sans", system-ui, sans-serif'
        : '500 10px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(LBL[i], cx + Math.cos(a) * lr, cy + Math.sin(a) * lr);
    }

    const ha = -Math.PI / 2 + (t.headingDeg * Math.PI) / 180;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(ha) * inR, cy + Math.sin(ha) * inR, 5, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.white;
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  });

  return (
    <div className="relative h-full w-full">
      <StageHeader viz={VISUALIZATIONS[4]} />
      <canvas ref={ref} data-testid="viz-canvas" className="block h-full w-full" />
    </div>
  );
}
