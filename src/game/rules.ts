import {
  STATION_LEVELS,
  STATION_POIS,
  STATION_TRACKS,
  VERTICAL_CONNECTORS,
  StationLevelId,
  VerticalConnector,
} from './stationData';

export interface IsoPoint {
  sx: number;
  sy: number;
}

export interface WorldPoint {
  wx: number;
  wy: number;
  level: StationLevelId;
}

// Isometric tile dimensions in pixels at zoom=1
export const ISO_TILE_W = 42;
export const ISO_TILE_H = 21;

export function getLevelElevationPx(
  level: StationLevelId,
  viewMode: 'cutaway' | 'single',
  activeLevel: StationLevelId
): number {
  const meta = STATION_LEVELS.find((l) => l.id === level);
  const baseElev = meta ? meta.elevationPx : 0;
  if (viewMode === 'cutaway') {
    return baseElev;
  }
  const activeMeta = STATION_LEVELS.find((l) => l.id === activeLevel);
  const activeElev = activeMeta ? activeMeta.elevationPx : 0;
  return (baseElev - activeElev) * 1.15;
}

/**
 * Converts 3D station world coordinates (wx, wy, level) to 2D isometric screen coordinates.
 */
export function worldToIso(
  wx: number,
  wy: number,
  level: StationLevelId,
  centerX: number,
  centerY: number,
  zoom: number = 1,
  viewMode: 'cutaway' | 'single' = 'cutaway',
  activeLevel: StationLevelId = 0
): IsoPoint {
  const isoX = (wx - wy) * (ISO_TILE_W * 0.5) * zoom;
  const isoY = (wx + wy) * (ISO_TILE_H * 0.5) * zoom;
  const elevOffset = getLevelElevationPx(level, viewMode, activeLevel) * zoom;
  return {
    sx: centerX + isoX,
    sy: centerY + isoY + elevOffset,
  };
}

/**
 * Inverse projection: converts screen coordinates (sx, sy) on a given level back to world (wx, wy).
 */
export function isoToWorld(
  sx: number,
  sy: number,
  level: StationLevelId,
  centerX: number,
  centerY: number,
  zoom: number = 1,
  viewMode: 'cutaway' | 'single' = 'cutaway',
  activeLevel: StationLevelId = 0
): { wx: number; wy: number } {
  const elevOffset = getLevelElevationPx(level, viewMode, activeLevel) * zoom;
  const dx = (sx - centerX) / (ISO_TILE_W * 0.5 * zoom);
  const dy = (sy - centerY - elevOffset) / (ISO_TILE_H * 0.5 * zoom);
  const wx = (dx + dy) * 0.5;
  const wy = (dy - dx) * 0.5;
  return { wx, wy };
}

/**
 * Multi-level BFS pathfinder across VERTICAL_CONNECTORS to move between levels.
 * Returns the next connector to walk toward on `currentLevel` to reach `targetLevel`.
 */
export function findNextConnectorForLevel(
  currentLevel: StationLevelId,
  targetLevel: StationLevelId,
  wx: number,
  wy: number
): {
  connector: VerticalConnector;
  entryWx: number;
  entryWy: number;
  exitWx: number;
  exitWy: number;
  nextLevel: StationLevelId;
} | null {
  if (currentLevel === targetLevel) return null;

  interface QueueItem {
    level: StationLevelId;
    firstStep: {
      connector: VerticalConnector;
      entryWx: number;
      entryWy: number;
      exitWx: number;
      exitWy: number;
      nextLevel: StationLevelId;
    } | null;
    cost: number;
  }

  const visited = new Set<StationLevelId>([currentLevel]);
  const queue: QueueItem[] = [{ level: currentLevel, firstStep: null, cost: 0 }];
  const candidates: NonNullable<QueueItem['firstStep']>[] = [];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr.level === targetLevel && curr.firstStep) {
      candidates.push(curr.firstStep);
      continue;
    }

    for (const conn of VERTICAL_CONNECTORS) {
      let neighborLevel: StationLevelId | null = null;
      let entryWx = 0;
      let entryWy = 0;
      let exitWx = 0;
      let exitWy = 0;

      if (conn.fromLevel === curr.level) {
        neighborLevel = conn.toLevel;
        entryWx = conn.fromWx;
        entryWy = conn.fromWy;
        exitWx = conn.toWx;
        exitWy = conn.toWy;
      } else if (conn.toLevel === curr.level) {
        neighborLevel = conn.fromLevel;
        entryWx = conn.toWx;
        entryWy = conn.toWy;
        exitWx = conn.fromWx;
        exitWy = conn.fromWy;
      }

      if (neighborLevel !== null && (!visited.has(neighborLevel) || neighborLevel === targetLevel)) {
        visited.add(neighborLevel);
        const step = curr.firstStep ?? {
          connector: conn,
          entryWx,
          entryWy,
          exitWx,
          exitWy,
          nextLevel: neighborLevel,
        };
        queue.push({
          level: neighborLevel,
          firstStep: step,
          cost: curr.cost + 1,
        });
      }
    }
  }

  if (candidates.length === 0) return null;

  // Pick the closest connector to (wx, wy)
  candidates.sort((a, b) => {
    const da = Math.hypot(a.entryWx - wx, a.entryWy - wy);
    const db = Math.hypot(b.entryWx - wx, b.entryWy - wy);
    return da - db;
  });

  return candidates[0];
}

