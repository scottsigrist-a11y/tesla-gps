import { useState, useEffect, useRef, useCallback } from 'react';
import {
  GpsStatus,
  HudSnapshot,
  PlaybackSpeed,
  RouteProfileId,
  TelemetryMode,
  TripData,
} from './types';
import {
  bearingDeg,
  clamp,
  createInitialTripData,
  diffDeg,
  haversineM,
  ingestTelemetryStep,
  lerp,
  stepSimulatorPhysics,
} from './math';
import { getGpsSectorRegion } from './treemap';

export function useTelemetryEngine() {
  const [mode, setMode] = useState<TelemetryMode>('simulator');
  const [routeProfile, setRouteProfile] = useState<RouteProfileId>('canyon');
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [gpsError, setGpsError] = useState<string | null>(null);

  const tripRef = useRef<TripData>(createInitialTripData(420));

  const [hud, setHud] = useState<HudSnapshot>({
    speedMph: 0,
    altitudeFt: 420,
    netGainFt: 0,
    climbFt: 0,
    gradePct: 0,
    distanceMiles: 0,
    elapsedSec: 0,
  });

  const syncHudFromTrip = useCallback((t: TripData) => {
    setHud({
      speedMph: Math.round(t.speedMph),
      altitudeFt: Math.round(t.altFt),
      netGainFt: Math.round(t.altFt - t.startAlt),
      climbFt: Math.round(t.climbFt),
      gradePct: t.gradePct,
      distanceMiles: t.distanceMiles,
      elapsedSec: t.elapsedSec,
    });
  }, []);

  const resetTrip = useCallback(() => {
    const startAlt =
      mode === 'simulator'
        ? routeProfile === 'mountain'
          ? 1400
          : 420
        : tripRef.current.altFt || 100;
    const fresh = createInitialTripData(startAlt);
    tripRef.current = fresh;
    syncHudFromTrip(fresh);
  }, [mode, routeProfile, syncHudFromTrip]);

  const changeProfile = useCallback(
    (profile: RouteProfileId) => {
      setRouteProfile(profile);
      const startAlt = profile === 'mountain' ? 1400 : 420;
      const fresh = createInitialTripData(startAlt);
      tripRef.current = fresh;
      syncHudFromTrip(fresh);
    },
    [syncHudFromTrip]
  );

  // Simulator RAF loop (1x / 5x / 20x)
  useEffect(() => {
    if (mode !== 'simulator') return;
    let last = performance.now();
    let hudTimer = 0;
    let rafId = 0;

    const tick = (now: number) => {
      const realDt = clamp((now - last) / 1000, 0.005, 0.08);
      last = now;
      const t = tripRef.current;
      const totalSim = realDt * playbackSpeed;
      const steps = Math.max(1, Math.ceil(totalSim / 0.25));
      const subDt = totalSim / steps;

      for (let i = 0; i < steps; i++) {
        stepSimulatorPhysics(t, routeProfile, subDt, now);
      }

      hudTimer += realDt;
      if (hudTimer >= 0.08) {
        hudTimer = 0;
        syncHudFromTrip(t);
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [mode, routeProfile, playbackSpeed, syncHudFromTrip]);

  // Live GPS Watch
  useEffect(() => {
    if (mode !== 'gps') {
      setGpsStatus('idle');
      setGpsError(null);
      return;
    }
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGpsStatus('error');
      setGpsError('Geolocation unsupported in this browser.');
      return;
    }

    setGpsStatus('searching');
    setGpsError(null);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsStatus('active');
        setGpsError(null);
        const { latitude, longitude, altitude, speed, heading } = pos.coords;
        const ts = pos.timestamp || Date.now();
        const t = tripRef.current;
        const altFt =
          altitude !== null && !Number.isNaN(altitude) ? altitude * 3.28084 : t.altFt;

        if (!t._lastGps) {
          t._lastGps = {
            lat: latitude,
            lon: longitude,
            altFt,
            spd: speed ? speed * 2.23694 : 0,
            hdg: heading ?? 0,
            ts,
          };
          t.startAlt = altFt;
          t.altFt = altFt;
          t.minAlt = altFt;
          t.maxAlt = altFt;
          syncHudFromTrip(t);
          return;
        }

        const prev = t._lastGps;
        const dt = clamp((ts - prev.ts) / 1000, 0.2, 10);
        const distM = haversineM(prev.lat, prev.lon, latitude, longitude);
        const spd =
          speed !== null && !Number.isNaN(speed)
            ? speed * 2.23694
            : clamp((distM / dt) * 2.23694, 0, 130);
        const hdg =
          heading !== null && !Number.isNaN(heading) && spd > 2
            ? heading
            : distM > 2.5
              ? bearingDeg(prev.lat, prev.lon, latitude, longitude)
              : prev.hdg;
        const longG = clamp(
          lerp(t.longG, ((spd - prev.spd) * 0.44704) / dt / 9.81, 0.45),
          -0.6,
          0.6
        );
        const trn = clamp(diffDeg(prev.hdg, hdg) / dt, -60, 60);
        const distFt = distM * 3.28084;
        const grd = clamp(
          lerp(t.gradePct, distFt > 8 ? ((altFt - prev.altFt) / distFt) * 100 : t.gradePct, 0.35),
          -20,
          20
        );

        t._lastGps = { lat: latitude, lon: longitude, altFt, spd, hdg, ts };
        const region = getGpsSectorRegion(latitude, longitude);
        ingestTelemetryStep(t, dt, spd, altFt, hdg, grd, longG, trn, performance.now(), region);
        syncHudFromTrip(t);
      },
      (err) => {
        setGpsStatus('error');
        setGpsError(err.message || 'GPS permission denied or unavailable.');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [mode, syncHudFromTrip]);

  return {
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
  };
}
