import test from 'node:test';
import assert from 'node:assert/strict';
import {
  worldToIso,
  isoToWorld,
  findNextConnectorForLevel,
  createInitialTimetable,
  stepTrainTimetable,
  triggerTrackChangeEvent,
  createInitialNpcs,
  stepNpcAgent,
  formatStationTime,
} from './rules';

test('isometric projection and inverse roundtrip are accurate across levels', () => {
  const centerX = 720;
  const centerY = 450;
  const zoom = 1.2;

  for (const level of [2, 0, -1, -2] as const) {
    const iso = worldToIso(3.5, -2.25, level, centerX, centerY, zoom, 'cutaway', 0);
    const back = isoToWorld(iso.sx, iso.sy, level, centerX, centerY, zoom, 'cutaway', 0);
    assert.ok(Math.abs(back.wx - 3.5) < 1e-6, `wx mismatch on level ${level}`);
    assert.ok(Math.abs(back.wy - -2.25) < 1e-6, `wy mismatch on level ${level}`);
  }
});

test('multi-level pathfinding routes from Stadtbahn (+2) to Tiefbahnhof (-2)', () => {
  const stepFromTop = findNextConnectorForLevel(2, -2, 0, 0);
  assert.ok(stepFromTop !== null, 'Should find a connector from level 2 toward level -2');
  assert.equal(stepFromTop.nextLevel, 0, 'First hop from +2 should go to level 0');

  const stepFromZero = findNextConnectorForLevel(0, -2, 1.5, -2.0);
  assert.ok(stepFromZero !== null, 'Should find a connector from level 0 toward level -2');
});

test('dynamic train timetable transitions through SCHEDULED -> APPROACHING -> BOARDING -> DEPARTING', () => {
  const trains = createInitialTimetable();
  const scheduled = trains.find((t) => t.state === 'SCHEDULED')!;
  assert.ok(scheduled, 'Should have a scheduled train');

  // Step past scheduled countdown
  stepTrainTimetable([scheduled], scheduled.stateTimerSec + 0.1);
  assert.equal(scheduled.state, 'APPROACHING');

  // Step past approaching countdown
  const resArrive = stepTrainTimetable([scheduled], 6.0);
  assert.equal(scheduled.state, 'BOARDING');
  assert.equal(resArrive.arrivedTrains.length, 1);

  // Step past boarding countdown
  const resDepart = stepTrainTimetable([scheduled], 21.0);
  assert.equal(scheduled.state, 'DEPARTING');
  assert.equal(resDepart.departedTrains.length, 1);
});

test('track change event swaps track number and updates NPC target platform', () => {
  const trains = createInitialTimetable();
  const npcs = createInitialNpcs(trains);
  const targetTrain = trains[0];
  const oldTrack = targetTrain.trackNumber;

  const changed = triggerTrackChangeEvent([targetTrain]);
  assert.ok(changed !== null);
  assert.notEqual(targetTrain.trackNumber, oldTrack);
  assert.equal(targetTrain.trackChanged, true);

  const commuter = npcs.find(
    (n) => n.assignedTrainId === targetTrain.id && n.archetype === 'ice_commuter'
  )!;
  stepNpcAgent(commuter, trains, 0, 0, 0, 0.1);
  assert.equal(commuter.targetWx, targetTrain.platformCoord);
});

test('formatStationTime formats minutes into 24h HH:MM clock', () => {
  assert.equal(formatStationTime(8 * 60 + 5), '08:05');
  assert.equal(formatStationTime(14 * 60 + 42), '14:42');
});
