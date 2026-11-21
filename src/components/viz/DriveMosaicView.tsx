import React, { MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';
import { TripData, VISUALIZATIONS } from '../../telemetry/types';
import {
  buildDriveMosaicTiles,
  computeSquarifiedTreemap,
  LaidOutMosaicTile,
  MosaicCategory,
} from '../../telemetry/treemap';

interface VizProps {
  tripRef: MutableRefObject<TripData>;
}

const CATEGORY_TABS: { id: MosaicCategory; label: string; activeBg: string; activeFg: string }[] = [
  { id: 'all', label: 'All Highlights', activeBg: '#F8FAFC', activeFg: '#080A0F' },
  { id: 'counties', label: 'Counties & Miles', activeBg: '#2563EB', activeFg: '#F8FAFC' },
  { id: 'energy', label: 'Energy & Regen', activeBg: '#10B981', activeFg: '#052E16' },
  { id: 'pace', label: 'Pace & Rhythm', activeBg: '#F59E0B', activeFg: '#1C1917' },
];

export function ViewDriveMosaic({ tripRef }: VizProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 1280, h: 640 });
  const [category, setCategory] = useState<MosaicCategory>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Measure treemap viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 50 && r.height > 50) {
        setSize({ w: r.width, h: r.height });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Refresh treemap ~1.5x per second so proportions grow steadily without mid-swap sliding overlap
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 680);
    return () => window.clearInterval(id);
  }, []);

  const tiles: LaidOutMosaicTile[] = useMemo(() => {
    const items = buildDriveMosaicTiles(tripRef.current, category);
    return computeSquarifiedTreemap(items, { x: 0, y: 0, w: size.w, h: size.h });
  }, [tripRef, category, size, tick]);

  const selectedTile = tiles.find((t) => t.id === selectedId) || null;
  const viz = VISUALIZATIONS[21];

  return (
    <div className="flex h-full w-full flex-col bg-[#080A0F] px-6 pb-5 pt-4">
      {/* Header + Beautiful News Category Filter Row */}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
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

        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Drive Mosaic categories"
        >
          {CATEGORY_TABS.map((tab) => {
            const active = category === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(tab.id)}
                style={
                  active
                    ? { backgroundColor: tab.activeBg, color: tab.activeFg }
                    : undefined
                }
                className={`min-h-[48px] whitespace-nowrap rounded-lg px-4 text-xs font-bold uppercase tracking-wider transition-colors duration-150 ${
                  active
                    ? 'shadow-sm'
                    : 'border border-white/10 bg-[#121826] text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Squarified Treemap Stage */}
      <div
        ref={containerRef}
        data-testid="treemap-stage"
        className="relative min-h-0 flex-1 overflow-hidden"
      >
        {tiles.map((tile) => {
          const pad = 4;
          const innerW = Math.max(0, tile.w - pad * 2);
          const innerH = Math.max(0, tile.h - pad * 2);
          const minSide = Math.min(innerW, innerH);
          const area = innerW * innerH;

          const headlineSize =
            area > 110000 && minSide > 180
              ? 'text-2xl xl:text-3xl leading-[1.06]'
              : area > 48000 && minSide > 120
                ? 'text-lg xl:text-xl leading-[1.08]'
                : area > 16000 && minSide > 75
                  ? 'text-sm xl:text-base leading-[1.1]'
                  : 'text-[11px] xl:text-xs leading-[1.15]';

          const tilePadding = minSide < 95 || area < 16000 ? 'p-2.5' : 'p-4';
          const showSubtext = innerH >= 86 && innerW >= 145;
          const isUltraNarrow = innerW < 80 || innerH < 48;
          const isSelected = selectedId === tile.id;

          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => setSelectedId((cur) => (cur === tile.id ? null : tile.id))}
              style={{
                left: `${tile.x + pad}px`,
                top: `${tile.y + pad}px`,
                width: `${innerW}px`,
                height: `${innerH}px`,
                backgroundColor: tile.bg,
                color: tile.fg,
              }}
              className={`absolute flex flex-col justify-start overflow-hidden rounded-xl text-left transition-[filter,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-white ${tilePadding} ${
                isSelected ? 'ring-3 ring-inset ring-white shadow-lg' : 'hover:brightness-110'
              }`}
            >
              <span
                className={`line-clamp-4 font-extrabold uppercase tracking-tight ${headlineSize}`}
              >
                {isUltraNarrow ? tile.headline.split(' ')[0] : tile.headline}
              </span>
              {showSubtext && (
                <span className="mt-2 line-clamp-2 text-xs font-medium leading-snug opacity-90 xl:text-sm">
                  {tile.subtext}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Tile Inspector Footer (only appears when user taps a tile) */}
      {selectedTile && (
        <div className="mt-2.5 flex items-center justify-between rounded-xl border border-white/15 bg-[#0E131F] px-4 py-2 text-xs">
          <div className="flex items-center gap-3">
            <span
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: selectedTile.bg }}
              aria-hidden="true"
            />
            <span className="font-bold uppercase tracking-wide text-white">
              {selectedTile.headline}
            </span>
            <span className="text-slate-400">· {selectedTile.subtext}</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="min-h-[48px] rounded-lg bg-white/10 px-4 text-xs font-semibold text-slate-200 hover:bg-white/20"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