// ============================================================================
// DYNAMIC TRAIN TIMETABLE ENGINE
// ============================================================================

export type TrainState = 'SCHEDULED' | 'APPROACHING' | 'BOARDING' | 'DEPARTING';

export interface ScheduledTrain {
  id: string;
  lineCode: string; // e.g. "ICE 1001", "S7", "FEX", "RE 1"
  category: 'ICE' | 'REGIO' | 'SBAHN' | 'FEX';
  origin: string;
  destination: string;
  via: string;
  trackNumber: number;
  level: StationLevelId;
  axis: 'ns' | 'ew';
  laneCoord: number;
  platformCoord: number;
  direction: 1 | -1;
  state: TrainState;
  stateTimerSec: number; // Countdown to next transition
  delayMinutes: number;
  trackChanged: boolean;
  positionAlongTrack: number; // -20 (entering) -> 0 (stopped at platform) -> +20 (exited)
  speed: number;
  passengersWaiting: number;
  passengersBoarded: number;
  colorPrimary: string;
  colorStripe: string;
}

export function createInitialTimetable(): ScheduledTrain[] {
  return [
    {
      id: 'train_ice_1001',
      lineCode: 'ICE 1001',
      category: 'ICE',
      origin: 'Hamburg-Altona',
      destination: 'München Hbf',
      via: 'Halle(S) · Erfurt · Nürnberg',
      trackNumber: 2,
      level: -2,
      axis: 'ns',
      laneCoord: -5.5,
      platformCoord: -6.8,
      direction: 1,
      state: 'BOARDING',
      stateTimerSec: 18,
      delayMinutes: 0,
      trackChanged: false,
      positionAlongTrack: 0,
      speed: 0,
      passengersWaiting: 14,
      passengersBoarded: 6,
      colorPrimary: '#f8fafc',
      colorStripe: '#dc2626',
    },
    {
      id: 'train_regio_re3',
      lineCode: 'RE 3',
      category: 'REGIO',
      origin: 'Stralsund Hbf',
      destination: 'Lutherstadt Wittenberg',
      via: 'Südkreuz · Jüterbog',
      trackNumber: 3,
      level: -2,
      axis: 'ns',
      laneCoord: -1.8,
      platformCoord: -0.4,
      direction: -1,
      state: 'BOARDING',
      stateTimerSec: 24,
      delayMinutes: 2,
      trackChanged: false,
      positionAlongTrack: -0.5,
      speed: 0,
      passengersWaiting: 11,
      passengersBoarded: 4,
      colorPrimary: '#dc2626',
      colorStripe: '#f8fafc',
    },
    {
      id: 'train_fex_ber',
      lineCode: 'FEX 1984',
      category: 'FEX',
      origin: 'Berlin Hbf (Tief)',
      destination: 'Flughafen BER T1-2',
      via: 'Ostkreuz',
      trackNumber: 5,
      level: -2,
      axis: 'ns',
      laneCoord: 4.4,
      platformCoord: 5.8,
      direction: 1,
      state: 'APPROACHING',
      stateTimerSec: 5,
      delayMinutes: 0,
      trackChanged: false,
      positionAlongTrack: -12,
      speed: 2.4,
      passengersWaiting: 16,
      passengersBoarded: 0,
      colorPrimary: '#dc2626',
      colorStripe: '#38bdf8',
    },
    {
      id: 'train_ice_592',
      lineCode: 'ICE 592',
      category: 'ICE',
      origin: 'Frankfurt(Main)Hbf',
      destination: 'Ostseebad Binz',
      via: 'Gesundbrunnen · Greifswald',
      trackNumber: 6,
      level: -2,
      axis: 'ns',
      laneCoord: 7.4,
      platformCoord: 6.0,
      direction: -1,
      state: 'BOARDING',
      stateTimerSec: 28,
      delayMinutes: 5,
      trackChanged: false,
      positionAlongTrack: 0.4,
      speed: 0,
      passengersWaiting: 18,
      passengersBoarded: 8,
      colorPrimary: '#f8fafc',
      colorStripe: '#dc2626',
    },
    {
      id: 'train_sbahn_s7',
      lineCode: 'S 7',
      category: 'SBAHN',
      origin: 'Ahrensfelde',
      destination: 'Potsdam Hbf',
      via: 'Zoo · Wannsee',
      trackNumber: 15,
      level: 2,
      axis: 'ew',
      laneCoord: 2.8,
      platformCoord: 1.4,
      direction: 1,
      state: 'BOARDING',
      stateTimerSec: 15,
      delayMinutes: 0,
      trackChanged: false,
      positionAlongTrack: 0,
      speed: 0,
      passengersWaiting: 19,
      passengersBoarded: 9,
      colorPrimary: '#dc2626',
      colorStripe: '#f59e0b',
    },
    {
      id: 'train_ice_948',
      lineCode: 'ICE 948',
      category: 'ICE',
      origin: 'Berlin Ostbahnhof',
      destination: 'Köln Hbf',
      via: 'Hannover · Bielefeld · Hamm',
      trackNumber: 11,
      level: 2,
      axis: 'ew',
      laneCoord: -5.5,
      platformCoord: -3.8,
      direction: -1,
      state: 'SCHEDULED',
      stateTimerSec: 12,
      delayMinutes: 0,
      trackChanged: false,
      positionAlongTrack: 17,
      speed: 0,
      passengersWaiting: 13,
      passengersBoarded: 0,
      colorPrimary: '#f8fafc',
      colorStripe: '#dc2626',
    },
    {
      id: 'train_sbahn_s9',
      lineCode: 'S 9',
      category: 'SBAHN',
      origin: 'Spandau',
      destination: 'Flughafen BER',
      via: 'Friedrichstr. · Alexanderplatz',
      trackNumber: 16,
      level: 2,
      axis: 'ew',
      laneCoord: 5.6,
      platformCoord: 4.2,
      direction: -1,
      state: 'APPROACHING',
      stateTimerSec: 6,
      delayMinutes: 0,
      trackChanged: false,
      positionAlongTrack: 13,
      speed: 2.2,
      passengersWaiting: 12,
      passengersBoarded: 0,
      colorPrimary: '#dc2626',
      colorStripe: '#fbbf24',
    },
    {
      id: 'train_ubahn_u5',
      lineCode: 'U 5',
      category: 'SBAHN',
      origin: 'Hönow',
      destination: 'Berlin Hbf (U-Bahn)',
      via: 'Alexanderplatz · Unter den Linden',
      trackNumber: 5,
      level: -2,
      axis: 'ew',
      laneCoord: 7.5,
      platformCoord: 6.2,
      direction: -1,
      state: 'BOARDING',
      stateTimerSec: 16,
      delayMinutes: 0,
      trackChanged: false,
      positionAlongTrack: 0,
      speed: 0,
      passengersWaiting: 15,
      passengersBoarded: 7,
      colorPrimary: '#facc15',
      colorStripe: '#1d4ed8',
    },
  ];
}

