import React, { useState } from 'react';
import {
  GpsStatus,
  HudSnapshot,
  PlaybackSpeed,
  ROUTE_PROFILES,
  RouteProfileId,
  TelemetryMode,
  VISUALIZATIONS,
  VizId,
} from '../telemetry/types';

interface TopNavBarProps {
  activeVizId: VizId;
  onSelectViz: (id: VizId) => void;
  mode: TelemetryMode;
  onChangeMode: (mode: TelemetryMode) => void;
  routeProfile: RouteProfileId;
  onChangeProfile: (profile: RouteProfileId) => void;
  playbackSpeed: PlaybackSpeed;
  onChangePlaybackSpeed: (speed: PlaybackSpeed) => void;
  gpsStatus: GpsStatus;
  gpsError: string | null;
  hud: HudSnapshot;
  onResetTrip: () => void;
  showInlineSimControls: boolean;
}

export function TopNavBar({
  activeVizId,
  onSelectViz,
  mode,
  onChangeMode,
  routeProfile,
  onChangeProfile,
  playbackSpeed,
  onChangePlaybackSpeed,
  gpsStatus,
  gpsError,
  hud,
  onResetTrip,
  showInlineSimControls,
}: TopNavBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const activeViz = VISUALIZATIONS[activeVizId];

  return (
    <header className="relative z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0B0E16] px-4 py-2.5">
      {/* Left: Visualization Dropdown Selector + Simulator Route / GPS Status */}
      <div className="relative flex items-center gap-2.5">
        <button
          type="button"
          aria-expanded={dropdownOpen}
          aria-haspopup="listbox"
          aria-label={`Select visualization, current ${activeViz.title}`}
          onClick={() => setDropdownOpen((o) => !o)}
          className="flex min-h-[48px] min-w-[270px] max-w-[320px] items-center justify-between gap-3 rounded-xl border border-white/15 bg-[#121826] px-4 text-left transition hover:border-white/25 focus-visible:outline-2 focus-visible:outline-cyan-400 active:scale-[0.99]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: activeViz.accent,
                boxShadow: `0 0 10px ${activeViz.accent}`,
              }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="truncate text-[11px] font-medium text-slate-400">
                View {activeViz.code} of 21
              </div>
              <div className="truncate text-sm font-semibold text-white">
                {activeViz.title}
              </div>
            </div>
          </div>
          <svg
            className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${
              dropdownOpen ? 'rotate-180' : ''
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Custom Dark-Mode Dropdown Drawer */}
        {dropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-20"
              onClick={() => setDropdownOpen(false)}
              aria-hidden="true"
            />
            <div
              role="listbox"
              aria-label="Visualizations"
              className="absolute left-0 top-[56px] z-30 grid max-h-[78vh] w-[540px] max-w-[94vw] grid-cols-1 gap-1.5 overflow-y-auto rounded-2xl border border-white/15 bg-[#0E131F] p-2.5 shadow-2xl md:w-[660px] md:grid-cols-2 xl:w-[940px] xl:grid-cols-3"
            >
              {VISUALIZATIONS.map((v) => {
                const selected = v.id === activeVizId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onSelectViz(v.id);
                      setDropdownOpen(false);
                    }}
                    className={`flex min-h-[54px] items-center gap-3 rounded-xl px-3.5 py-2 text-left transition ${
                      selected
                        ? 'bg-white/12 ring-1 ring-white/25'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <span className="font-mono-tabular w-6 shrink-0 text-xs font-semibold text-slate-400">
                      {v.code}
                    </span>
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: v.accent }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-100">
                        {v.title}
                      </div>
                      <div className="truncate text-xs text-slate-400">
                        {v.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Simulator Route Profile & Playback Speed (wide screens) */}
        {mode === 'simulator' ? (
          showInlineSimControls ? (
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="route-profile-select">
                Route Profile
              </label>
              <select
                id="route-profile-select"
                aria-label="Route Profile"
                value={routeProfile}
                onChange={(e) => onChangeProfile(e.target.value as RouteProfileId)}
                className="min-h-[48px] rounded-xl border border-white/15 bg-[#121826] px-3 text-sm font-medium text-slate-200 outline-none focus-visible:outline-2 focus-visible:outline-cyan-400"
              >
                {ROUTE_PROFILES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>

              <div
                className="flex min-h-[48px] items-center rounded-xl border border-white/15 bg-[#121826] p-1"
                role="group"
                aria-label="Simulation speed"
              >
                {([1, 5, 20] as PlaybackSpeed[]).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    aria-pressed={playbackSpeed === spd}
                    onClick={() => onChangePlaybackSpeed(spd)}
                    className={`min-h-[38px] whitespace-nowrap rounded-lg px-3 text-xs font-bold transition ${
                      playbackSpeed === spd
                        ? 'bg-[#06B6D4] text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          ) : null
        ) : (
          <div
            className="flex min-h-[48px] items-center gap-2 rounded-xl border border-white/10 bg-[#121826] px-3.5 text-xs font-semibold"
            role="status"
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                gpsStatus === 'active'
                  ? 'bg-[#10B981]'
                  : gpsStatus === 'error'
                    ? 'bg-[#F43F5E]'
                    : 'bg-[#F59E0B]'
              }`}
              aria-hidden="true"
            />
            <span className="max-w-[190px] truncate text-slate-200">
              {gpsStatus === 'active'
                ? 'GPS Locked'
                : gpsStatus === 'searching'
                  ? 'Acquiring GPS…'
                  : gpsError || 'GPS Idle'}
            </span>
          </div>
        )}
      </div>

      {/* Center: Compact Live Telemetry Readout Pills */}
      <div className="flex items-center gap-2" aria-label="Live telemetry metrics">
        <div
          className="flex min-h-[48px] items-baseline gap-1.5 rounded-xl border border-white/10 bg-[#111622] px-3.5 py-2"
          data-testid="hud-mph"
        >
          <span className="font-mono-tabular text-xl font-bold text-white">
            {hud.speedMph}
          </span>
          <span className="text-[11px] font-semibold tracking-wider text-[#06B6D4]">
            MPH
          </span>
        </div>
        <div
          className="flex min-h-[48px] items-baseline gap-1.5 rounded-xl border border-white/10 bg-[#111622] px-3.5 py-2"
          data-testid="hud-alt"
        >
          <span className="font-mono-tabular text-xl font-bold text-white">
            {hud.altitudeFt.toLocaleString()}
          </span>
          <span className="text-[11px] font-semibold tracking-wider text-slate-400">
            FT
          </span>
        </div>
        <div
          className="flex min-h-[48px] items-baseline gap-1.5 rounded-xl border border-white/10 bg-[#111622] px-3.5 py-2"
          data-testid="hud-gain"
        >
          <span
            className={`font-mono-tabular text-xl font-bold ${
              hud.netGainFt >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'
            }`}
          >
            {hud.netGainFt >= 0 ? `+${hud.netGainFt}` : hud.netGainFt}
          </span>
          <span className="text-[11px] font-semibold tracking-wider text-slate-400">
            NET FT
          </span>
        </div>
      </div>

      {/* Right: Mode Switcher Pill + Reset Trip */}
      <div className="flex shrink-0 items-center gap-2">
        <div
          className="flex min-h-[48px] items-center rounded-xl border border-white/15 bg-[#121826] p-1"
          role="group"
          aria-label="Telemetry source mode"
        >
          <button
            type="button"
            aria-pressed={mode === 'simulator'}
            onClick={() => onChangeMode('simulator')}
            className={`min-h-[38px] whitespace-nowrap rounded-lg px-3.5 text-xs font-bold tracking-wider transition ${
              mode === 'simulator'
                ? 'bg-[#14B8A6] text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            SIMULATOR
          </button>
          <button
            type="button"
            aria-pressed={mode === 'gps'}
            onClick={() => onChangeMode('gps')}
            className={`min-h-[38px] whitespace-nowrap rounded-lg px-3.5 text-xs font-bold tracking-wider transition ${
              mode === 'gps'
                ? 'bg-[#14B8A6] text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            LIVE GPS
          </button>
        </div>

        <button
          type="button"
          onClick={onResetTrip}
          className="min-h-[48px] whitespace-nowrap rounded-xl border border-white/15 bg-[#18121A] px-4 text-xs font-bold tracking-wider text-[#F43F5E] transition hover:bg-[#F43F5E]/15 active:scale-95"
        >
          RESET TRIP
        </button>
      </div>
    </header>
  );
}
