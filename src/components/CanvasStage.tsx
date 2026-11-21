import React, { useEffect, useRef } from 'react';
import { VisualizationMeta } from '../telemetry/types';

export type CanvasDrawFn = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  now: number
) => void;

export function useCanvasLoop(drawFn: CanvasDrawFn) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawRef = useRef<CanvasDrawFn>(drawFn);
  drawRef.current = drawFn;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;

    let w = 0;
    let h = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      if (!canvas.parentElement) return;
      const r = canvas.parentElement.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(100, r.width);
      h = Math.max(100, r.height);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);

    let rafId = 0;
    const loop = (now: number) => {
      const ctx = canvas.getContext('2d');
      if (ctx && w > 0 && h > 0) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        drawRef.current(ctx, w, h, now);
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  return canvasRef;
}

interface StageHeaderProps {
  viz: VisualizationMeta;
  right?: React.ReactNode;
}

export function StageHeader({ viz, right }: StageHeaderProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between px-7 pt-5">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-400">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: viz.accent }}
            aria-hidden="true"
          />
          <span>{viz.code}. Telemetry Visualization</span>
        </div>
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-100">
          {viz.title}
        </h1>
        <p className="text-xs text-slate-400">{viz.subtitle}</p>
      </div>
      {right && <div className="pt-1">{right}</div>}
    </div>
  );
}