export interface TimetableStepResult {
  arrivedTrains: ScheduledTrain[];
  departedTrains: ScheduledTrain[];
}

/**
 * Advances all trains in the timetable by `dt` seconds.
 */
export function stepTrainTimetable(
  trains: ScheduledTrain[],
  dt: number
): TimetableStepResult {
  const arrivedTrains: ScheduledTrain[] = [];
  const departedTrains: ScheduledTrain[] = [];

  for (const train of trains) {
    train.stateTimerSec -= dt;

    if (train.state === 'SCHEDULED') {
      train.positionAlongTrack = -17 * train.direction;
      train.speed = 0;
      if (train.stateTimerSec <= 0) {
        train.state = 'APPROACHING';
        train.stateTimerSec = 5.5;
      }
    } else if (train.state === 'APPROACHING') {
      // Smoothly decelerate toward 0 (platform center)
      const progress = Math.max(0, Math.min(1, 1 - train.stateTimerSec / 5.5));
      const easeOut = 1 - Math.pow(1 - progress, 2.4);
      train.positionAlongTrack = (-17 + 17 * easeOut) * train.direction;
      train.speed = (1 - easeOut) * 10;

      if (train.stateTimerSec <= 0) {
        train.state = 'BOARDING';
        train.positionAlongTrack = 0;
        train.speed = 0;
        train.stateTimerSec = 20;
        train.passengersBoarded = 0;
        arrivedTrains.push(train);
      }
    } else if (train.state === 'BOARDING') {
      train.positionAlongTrack = 0;
      train.speed = 0;
      if (train.stateTimerSec <= 0) {
        train.state = 'DEPARTING';
        train.stateTimerSec = 5.5;
        departedTrains.push(train);
      }
    } else if (train.state === 'DEPARTING') {
      const progress = Math.max(0, Math.min(1, 1 - train.stateTimerSec / 5.5));
      const easeIn = Math.pow(progress, 2.1);
      train.positionAlongTrack = 18 * easeIn * train.direction;
      train.speed = easeIn * 12;

      if (train.stateTimerSec <= 0) {
        train.state = 'SCHEDULED';
        train.stateTimerSec = 10 + ((train.trackNumber * 3) % 12);
        train.positionAlongTrack = -17 * train.direction;
        train.speed = 0;
        train.passengersWaiting = 10 + ((train.passengersWaiting + 5) % 14);
      }
    }
  }

  return { arrivedTrains, departedTrains };
}

