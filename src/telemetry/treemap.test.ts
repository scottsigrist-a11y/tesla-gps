import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialTripData, stepSimulatorPhysics } from './math';
import {
  buildDriveMosaicTiles,
  computeSquarifiedTreemap,
  getGpsSectorRegion,
  getSimulatorRegion,
} from './treemap';

test('computeSquarifiedTreemap preserves total area with zero overlap inside container bounds', () => {
  const container = { x: 0, y: 0, w: 1200, h: 640 };
  const items = [
    { id: 'a', category: 'counties' as const, value: 45, headline: 'A', subtext: '', bg: '#2563EB', fg: '#FFF' },
    { id: 'b', category: 'energy' as const, value: 25, headline: 'B', subtext: '', bg: '#10B981', fg: '#000' },
    { id: 'c', category: 'pace' as const, value: 18, headline: 'C', subtext: '', bg: '#F59E0B', fg: '#000' },
    { id: 'd', category: 'counties' as const, value: 8, headline: 'D', subtext: '', bg: '#0891B2', fg: '#FFF' },
    { id: 'e', category: 'energy' as const, value: 4, headline: 'E', subtext: '', bg: '#14B8A6', fg: '#000' },
  ];

  const tiles = computeSquarifiedTreemap(items, container);
  assert.equal(tiles.length, 5);

  let areaSum = 0;
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    assert.ok(t.w > 0 && t.h > 0, `Tile ${t.id} should have positive dimensions`);
    assert.ok(t.x >= -0.01 && t.y >= -0.01);
    assert.ok(t.x + t.w <= container.w + 0.01);
    assert.ok(t.y + t.h <= container.h + 0.01);
    areaSum += t.w * t.h;

    for (let j = i + 1; j < tiles.length; j++) {
      const o = tiles[j];
      const overlapX = Math.min(t.x + t.w, o.x + o.w) - Math.max(t.x, o.x);
      const overlapY = Math.min(t.y + t.h, o.y + o.h) - Math.max(t.y, o.y);
      assert.ok(overlapX <= 0.01 || overlapY <= 0.01, `Tiles ${t.id} and ${o.id} overlap`);
    }
  }

  assert.ok(Math.abs(areaSum - container.w * container.h) < 1, 'Total tile area must match container area');
});

test('simulator regions and buildDriveMosaicTiles produce county and filtered category tiles', () => {
  const trip = createInitialTripData(420);
  for (let i = 0; i < 160; i++) {
    stepSimulatorPhysics(trip, 'canyon', 0.5, 1000 + i * 500);
  }

  const allTiles = buildDriveMosaicTiles(trip, 'all');
  const countyTiles = buildDriveMosaicTiles(trip, 'counties');
  const energyTiles = buildDriveMosaicTiles(trip, 'energy');
  const paceTiles = buildDriveMosaicTiles(trip, 'pace');

  assert.ok(countyTiles.length >= 2, 'Should traverse multiple simulated counties');
  assert.ok(energyTiles.length >= 2, 'Should generate energy & regen tiles');
  assert.ok(paceTiles.length >= 2, 'Should generate pace & stop tiles');
  assert.equal(allTiles.length, countyTiles.length + energyTiles.length + paceTiles.length);

  const simReg = getSimulatorRegion('mountain', 1.2);
  assert.ok(simReg.label.includes('County'));
  const gpsReg = getGpsSectorRegion(37.7749, -122.4194);
  assert.ok(gpsReg.label.includes('Sector'));
});

test('computeSquarifiedTreemap has zero overlap on full 10+ tile simulated Drive Mosaic', () => {
  const trip = createInitialTripData(420);
  for (let i = 0; i < 400; i++) {
    stepSimulatorPhysics(trip, 'canyon', 0.5, 1000 + i * 500);
  }
  const allItems = buildDriveMosaicTiles(trip, 'all');
  assert.ok(allItems.length >= 9, `Expected >= 9 tiles, got ${allItems.length}`);

  const container = { x: 0, y: 0, w: 1392, h: 682 };
  const tiles = computeSquarifiedTreemap(allItems, container);
  assert.equal(tiles.length, allItems.length);

  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    assert.ok(t.w > 0 && t.h > 0);
    for (let j = i + 1; j < tiles.length; j++) {
      const o = tiles[j];
      const overlapX = Math.min(t.x + t.w, o.x + o.w) - Math.max(t.x, o.x);
      const overlapY = Math.min(t.y + t.h, o.y + o.h) - Math.max(t.y, o.y);
      assert.ok(overlapX <= 0.01 || overlapY <= 0.01, `Tiles ${t.id} and ${o.id} overlap`);
    }
  }
});

