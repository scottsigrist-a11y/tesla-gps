import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bearingDeg,
  computePersonaScores,
  createInitialTripData,
  diffDeg,
  efficiencyColor,
  gradeColor,
  haversineM,
  ingestTelemetryStep,
  simTargets,
  speedColor,
  stepSimulatorPhysics,
  wrapDeg,
} from './math';

test('angle wrapping and shortest difference handle 0/360 boundary', () => {
  assert.equal(wrapDeg(-10), 350);
  assert.equal(wrapDeg(370), 10);
  assert.equal(diffDeg(350, 10), 20);
  assert.equal(diffDeg(10, 350), -20);
});

test('haversine and bearing compute realistic earth distance and heading', () => {
  const dist = haversineM(0, 0, 1, 0);
  assert.ok(dist > 111000 && dist < 111400, `Expected ~111.2km, got ${dist}`);
  const bNorth = bearingDeg(37.0, -122.0, 38.0, -122.0);
  assert.ok(Math.abs(bNorth - 0) < 0.01);
  const bEast = bearingDeg(0, 0, 0, 1);
  assert.ok(Math.abs(bEast - 90) < 0.01);
});

test('color helpers return valid rgb/rgba strings across speed, grade, and efficiency ranges', () => {
  assert.match(speedColor(0), /^rgb\(/);
  assert.match(speedColor(75, 0.5), /^rgba\(/);
  assert.match(gradeColor(-5), /^rgb\(/);
  assert.match(gradeColor(7, 0.8), /^rgba\(/);
  assert.match(efficiencyColor(-150), /^rgb\(/);
  assert.match(efficiencyColor(310, 0.7), /^rgba\(/);
});

test('simulator route profiles produce distinct driving dynamics', () => {
  const canyon = simTargets('canyon', 75);
  const cityStop = simTargets('city', 4);
  const mountainClimb = simTargets('mountain', 30);

  assert.ok(canyon.spd > 65, 'Canyon highway phase should reach highway speeds');
  assert.equal(cityStop.spd, 0, 'City profile should include complete stops');
  assert.ok(mountainClimb.grd > 5, 'Mountain pass climb should have steep positive grade');
});

test('ingestTelemetryStep accumulates brackets, path, G-G mandala, violin, spiral, regen harvest, and persona', () => {
  const trip = createInitialTripData(500);

  for (let i = 0; i < 80; i++) {
    stepSimulatorPhysics(trip, 'mountain', 0.25, 1000 + i * 250);
  }

  assert.ok(trip.elapsedSec >= 19.9, 'Elapsed time should be ~20s');
  assert.ok(trip.distanceMiles > 0, 'Distance should accumulate');
  assert.ok(trip.climbFt > 0, 'Climb feet should accumulate on mountain ascent');
  assert.ok(trip.barcodeBars.length >= 9, 'Barcode bars should emit every 2s');
  assert.ok(trip.ridgeWindows.length >= 1, 'Ridgeline window should emit after 12s');
  assert.ok(trip.pathPoints.length > 5, 'Dead-reckoning path should record 2D waypoints');
  assert.ok(trip.phaseTrail.length > 10, 'Phase trail should accumulate samples');
  assert.ok(trip.forceStream.length > 10, 'Force stream should record aero/climb forces');
  assert.ok(trip.spiralSlices.length >= 19, 'Spiral slices should emit every 1s');

  let violinSum = 0;
  for (let i = 0; i < trip.gradeSpeedViolin.length; i++) violinSum += trip.gradeSpeedViolin[i];
  assert.ok(violinSum > 19, 'Grade-speed violin matrix should accumulate dwell time');

  // Trigger a regen episode and then end it so it commits to regenEpisodes
  ingestTelemetryStep(trip, 1.5, 45, trip.altFt - 15, 95, -6.5, -0.25, 14, 30000);
  ingestTelemetryStep(trip, 0.5, 48, trip.altFt + 2, 95, 2.5, 0.15, 0, 31000);
  assert.ok(trip.regenEpisodes.length >= 1, 'Regen episode should commit after regen ends');
  assert.ok(trip.turnRipples.length > 0, 'Strong turn rate should spawn curvature ripple');

  const persona = computePersonaScores(trip);
  assert.equal(persona.length, 6);
  persona.forEach((ax) => {
    assert.ok(ax.tripScore > 0 && ax.tripScore <= 1, `${ax.key} score out of range`);
  });
});