/**
 * Triggers a dynamic "Gleiswechsel" (track swap) on a scheduled or approaching train
 * to test and demonstrate NPC AI route recalculation.
 */
export function triggerTrackChangeEvent(trains: ScheduledTrain[]): ScheduledTrain | null {
  const candidate =
    trains.find((t) => t.state === 'SCHEDULED' || t.state === 'BOARDING') ?? trains[0];
  if (!candidate) return null;

  const sameLevelTracks = STATION_TRACKS.filter(
    (tr) => tr.level === candidate.level && tr.trackNumber !== candidate.trackNumber
  );
  if (sameLevelTracks.length === 0) return null;

  const nextTrack = sameLevelTracks[0];
  candidate.trackNumber = nextTrack.trackNumber;
  candidate.laneCoord = nextTrack.laneCoord;
  candidate.platformCoord = nextTrack.platformCoord;
  candidate.trackChanged = true;
  candidate.delayMinutes = Math.min(25, candidate.delayMinutes + 5);
  return candidate;
}

export function formatStationTime(totalMinutes: number): string {
  const minsInDay = ((Math.floor(totalMinutes) % 1440) + 1440) % 1440;
  const hh = Math.floor(minsInDay / 60)
    .toString()
    .padStart(2, '0');
  const mm = (minsInDay % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

// ============================================================================
// COMPLEX NPC AI BEHAVIOR TREE & ROUTING
// ============================================================================

export type NpcArchetype =
  | 'ice_commuter'
  | 'tourist'
  | 'sbahn_rush'
  | 'shopper'
  | 'db_staff'
  | 'rusher_hazard';

export type NpcGoalState =
  | 'CHECK_BOARD'
  | 'VISIT_SHOP'
  | 'TRANSIT_LEVEL'
  | 'WAIT_AT_PLATFORM'
  | 'BOARD_TRAIN'
  | 'PATROL'
  | 'WINDUP_DASH'
  | 'ACTIVE_DASH';

export interface NpcAgent {
  id: string;
  name: string;
  archetype: NpcArchetype;
  roleLabel: string;
  level: StationLevelId;
  wx: number;
  wy: number;
  vx: number;
  vy: number;
  speed: number;
  coatColor: string;
  accentColor: string;
  hasLuggage: boolean;
  hasBackpack: boolean;
  assignedTrainId: string;
  targetLevel: StationLevelId;
  targetWx: number;
  targetWy: number;
  goalState: NpcGoalState;
  goalTimerSec: number;
  thoughtBubble: string;
  needsHelp: boolean;
  helpedByPlayer: boolean;
  // For rusher_hazard windup telegraph & dash
  telegraphTimer: number;
  dashDirX: number;
  dashDirY: number;
  walkPhase: number;
}

const NPC_NAMES = [
  'Lukas M.',
  'Hannah K.',
  'Prof. Lindner',
  'Yuki Tanaka',
  'Marek Nowak',
  'Elena Rossi',
  'Jonas B.',
  'Svenja W.',
  'Tariq A.',
  'Clara v. Berg',
  'Zugchef Krause',
  'Sophie D.',
  'Matteo G.',
  'Anja P.',
  'David S.',
  'Eil-Kurier Rico',
  'Koffer-Sprinter Max',
  'Pendler-Hektiker Tim',
];

export function createInitialNpcs(trains: ScheduledTrain[]): NpcAgent[] {
  const archetypes: NpcArchetype[] = [
    'ice_commuter',
    'tourist',
    'sbahn_rush',
    'shopper',
    'db_staff',
    'rusher_hazard',
  ];

  const npcs: NpcAgent[] = [];

  for (let i = 0; i < 28; i++) {
    const archetype = archetypes[i % archetypes.length];
    const assignedTrain = trains[i % trains.length];

    let startLevel: StationLevelId = 0;
    let wx = ((i * 3.7) % 14) - 7;
    let wy = ((i * 2.3) % 6) - 2.5;
    let coatColor = '#334155';
    let accentColor = '#94a3b8';
    let speed = 2.1;
    let roleLabel = 'Fernreisender';
    let thoughtBubble = `Zu ${assignedTrain.lineCode} (Gl. ${assignedTrain.trackNumber})`;
    let needsHelp = false;

    if (archetype === 'ice_commuter') {
      startLevel = i % 2 === 0 ? 0 : -2;
      coatColor = '#1e293b';
      accentColor = '#38bdf8';
      speed = 2.2;
      roleLabel = 'ICE-Pendler';
      if (startLevel === -2) {
        wx = assignedTrain.axis === 'ns' ? assignedTrain.platformCoord : 0;
        wy = ((i * 2.9) % 12) - 6;
      }
    } else if (archetype === 'tourist') {
      startLevel = 0;
      coatColor = '#d97706';
      accentColor = '#fef08a';
      speed = 1.65;
      roleLabel = 'Tourist (Sucht Gleis)';
      thoughtBubble = 'Wo fährt der ICE ab? [E]';
      needsHelp = true;
    } else if (archetype === 'sbahn_rush') {
      startLevel = i % 2 === 0 ? 2 : 0;
      coatColor = '#0284c7';
      accentColor = '#bae6fd';
      speed = 2.75;
      roleLabel = 'S-Bahn Pendler';
      thoughtBubble = 'S-Bahn auf Ebene +2 erreichen!';
    } else if (archetype === 'shopper') {
      startLevel = i % 3 === 0 ? -1 : 0;
      coatColor = '#059669';
      accentColor = '#a7f3d0';
      speed = 1.85;
      roleLabel = 'Einkaufspassage-Gast';
      thoughtBubble = 'Erst zu Bakeral & Press-Shop';
    } else if (archetype === 'db_staff') {
      startLevel = ([-2, 0, 2] as StationLevelId[])[i % 3];
      coatColor = '#1e1b4b';
      accentColor = '#ef4444';
      speed = 2.0;
      roleLabel = 'DB Station & Service';
      thoughtBubble = 'Fahrgast-Auskunft bereit';
    } else if (archetype === 'rusher_hazard') {
      startLevel = ([-2, 0, 2] as StationLevelId[])[i % 3];
      coatColor = '#b91c1c';
      accentColor = '#fca5a5';
      speed = 3.2;
      roleLabel = 'Spät-Drängler (Achtung!)';
      thoughtBubble = 'Aus dem Weg! Zug fährt ab!';
    }

    const poi = STATION_POIS[i % STATION_POIS.length];

    npcs.push({
      id: `npc_${i}`,
      name: NPC_NAMES[i % NPC_NAMES.length],
      archetype,
      roleLabel,
      level: startLevel,
      wx,
      wy,
      vx: 0,
      vy: 0,
      speed,
      coatColor,
      accentColor,
      hasLuggage: archetype === 'ice_commuter' || archetype === 'rusher_hazard',
      hasBackpack: archetype === 'tourist' || archetype === 'sbahn_rush',
      assignedTrainId: assignedTrain.id,
      targetLevel: archetype === 'shopper' ? poi.level : assignedTrain.level,
      targetWx: archetype === 'shopper' ? poi.wx : assignedTrain.platformCoord,
      targetWy: archetype === 'shopper' ? poi.wy + 1.2 : ((i * 3.1) % 10) - 5,
      goalState: archetype === 'shopper' ? 'VISIT_SHOP' : 'WAIT_AT_PLATFORM',
      goalTimerSec: 4 + (i % 7),
      thoughtBubble,
      needsHelp,
      helpedByPlayer: false,
      telegraphTimer: 0,
      dashDirX: 1,
      dashDirY: 0,
      walkPhase: i * 0.8,
    });
  }

  return npcs;
}

/**
 * Steps an individual NPC AI agent along its multi-level station route.
 */
export function stepNpcAgent(
  npc: NpcAgent,
  trains: ScheduledTrain[],
  playerWx: number,
  playerWy: number,
  playerLevel: StationLevelId,
  dt: number
): { bumpedPlayer: boolean } {
  let bumpedPlayer = false;
  const assignedTrain = trains.find((t) => t.id === npc.assignedTrainId) ?? trains[0];

  // Dynamic timetable synchronization: if assigned train changed track or is boarding, update target!
  if (
    assignedTrain &&
    (npc.archetype === 'ice_commuter' || npc.archetype === 'sbahn_rush')
  ) {
    npc.targetLevel = assignedTrain.level;
    if (assignedTrain.axis === 'ns') {
      npc.targetWx = assignedTrain.platformCoord;
    } else {
      npc.targetWy = assignedTrain.platformCoord;
    }

    if (assignedTrain.state === 'BOARDING' && npc.level === assignedTrain.level) {
      npc.goalState = 'BOARD_TRAIN';
      npc.thoughtBubble = `Einstieg ${assignedTrain.lineCode} (Gl. ${assignedTrain.trackNumber})`;
    } else if (assignedTrain.trackChanged) {
      npc.thoughtBubble = `Gleiswechsel! Zu Gl. ${assignedTrain.trackNumber}!`;
    }
  }

  // Special behavior for 'rusher_hazard' (Line-of-Sight Charger with 0.55s windup telegraph)
  if (npc.archetype === 'rusher_hazard' && npc.level === playerLevel) {
    const distToPlayer = Math.hypot(playerWx - npc.wx, playerWy - npc.wy);

    if (npc.goalState === 'WINDUP_DASH') {
      npc.vx = 0;
      npc.vy = 0;
      npc.telegraphTimer -= dt;
      if (npc.telegraphTimer <= 0) {
        npc.goalState = 'ACTIVE_DASH';
        npc.goalTimerSec = 0.65;
      }
      return { bumpedPlayer: false };
    }

    if (npc.goalState === 'ACTIVE_DASH') {
      const dashSpeed = 7.2;
      npc.vx = npc.dashDirX * dashSpeed;
      npc.vy = npc.dashDirY * dashSpeed;
      npc.wx = Math.max(-10, Math.min(10, npc.wx + npc.vx * dt));
      npc.wy = Math.max(-8, Math.min(8, npc.wy + npc.vy * dt));
      npc.walkPhase += dt * 16;
      npc.goalTimerSec -= dt;

      if (Math.hypot(playerWx - npc.wx, playerWy - npc.wy) < 0.75) {
        bumpedPlayer = true;
        npc.goalState = 'WAIT_AT_PLATFORM';
        npc.goalTimerSec = 4.0;
      } else if (npc.goalTimerSec <= 0) {
        npc.goalState = 'WAIT_AT_PLATFORM';
        npc.goalTimerSec = 3.5;
      }
      return { bumpedPlayer };
    }

    // Trigger windup telegraph when within 4.2 units and cooldown expired
    if (distToPlayer < 4.2 && distToPlayer > 0.9 && npc.goalTimerSec <= 0) {
      const len = Math.max(0.01, distToPlayer);
      npc.dashDirX = (playerWx - npc.wx) / len;
      npc.dashDirY = (playerWy - npc.wy) / len;
      npc.goalState = 'WINDUP_DASH';
      npc.telegraphTimer = 0.55; // 550ms visible windup telegraph
      npc.thoughtBubble = 'ACHTUNG! Eil-Sprint!';
      return { bumpedPlayer: false };
    }
  }

  npc.goalTimerSec -= dt;

  // Multi-level routing: if NPC needs to reach another level, walk to nearest connector
  if (npc.level !== npc.targetLevel) {
    const nextStep = findNextConnectorForLevel(npc.level, npc.targetLevel, npc.wx, npc.wy);
    if (nextStep) {
      const dx = nextStep.entryWx - npc.wx;
      const dy = nextStep.entryWy - npc.wy;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.45) {
        // Transition to next level!
        npc.level = nextStep.nextLevel;
        npc.wx = nextStep.exitWx;
        npc.wy = nextStep.exitWy;
        npc.thoughtBubble = `${nextStep.connector.name}`;
      } else {
        npc.vx = (dx / dist) * npc.speed;
        npc.vy = (dy / dist) * npc.speed;
        npc.wx += npc.vx * dt;
        npc.wy += npc.vy * dt;
        npc.walkPhase += dt * npc.speed * 3.2;
      }
      return { bumpedPlayer: false };
    }
  }

  // Same-level target movement
  const dx = npc.targetWx - npc.wx;
  const dy = npc.targetWy - npc.wy;
  const dist = Math.hypot(dx, dy);

  if (dist > 0.35) {
    npc.vx = (dx / dist) * npc.speed;
    npc.vy = (dy / dist) * npc.speed;
    npc.wx += npc.vx * dt;
    npc.wy += npc.vy * dt;
    npc.walkPhase += dt * npc.speed * 3.2;
  } else {
    npc.vx = 0;
    npc.vy = 0;
    // Arrived at target waypoint; pick next goal when timer expires
    if (npc.goalTimerSec <= 0) {
      if (npc.goalState === 'BOARD_TRAIN' && assignedTrain) {
        assignedTrain.passengersBoarded += 1;
        // Respawn as a newly arriving passenger or shopper on another level
        const nextPoi = STATION_POIS[Math.floor(Math.abs(npc.wx * 7)) % STATION_POIS.length];
        npc.targetLevel = nextPoi.level;
        npc.targetWx = nextPoi.wx;
        npc.targetWy = nextPoi.wy + 1.1;
        npc.goalState = 'VISIT_SHOP';
        npc.goalTimerSec = 5.0;
        npc.thoughtBubble = `Besuche ${nextPoi.shortLabel}`;
      } else if (npc.goalState === 'VISIT_SHOP') {
        if (assignedTrain) {
          npc.targetLevel = assignedTrain.level;
          npc.targetWx =
            assignedTrain.axis === 'ns' ? assignedTrain.platformCoord : (npc.wx % 6) - 3;
          npc.targetWy =
            assignedTrain.axis === 'ew' ? assignedTrain.platformCoord : (npc.wy % 6) - 3;
          npc.goalState = 'WAIT_AT_PLATFORM';
          npc.goalTimerSec = 6.0;
          npc.thoughtBubble = `Zum Gleis ${assignedTrain.trackNumber} (${assignedTrain.lineCode})`;
        }
      } else {
        // Patrol or visit another POI
        const nextPoi =
          STATION_POIS[Math.floor((Math.abs(npc.wy) + 2) * 3) % STATION_POIS.length];
        npc.targetLevel = nextPoi.level;
        npc.targetWx = nextPoi.wx + ((npc.walkPhase % 2) - 1);
        npc.targetWy = nextPoi.wy + 1.0;
        npc.goalState = 'VISIT_SHOP';
        npc.goalTimerSec = 4.5;
        npc.thoughtBubble = `Weiter zu ${nextPoi.shortLabel}`;
      }
    }
  }

  return { bumpedPlayer };
}
