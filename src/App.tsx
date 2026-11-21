/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { PlaybackSpeed, ROUTE_PROFILES, VizId } from './telemetry/types';
import { useTelemetryEngine } from './telemetry/useTelemetryEngine';
import { TopNavBar } from './components/TopNavBar';
import {
  ViewCompassTapestry,
  ViewHistograms,
  ViewMomentumNebula,
  ViewTopographicRibbon,
  ViewVelocityBloom,
} from './components/viz/BasicViews';
import {
  ViewCorneringRings,
  ViewGravityWells,
  ViewPulseOfPace,
  ViewRoadBarcode,
  ViewSankeyFlow,
  ViewTripHorizon,
} from './components/viz/FlowAndGridViews';
import {
  ViewDeadReckoningMap,
  ViewEfficiencyHalo,
  ViewForceTugOfWar,
  ViewGGMandala,
  ViewTripSymphony,
} from './components/viz/CombinedPhaseViews';
import {
  ViewCadenceSpiral,
  ViewDrivingPersona,
  ViewGradeViolins,
  ViewPhasePortrait,
  ViewRegenHarvest,
} from './components/viz/BehavioralInsightViews';
import { ViewDriveMosaic } from './components/viz/DriveMosaicView';

function useIsWideViewport(): boolean {
  const [isWide, setIsWide] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1280 : true
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const onChange = () => setIsWide(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isWide;
}

export default function App() {
  const {
    mode,
    setMode,
    routeProfile,
    changeProfile,
    playbackSpeed,
    setPlaybackSpeed,
    gpsStatus,
    gpsError,
    tripRef,
    hud,
    resetTrip,
  } = useTelemetryEngine();

  const [activeVizId, setActiveVizId] = useState<VizId>(0);
  const isWide = useIsWideViewport();

  const renderVisualization = () => {
    switch (activeVizId) {
      case 0:
        return <ViewHistograms tripRef={tripRef} />;
      case 1:
        return <ViewVelocityBloom tripRef={tripRef} />;
      case 2:
        return <ViewTopographicRibbon tripRef={tripRef} />;
      case 3:
        return <ViewMomentumNebula tripRef={tripRef} />;
      case 4:
        return <ViewCompassTapestry tripRef={tripRef} />;
      case 5:
        return <ViewRoadBarcode tripRef={tripRef} />;
      case 6:
        return <ViewSankeyFlow tripRef={tripRef} />;
      case 7:
        return <ViewGravityWells tripRef={tripRef} />;
      case 8:
        return <ViewCorneringRings tripRef={tripRef} />;
      case 9:
        return <ViewTripHorizon tripRef={tripRef} />;
      case 10:
        return <ViewPulseOfPace tripRef={tripRef} />;
      case 11:
        return <ViewEfficiencyHalo tripRef={tripRef} />;
      case 12:
        return <ViewDeadReckoningMap tripRef={tripRef} />;
      case 13:
        return <ViewGGMandala tripRef={tripRef} />;
      case 14:
        return <ViewForceTugOfWar tripRef={tripRef} />;
      case 15:
        return <ViewTripSymphony tripRef={tripRef} />;
      case 16:
        return <ViewPhasePortrait tripRef={tripRef} />;
      case 17:
        return <ViewCadenceSpiral tripRef={tripRef} />;
      case 18:
        return <ViewGradeViolins tripRef={tripRef} />;
      case 19:
        return <ViewRegenHarvest tripRef={tripRef} />;
      case 20:
        return <ViewDrivingPersona tripRef={tripRef} />;
      case 21:
        return <ViewDriveMosaic tripRef={tripRef} />;
      default:
        return <ViewHistograms tripRef={tripRef} />;
    }
  };

  return (
    <div
      className="flex h-screen w-screen select-none flex-col overflow-hidden bg-[#080A0F] text-slate-100"
      data-viz={activeVizId}
      data-mode={mode}
      data-profile={routeProfile}
      data-speed-mult={playbackSpeed}
    >
      <TopNavBar
        activeVizId={activeVizId}
        onSelectViz={setActiveVizId}
        mode={mode}
        onChangeMode={setMode}
        routeProfile={routeProfile}
        onChangeProfile={changeProfile}
        playbackSpeed={playbackSpeed}
        onChangePlaybackSpeed={setPlaybackSpeed}
        gpsStatus={gpsStatus}
        gpsError={gpsError}
        hud={hud}
        onResetTrip={resetTrip}
        showInlineSimControls={isWide}
      />

      {/* Compact secondary simulator toolbar for narrower landscape viewports (<1280px) */}
      {mode === 'simulator' && !isWide && (
        <div className="flex items-center justify-between border-b border-white/5 bg-[#0A0D14] px-4 py-1.5">
          <div className="flex items-center gap-1.5" role="group" aria-label="Route profile">
            {ROUTE_PROFILES.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={routeProfile === r.id}
                onClick={() => changeProfile(r.id)}
                className={`min-h-[42px] whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition ${
                  routeProfile === r.id
                    ? 'bg-white/15 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5" role="group" aria-label="Simulation speed">
            {([1, 5, 20] as PlaybackSpeed[]).map((spd) => (
              <button
                key={spd}
                type="button"
                aria-pressed={playbackSpeed === spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`min-h-[42px] whitespace-nowrap rounded-lg px-3 text-xs font-bold transition ${
                  playbackSpeed === spd
                    ? 'bg-[#06B6D4] text-slate-950'
                    : 'bg-white/5 text-slate-300 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="relative flex-1 overflow-hidden">{renderVisualization()}</main>
    </div>
  );
}
