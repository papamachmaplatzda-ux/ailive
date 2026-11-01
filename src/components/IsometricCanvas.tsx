import React, { useEffect, useRef } from 'react';
import {
  STATION_LEVELS,
  STATION_POIS,
  STATION_TRACKS,
  VERTICAL_CONNECTORS,
  StationLevelId,
  StationPOI,
  VerticalConnector,
} from '../game/stationData';
import {
  worldToIso,
  isoToWorld,
  findNextConnectorForLevel,
  ScheduledTrain,
  NpcAgent,
  stepTrainTimetable,
  stepNpcAgent,
} from '../game/rules';
import { soundEngine } from '../game/sound';

export interface PlayerSimState {
  wx: number;
  wy: number;
  level: StationLevelId;
  targetWx: number | null;
  targetWy: number | null;
  targetLevel: StationLevelId | null;
  scaleX: number;
  scaleY: number;
  walkPhase: number;
  speedBoostTimer: number;
  dashCooldown: number;
  hitFlashTimer: number;
}

export interface NearbyInteraction {
  kind: 'poi' | 'connector' | 'train' | 'npc';
  id: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  poi?: StationPOI;
  connector?: VerticalConnector;
  train?: ScheduledTrain;
  npc?: NpcAgent;
}

interface PooledParticle {
  active: boolean;
  sx: number;
  sy: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

const MAX_PARTICLES = 120;

interface IsometricCanvasProps {
  gameState: 'title' | 'playing' | 'paused' | 'gameover';
  viewMode: 'cutaway' | 'single';
  activeLevel: StationLevelId;
  trainsRef: React.MutableRefObject<ScheduledTrain[]>;
  npcsRef: React.MutableRefObject<NpcAgent[]>;
  playerRef: React.MutableRefObject<PlayerSimState>;
  stationClockRef: React.MutableRefObject<number>;
  timeScale: number;
  onSelectLevel: (lvl: StationLevelId) => void;
  onNearbyChange: (nearby: NearbyInteraction | null) => void;
  onInteractTrigger: (nearby: NearbyInteraction) => void;
  onPlayerBumped: () => void;
  onTrainArrived: (train: ScheduledTrain) => void;
  onTickHud: () => void;
}

export const IsometricCanvas: React.FC<IsometricCanvasProps> = ({
  gameState,
  viewMode,
  activeLevel,
  trainsRef,
  npcsRef,
  playerRef,
  stationClockRef,
  timeScale,
  onSelectLevel,
  onNearbyChange,
  onInteractTrigger,
  onPlayerBumped,
  onTrainArrived,
  onTickHud,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Store latest props in refs so the 60Hz loop never tears down or re-mounts
  const propsRef = useRef({
    gameState,
    viewMode,
    activeLevel,
    timeScale,
    onSelectLevel,
    onNearbyChange,
    onInteractTrigger,
    onPlayerBumped,
    onTrainArrived,
    onTickHud,
  });

  useEffect(() => {
    propsRef.current = {
      gameState,
      viewMode,
      activeLevel,
      timeScale,
      onSelectLevel,
      onNearbyChange,
      onInteractTrigger,
      onPlayerBumped,
      onTrainArrived,
      onTickHud,
    };
  }, [
    gameState,
    viewMode,
    activeLevel,
    timeScale,
    onSelectLevel,
    onNearbyChange,
    onInteractTrigger,
    onPlayerBumped,
    onTrainArrived,
    onTickHud,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = container.clientWidth || 1440;
    let height = container.clientHeight || 900;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const updateSize = () => {
      if (!container || !canvas) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    };
    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(container);

    // Unified Input Hub: continuous held keys vs edge-triggered justPressed
    const keysHeld = new Set<string>();
    const keysJustPressed = new Set<string>();

    const clearInputs = () => {
      keysHeld.clear();
      keysJustPressed.clear();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (!keysHeld.has(code)) {
        keysJustPressed.add(code);
      }
      keysHeld.add(code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysHeld.delete(e.code);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) clearInputs();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Camera state & trauma shake
    let camPanX = 0;
    let camPanY = 18;
    let camZoom = 1.05;
    let cameraTrauma = 0;
    let hitstopTimer = 0;
    let titlePanAngle = 0;
    let lastHudSync = 0;
    let lastNearbyId = '';
    let currentNearby: NearbyInteraction | null = null;
    let stepSoundAccum = 0;

    // Pre-allocated Zero-GC Particle Ring Buffer
    const particlePool: PooledParticle[] = Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      sx: 0,
      sy: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 3,
      color: '#fbbf24',
    }));
    let particleWriteIdx = 0;

    const spawnParticles = (
      sx: number,
      sy: number,
      count: number,
      color: string,
      speedScale: number = 60
    ) => {
      for (let i = 0; i < count; i++) {
        const p = particlePool[particleWriteIdx];
        particleWriteIdx = (particleWriteIdx + 1) % MAX_PARTICLES;
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const spd = (0.4 + Math.random() * 0.8) * speedScale;
        p.active = true;
        p.sx = sx;
        p.sy = sy;
        p.vx = Math.cos(angle) * spd;
        p.vy = Math.sin(angle) * spd - 18;
        p.life = 0;
        p.maxLife = 0.35 + Math.random() * 0.35;
        p.size = 2.5 + Math.random() * 3.5;
        p.color = color;
      }
    };

    // Mouse / Pointer Click-to-Move & Drag Panning
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragMoved = false;

    const handlePointerDown = (e: PointerEvent) => {
      if (propsRef.current.gameState !== 'playing') return;
      isDragging = true;
      dragMoved = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      if (Math.hypot(dx, dy) > 6) {
        dragMoved = true;
        camPanX = Math.max(-360, Math.min(360, camPanX + dx));
        camPanY = Math.max(-240, Math.min(240, camPanY + dy));
        dragStartX = e.clientX;
        dragStartY = e.clientY;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      if (dragMoved || propsRef.current.gameState !== 'playing') return;

      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const centerX = width * 0.5 + camPanX;
      const centerY = height * 0.52 + camPanY;

      // Convert click to world coordinates on player's active level
      const p = playerRef.current;
      const wCoord = isoToWorld(
        sx,
        sy,
        p.level,
        centerX,
        centerY,
        camZoom,
        propsRef.current.viewMode,
        propsRef.current.activeLevel
      );

      p.targetWx = Math.max(-10.5, Math.min(10.5, wCoord.wx));
      p.targetWy = Math.max(-6.5, Math.min(6.5, wCoord.wy));
      p.targetLevel = p.level;

      const clickIso = worldToIso(
        p.targetWx,
        p.targetWy,
        p.level,
        centerX,
        centerY,
        camZoom,
        propsRef.current.viewMode,
        propsRef.current.activeLevel
      );
      spawnParticles(clickIso.sx, clickIso.sy, 6, '#38bdf8', 35);
      soundEngine.playStep();
    };

    const handleWheel = (e: WheelEvent) => {
      if (propsRef.current.gameState !== 'playing') return;
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      camZoom = Math.max(0.75, Math.min(1.55, camZoom + delta));
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('wheel', handleWheel, { passive: true });

    // Expose a global trigger for external buttons (e.g. "Interact", "Center Camera")
    (window as unknown as { __berlinHbfTriggerDash?: () => void }).__berlinHbfTriggerDash = () => {
      keysJustPressed.add('Space');
    };
    (window as unknown as { __berlinHbfResetCamera?: () => void }).__berlinHbfResetCamera = () => {
      camPanX = 0;
      camPanY = 18;
      camZoom = 1.05;
    };

    let lastTime = performance.now();
    let animId = 0;
    let timerId = 0;
    let isDisposed = false;

    const scheduleNextFrame = () => {
      if (isDisposed) return;
      timerId = window.setTimeout(() => {
        if (!isDisposed) {
          renderFrame(performance.now());
        }
      }, 32);
    };

    // Helper: draw isometric polygon
    const drawIsoQuad = (
      wx1: number,
      wy1: number,
      wx2: number,
      wy2: number,
      level: StationLevelId,
      centerX: number,
      centerY: number,
      fill: string,
      stroke?: string,
      lineWidth: number = 1
    ) => {
      const { viewMode: vm, activeLevel: al } = propsRef.current;
      const p1 = worldToIso(wx1, wy1, level, centerX, centerY, camZoom, vm, al);
      const p2 = worldToIso(wx2, wy1, level, centerX, centerY, camZoom, vm, al);
      const p3 = worldToIso(wx2, wy2, level, centerX, centerY, camZoom, vm, al);
      const p4 = worldToIso(wx1, wy2, level, centerX, centerY, camZoom, vm, al);

      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.lineTo(p3.sx, p3.sy);
      ctx.lineTo(p4.sx, p4.sy);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    };

    // Helper: draw 3D isometric box (extruded prism)
    const drawIsoBox = (
      wx: number,
      wy: number,
      w: number,
      d: number,
      hPx: number,
      level: StationLevelId,
      centerX: number,
      centerY: number,
      topColor: string,
      leftColor: string,
      rightColor: string,
      strokeColor: string = 'rgba(15, 23, 42, 0.7)'
    ) => {
      const { viewMode: vm, activeLevel: al } = propsRef.current;
      const h = hPx * camZoom;
      const hw = w * 0.5;
      const hd = d * 0.5;

      const bBack = worldToIso(wx - hw, wy - hd, level, centerX, centerY, camZoom, vm, al);
      const bRight = worldToIso(wx + hw, wy - hd, level, centerX, centerY, camZoom, vm, al);
      const bFront = worldToIso(wx + hw, wy + hd, level, centerX, centerY, camZoom, vm, al);
      const bLeft = worldToIso(wx - hw, wy + hd, level, centerX, centerY, camZoom, vm, al);

      // Left face (bLeft -> bFront extruded up by h)
      ctx.beginPath();
      ctx.moveTo(bLeft.sx, bLeft.sy);
      ctx.lineTo(bFront.sx, bFront.sy);
      ctx.lineTo(bFront.sx, bFront.sy - h);
      ctx.lineTo(bLeft.sx, bLeft.sy - h);
      ctx.closePath();
      ctx.fillStyle = leftColor;
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Right face (bFront -> bRight extruded up by h)
      ctx.beginPath();
      ctx.moveTo(bFront.sx, bFront.sy);
      ctx.lineTo(bRight.sx, bRight.sy);
      ctx.lineTo(bRight.sx, bRight.sy - h);
      ctx.lineTo(bFront.sx, bFront.sy - h);
      ctx.closePath();
      ctx.fillStyle = rightColor;
      ctx.fill();
      ctx.stroke();

      // Top face
      ctx.beginPath();
      ctx.moveTo(bBack.sx, bBack.sy - h);
      ctx.lineTo(bRight.sx, bRight.sy - h);
      ctx.lineTo(bFront.sx, bFront.sy - h);
      ctx.lineTo(bLeft.sx, bLeft.sy - h);
      ctx.closePath();
      ctx.fillStyle = topColor;
      ctx.fill();
      ctx.stroke();

      return {
        topCenter: {
          sx: (bBack.sx + bFront.sx) * 0.5,
          sy: (bBack.sy + bFront.sy) * 0.5 - h,
        },
        frontBase: bFront,
      };
    };

    const renderFrame = (now: number) => {
      if (isDisposed) return;

      // Clamp frame delta time <= 0.05s
      const rawDt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const {
        gameState: gs,
        viewMode: vm,
        activeLevel: al,
        timeScale: ts,
      } = propsRef.current;

      // Decay camera trauma & hitstop in real dt
      if (cameraTrauma > 0) {
        cameraTrauma = Math.max(0, cameraTrauma - rawDt * 2.2);
      }
      if (hitstopTimer > 0) {
        hitstopTimer = Math.max(0, hitstopTimer - rawDt);
      }

      const simActive = gs === 'playing' || gs === 'title';
      const simDt = simActive && hitstopTimer <= 0 ? rawDt * ts : 0;

      const player = playerRef.current;
      const trains = trainsRef.current;
      const npcs = npcsRef.current;

      // Title screen smooth live camera tour pan
      if (gs === 'title') {
        titlePanAngle += rawDt * 0.35;
        camPanX = Math.sin(titlePanAngle) * 75;
        camPanY = 15 + Math.cos(titlePanAngle * 0.7) * 28;
        camZoom = 1.04;
      }

      const shakeMag = cameraTrauma * cameraTrauma * 14;
      const shakeX = shakeMag > 0.1 ? (Math.random() - 0.5) * 2 * shakeMag : 0;
      const shakeY = shakeMag > 0.1 ? (Math.random() - 0.5) * 2 * shakeMag : 0;

      const centerX = width * 0.5 + camPanX + shakeX;
      const centerY = height * 0.52 + camPanY + shakeY;

      // ======================================================================
      // 1. SIMULATION STEP (TRAINS, NPCS, PLAYER, INPUTS)
      // ======================================================================
      if (simDt > 0) {
        // Advance station clock (1 real second = 1 station minute)
        stationClockRef.current = (stationClockRef.current + simDt * 0.85) % 1440;

        // Step train timetable
        const { arrivedTrains } = stepTrainTimetable(trains, simDt);
        if (arrivedTrains.length > 0 && gs === 'playing') {
          for (const tr of arrivedTrains) {
            propsRef.current.onTrainArrived(tr);
            const trIso = worldToIso(
              tr.axis === 'ns' ? tr.laneCoord : 0,
              tr.axis === 'ew' ? tr.laneCoord : 0,
              tr.level,
              centerX,
              centerY,
              camZoom,
              vm,
              al
            );
            spawnParticles(trIso.sx, trIso.sy, 14, '#fbbf24', 75);
          }
        }

        // Step NPCs
        for (const npc of npcs) {
          const { bumpedPlayer } = stepNpcAgent(
            npc,
            trains,
            player.wx,
            player.wy,
            player.level,
            simDt
          );
          if (bumpedPlayer && gs === 'playing' && player.hitFlashTimer <= 0) {
            player.hitFlashTimer = 0.45;
            player.scaleX = 1.28;
            player.scaleY = 0.74;
            hitstopTimer = 0.055; // 55ms heavy impact hitstop
            cameraTrauma = Math.min(1, cameraTrauma + 0.65);
            const pIso = worldToIso(
              player.wx,
              player.wy,
              player.level,
              centerX,
              centerY,
              camZoom,
              vm,
              al
            );
            spawnParticles(pIso.sx, pIso.sy - 15, 22, '#ef4444', 110);
            soundEngine.playBumpImpact();
            propsRef.current.onPlayerBumped();
          }
        }

        // Player timers & squash-and-stretch recovery
        player.scaleX += (1 - player.scaleX) * Math.min(1, rawDt * 12);
        player.scaleY += (1 - player.scaleY) * Math.min(1, rawDt * 12);
        if (player.speedBoostTimer > 0) player.speedBoostTimer = Math.max(0, player.speedBoostTimer - simDt);
        if (player.dashCooldown > 0) player.dashCooldown = Math.max(0, player.dashCooldown - simDt);
        if (player.hitFlashTimer > 0) player.hitFlashTimer = Math.max(0, player.hitFlashTimer - rawDt);

        if (gs === 'playing') {
          // Handle edge-triggered level shortcuts (1-4)
          if (keysJustPressed.has('Digit1')) propsRef.current.onSelectLevel(2);
          if (keysJustPressed.has('Digit2')) propsRef.current.onSelectLevel(0);
          if (keysJustPressed.has('Digit3')) propsRef.current.onSelectLevel(-1);
          if (keysJustPressed.has('Digit4')) propsRef.current.onSelectLevel(-2);

          // Handle edge-triggered Dash / Durchsage (Space)
          if (keysJustPressed.has('Space') && player.dashCooldown <= 0) {
            player.dashCooldown = 1.4;
            player.scaleX = 0.82;
            player.scaleY = 1.22;
            soundEngine.playDashSwoosh();
            const pIso = worldToIso(
              player.wx,
              player.wy,
              player.level,
              centerX,
              centerY,
              camZoom,
              vm,
              al
            );
            spawnParticles(pIso.sx, pIso.sy - 10, 16, '#38bdf8', 95);

            // Calm any nearby rushing hazards
            for (const npc of npcs) {
              if (
                npc.level === player.level &&
                Math.hypot(npc.wx - player.wx, npc.wy - player.wy) < 3.5
              ) {
                if (npc.archetype === 'rusher_hazard') {
                  npc.goalState = 'WAIT_AT_PLATFORM';
                  npc.telegraphTimer = 0;
                  npc.goalTimerSec = 6.0;
                  npc.thoughtBubble = 'Entschuldigung! Ich gehe langsam.';
                }
              }
            }
          }

          // Handle edge-triggered Interact (KeyE)
          if (keysJustPressed.has('KeyE') && currentNearby) {
            const pIso = worldToIso(
              player.wx,
              player.wy,
              player.level,
              centerX,
              centerY,
              camZoom,
              vm,
              al
            );
            spawnParticles(pIso.sx, pIso.sy - 18, 10, '#fbbf24', 65);
            propsRef.current.onInteractTrigger(currentNearby);
          }

          // WASD / Arrow Continuous Movement in Screen-Aligned Isometric Directions
          let inputScreenX = 0;
          let inputScreenY = 0;
          if (keysHeld.has('KeyW') || keysHeld.has('ArrowUp')) inputScreenY -= 1;
          if (keysHeld.has('KeyS') || keysHeld.has('ArrowDown')) inputScreenY += 1;
          if (keysHeld.has('KeyA') || keysHeld.has('ArrowLeft')) inputScreenX -= 1;
          if (keysHeld.has('KeyD') || keysHeld.has('ArrowRight')) inputScreenX += 1;

          const baseMoveSpeed =
            (player.speedBoostTimer > 0 ? 4.8 : 3.5) *
            (player.dashCooldown > 1.1 ? 2.1 : 1.0);

          if (inputScreenX !== 0 || inputScreenY !== 0) {
            // Cancel click-to-move target when manual keys are pressed
            player.targetWx = null;
            player.targetWy = null;
            player.targetLevel = null;

            // Convert screen vector (inputScreenX, inputScreenY) to isometric world vector (dWx, dWy)
            const dwx = inputScreenX + inputScreenY;
            const dwy = inputScreenY - inputScreenX;
            const len = Math.hypot(dwx, dwy) || 1;
            const vx = (dwx / len) * baseMoveSpeed;
            const vy = (dwy / len) * baseMoveSpeed;

            player.wx = Math.max(-10.5, Math.min(10.5, player.wx + vx * simDt));
            player.wy = Math.max(-6.5, Math.min(6.5, player.wy + vy * simDt));
            player.walkPhase += Math.hypot(vx, vy) * simDt * 3.2;
            stepSoundAccum += Math.hypot(vx, vy) * simDt;
            if (stepSoundAccum > 1.4) {
              stepSoundAccum = 0;
              soundEngine.playStep();
            }
          } else if (player.targetWx !== null && player.targetWy !== null) {
            // Click-to-move or multi-level connector navigation
            if (player.targetLevel !== null && player.targetLevel !== player.level) {
              const stepConn = findNextConnectorForLevel(
                player.level,
                player.targetLevel,
                player.wx,
                player.wy
              );
              if (stepConn) {
                const dx = stepConn.entryWx - player.wx;
                const dy = stepConn.entryWy - player.wy;
                const dist = Math.hypot(dx, dy);
                if (dist < 0.45) {
                  const goingUp = stepConn.nextLevel > player.level;
                  player.level = stepConn.nextLevel;
                  player.wx = stepConn.exitWx;
                  player.wy = stepConn.exitWy;
                  player.scaleX = 0.85;
                  player.scaleY = 1.18;
                  soundEngine.playElevatorDing(goingUp);
                  propsRef.current.onSelectLevel(player.level);
                } else {
                  player.wx += (dx / dist) * baseMoveSpeed * simDt;
                  player.wy += (dy / dist) * baseMoveSpeed * simDt;
                  player.walkPhase += baseMoveSpeed * simDt * 3.2;
                }
              }
            } else {
              const dx = player.targetWx - player.wx;
              const dy = player.targetWy - player.wy;
              const dist = Math.hypot(dx, dy);
              if (dist < 0.25) {
                player.targetWx = null;
                player.targetWy = null;
                player.targetLevel = null;
              } else {
                player.wx += (dx / dist) * baseMoveSpeed * simDt;
                player.wy += (dy / dist) * baseMoveSpeed * simDt;
                player.walkPhase += baseMoveSpeed * simDt * 3.2;
              }
            }
          }

          // Detect closest interactive POI, Connector, Boarding Train, or Tourist NPC on player's level
          let bestDist = 2.4;
          let foundNearby: NearbyInteraction | null = null;

          // 1. Check POIs / Shops
          for (const poi of STATION_POIS) {
            if (poi.level !== player.level) continue;
            const d = Math.hypot(poi.wx - player.wx, poi.wy + 0.8 - player.wy);
            if (d < bestDist) {
              bestDist = d;
              foundNearby = {
                kind: 'poi',
                id: poi.id,
                title: poi.name,
                subtitle: poi.description,
                actionLabel:
                  poi.type === 'board' ? 'Abfahrtstafel öffnen [E]' : `${poi.shortLabel} betreten [E]`,
                poi,
              };
            }
          }

          // 2. Check Vertical Connectors (Elevators, Escalators, Stairs)
          for (const conn of VERTICAL_CONNECTORS) {
            if (conn.fromLevel === player.level) {
              const d = Math.hypot(conn.fromWx - player.wx, conn.fromWy - player.wy);
              if (d < bestDist) {
                bestDist = d;
                foundNearby = {
                  kind: 'connector',
                  id: `${conn.id}_to_${conn.toLevel}`,
                  title: conn.name,
                  subtitle: `Wechselt direkt auf Ebene ${conn.toLevel > 0 ? `+${conn.toLevel}` : conn.toLevel}`,
                  actionLabel: `Auf Ebene ${conn.toLevel > 0 ? `+${conn.toLevel}` : conn.toLevel} wechseln [E]`,
                  connector: conn,
                };
              }
            } else if (conn.toLevel === player.level) {
              const d = Math.hypot(conn.toWx - player.wx, conn.toWy - player.wy);
              if (d < bestDist) {
                bestDist = d;
                foundNearby = {
                  kind: 'connector',
                  id: `${conn.id}_to_${conn.fromLevel}`,
                  title: conn.name,
                  subtitle: `Wechselt direkt auf Ebene ${conn.fromLevel > 0 ? `+${conn.fromLevel}` : conn.fromLevel}`,
                  actionLabel: `Auf Ebene ${conn.fromLevel > 0 ? `+${conn.fromLevel}` : conn.fromLevel} wechseln [E]`,
                  connector: conn,
                };
              }
            }
          }

          // 3. Check Boarding Trains on player's level
          for (const tr of trains) {
            if (tr.level !== player.level || tr.state !== 'BOARDING') continue;
            const d =
              tr.axis === 'ns'
                ? Math.abs(tr.platformCoord - player.wx)
                : Math.abs(tr.platformCoord - player.wy);
            if (d < 1.8) {
              foundNearby = {
                kind: 'train',
                id: tr.id,
                title: `${tr.lineCode} nach ${tr.destination}`,
                subtitle: `Gleis ${tr.trackNumber} · Türen geöffnet (${Math.ceil(tr.stateTimerSec)}s bis Abfahrt)`,
                actionLabel: `In ${tr.lineCode} einsteigen [E]`,
                train: tr,
              };
            }
          }

          // 4. Check Tourists / NPCs needing assistance
          for (const npc of npcs) {
            if (npc.level !== player.level || !npc.needsHelp || npc.helpedByPlayer) continue;
            const d = Math.hypot(npc.wx - player.wx, npc.wy - player.wy);
            if (d < 1.9) {
              foundNearby = {
                kind: 'npc',
                id: npc.id,
                title: `${npc.name} (${npc.roleLabel})`,
                subtitle: '„Entschuldigung, können Sie mir den schnellsten Weg zum richtigen Gleis zeigen?“',
                actionLabel: 'Auskunft geben (+10 € / +60 XP) [E]',
                npc,
              };
            }
          }

          currentNearby = foundNearby;
          const nextId = foundNearby ? foundNearby.id : '';
          if (nextId !== lastNearbyId) {
            lastNearbyId = nextId;
            propsRef.current.onNearbyChange(foundNearby);
          }
        }
      }

      // Clear single-frame edge triggers
      keysJustPressed.clear();

      // Throttle HUD numerical sync to ~5Hz
      if (now - lastHudSync > 200) {
        lastHudSync = now;
        propsRef.current.onTickHud();
      }

      // ======================================================================
      // 2. CANVAS RENDERING (PAINTER'S ALGORITHM: VAULT -> -2 -> -1 -> 0 -> +2)
      // ======================================================================
      ctx.save();
      ctx.scale(dpr, dpr);

      // Architectural Background: Deep Berlin Hbf Vaulted Concrete & Night-Glass Slate
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#1e2430');
      bgGrad.addColorStop(0.45, '#28303f');
      bgGrad.addColorStop(1, '#141821');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw Vaulted Tunnel Arch & Warm Sconce Lights (matching top left of reference image!)
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
      ctx.lineWidth = 3 * camZoom;
      for (let arc = -3; arc <= 3; arc++) {
        ctx.beginPath();
        ctx.ellipse(
          centerX + arc * 150 * camZoom,
          centerY - 90 * camZoom,
          560 * camZoom,
          380 * camZoom,
          -0.22,
          Math.PI * 0.95,
          Math.PI * 2.05
        );
        ctx.stroke();
      }

      // Warm linear wall light fixtures along the upper tunnel wall
      for (let i = -4; i <= 4; i++) {
        const lx = centerX + i * 135 * camZoom;
        const ly = centerY - 260 * camZoom + Math.abs(i) * 22 * camZoom;
        const glow = ctx.createRadialGradient(lx, ly, 2, lx, ly, 36 * camZoom);
        glow.addColorStop(0, 'rgba(254, 243, 199, 0.85)');
        glow.addColorStop(0.4, 'rgba(245, 158, 11, 0.28)');
        glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(lx, ly, 36 * camZoom, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 3 * camZoom;
        ctx.beginPath();
        ctx.moveTo(lx - 14 * camZoom, ly + 5 * camZoom);
        ctx.lineTo(lx + 14 * camZoom, ly - 5 * camZoom);
        ctx.stroke();
      }
      ctx.restore();

      // Helper to compute level alpha when in single-level vs cutaway mode
      const getLevelAlpha = (lvl: StationLevelId) => {
        if (vm === 'cutaway') return 1.0;
        return lvl === al ? 1.0 : 0.22;
      };

      // Helper to draw a train carriage along a track
      const drawTrainOnTrack = (tr: ScheduledTrain) => {
        if (tr.state === 'SCHEDULED') return;
        const pos = tr.positionAlongTrack;
        const carLen = 9.5; // Total train length in world units

        let wx1 = 0,
          wy1 = 0,
          wx2 = 0,
          wy2 = 0;
        if (tr.axis === 'ns') {
          wx1 = tr.laneCoord - 0.68;
          wx2 = tr.laneCoord + 0.68;
          wy1 = pos - carLen * 0.5;
          wy2 = pos + carLen * 0.5;
        } else {
          wx1 = pos - carLen * 0.5;
          wx2 = pos + carLen * 0.5;
          wy1 = tr.laneCoord - 0.68;
          wy2 = tr.laneCoord + 0.68;
        }

        const isIce = tr.category === 'ICE';
        const topCol = isIce ? '#f1f5f9' : '#dc2626';
        const leftCol = isIce ? '#e2e8f0' : '#b91c1c';
        const rightCol = isIce ? '#cbd5e1' : '#991b1b';

        const cx = (wx1 + wx2) * 0.5;
        const cy = (wy1 + wy2) * 0.5;
        const w = Math.abs(wx2 - wx1);
        const d = Math.abs(wy2 - wy1);

        const box = drawIsoBox(
          cx,
          cy,
          w,
          d,
          24,
          tr.level,
          centerX,
          centerY,
          topCol,
          leftCol,
          rightCol,
          '#1e293b'
        );

        // Draw characteristic red stripe on white ICE or window band
        drawIsoBox(
          cx,
          cy,
          w * 1.01,
          d * 1.01,
          14,
          tr.level,
          centerX,
          centerY,
          topCol,
          tr.colorStripe,
          '#1e293b',
          'transparent'
        );

        // Train roof badge (Line Code + Status)
        ctx.save();
        ctx.font = `700 ${Math.round(10 * camZoom)}px "JetBrains Mono", monospace`;
        const badgeText =
          tr.state === 'BOARDING'
            ? `${tr.lineCode} · EINSTIEG (${Math.ceil(tr.stateTimerSec)}s)`
            : `${tr.lineCode} -> ${tr.destination}`;
        const tw = ctx.measureText(badgeText).width + 12 * camZoom;
        const bx = box.topCenter.sx - tw * 0.5;
        const by = box.topCenter.sy - 18 * camZoom;

        ctx.fillStyle = tr.state === 'BOARDING' ? 'rgba(16, 185, 129, 0.92)' : 'rgba(15, 23, 42, 0.88)';
        ctx.fillRect(bx, by, tw, 16 * camZoom);
        ctx.strokeStyle = tr.state === 'BOARDING' ? '#a7f3d0' : '#475569';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, tw, 16 * camZoom);

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, box.topCenter.sx, by + 8 * camZoom);
        ctx.restore();
      };

      // Helper to render characters (NPCs and Player) on a given level
      const renderActorsOnLevel = (lvl: StationLevelId) => {
        const actors: Array<{
          sortY: number;
          draw: () => void;
        }> = [];

        for (const npc of npcs) {
          if (npc.level !== lvl) continue;
          const iso = worldToIso(npc.wx, npc.wy, lvl, centerX, centerY, camZoom, vm, al);
          actors.push({
            sortY: iso.sy,
            draw: () => {
              // If rusher_hazard is in WINDUP_DASH, draw visible red/amber windup telegraph line!
              if (npc.goalState === 'WINDUP_DASH') {
                const targetIso = worldToIso(
                  npc.wx + npc.dashDirX * 4.5,
                  npc.wy + npc.dashDirY * 4.5,
                  lvl,
                  centerX,
                  centerY,
                  camZoom,
                  vm,
                  al
                );
                ctx.save();
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 3 * camZoom;
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.moveTo(iso.sx, iso.sy);
                ctx.lineTo(targetIso.sx, targetIso.sy);
                ctx.stroke();

                // Warning ring around hazard NPC
                ctx.setLineDash([]);
                ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
                ctx.beginPath();
                ctx.ellipse(iso.sx, iso.sy, 18 * camZoom, 9 * camZoom, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
              }

              // Shadow oval
              ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
              ctx.beginPath();
              ctx.ellipse(iso.sx, iso.sy, 7 * camZoom, 3.8 * camZoom, 0, 0, Math.PI * 2);
              ctx.fill();

              const bob = Math.abs(Math.sin(npc.walkPhase)) * 3 * camZoom;

              // Rolling suitcase if hasLuggage
              if (npc.hasLuggage) {
                ctx.fillStyle = '#475569';
                ctx.fillRect(
                  iso.sx + 6 * camZoom,
                  iso.sy - 10 * camZoom,
                  5 * camZoom,
                  9 * camZoom
                );
              }

              // Coat torso
              ctx.fillStyle = npc.coatColor;
              ctx.beginPath();
              ctx.roundRect(
                iso.sx - 5 * camZoom,
                iso.sy - 18 * camZoom - bob,
                10 * camZoom,
                13 * camZoom,
                3 * camZoom
              );
              ctx.fill();
              ctx.strokeStyle = '#0f172a';
              ctx.lineWidth = 1;
              ctx.stroke();

              // Head
              ctx.fillStyle = '#fde68a';
              ctx.beginPath();
              ctx.arc(iso.sx, iso.sy - 22 * camZoom - bob, 4.2 * camZoom, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();

              // DB Red cap for staff or question badge for tourist
              if (npc.archetype === 'db_staff') {
                ctx.fillStyle = '#dc2626';
                ctx.fillRect(
                  iso.sx - 4.5 * camZoom,
                  iso.sy - 26.5 * camZoom - bob,
                  9 * camZoom,
                  3 * camZoom
                );
              } else if (npc.needsHelp && !npc.helpedByPlayer) {
                ctx.fillStyle = '#f59e0b';
                ctx.font = `700 ${Math.round(11 * camZoom)}px "JetBrains Mono", monospace`;
                ctx.textAlign = 'center';
                ctx.fillText('?', iso.sx, iso.sy - 30 * camZoom - bob);
              }
            },
          });
        }

        // Player on this level
        if (player.level === lvl) {
          const pIso = worldToIso(player.wx, player.wy, lvl, centerX, centerY, camZoom, vm, al);
          actors.push({
            sortY: pIso.sy + 0.1,
            draw: () => {
              // Target destination beacon if click-to-move is active
              if (player.targetWx !== null && player.targetWy !== null) {
                const tIso = worldToIso(
                  player.targetWx,
                  player.targetWy,
                  player.targetLevel ?? lvl,
                  centerX,
                  centerY,
                  camZoom,
                  vm,
                  al
                );
                ctx.save();
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(tIso.sx, tIso.sy, 11 * camZoom, 5.5 * camZoom, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
              }

              // Golden-cyan player locator ring on floor
              ctx.save();
              ctx.strokeStyle = player.hitFlashTimer > 0 ? '#ef4444' : '#38bdf8';
              ctx.lineWidth = 2.5 * camZoom;
              ctx.fillStyle =
                player.hitFlashTimer > 0
                  ? 'rgba(239, 68, 68, 0.28)'
                  : 'rgba(56, 189, 248, 0.22)';
              ctx.beginPath();
              ctx.ellipse(pIso.sx, pIso.sy, 13 * camZoom, 6.8 * camZoom, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();

              const bob = Math.abs(Math.sin(player.walkPhase)) * 3.8 * camZoom;
              ctx.translate(pIso.sx, pIso.sy - bob);
              ctx.scale(player.scaleX, player.scaleY);

              // Player Coat
              ctx.fillStyle = player.hitFlashTimer > 0 ? '#ffffff' : '#0284c7';
              ctx.beginPath();
              ctx.roundRect(
                -6.5 * camZoom,
                -22 * camZoom,
                13 * camZoom,
                16 * camZoom,
                4 * camZoom
              );
              ctx.fill();
              ctx.strokeStyle = '#0f172a';
              ctx.lineWidth = 1.5;
              ctx.stroke();

              // Golden Scarf
              ctx.fillStyle = '#fbbf24';
              ctx.fillRect(-6.5 * camZoom, -18 * camZoom, 13 * camZoom, 3.5 * camZoom);

              // Player Head
              ctx.fillStyle = '#fef3c7';
              ctx.beginPath();
              ctx.arc(0, -26.5 * camZoom, 5 * camZoom, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();

              // Overhead Player Marker Pill
              ctx.scale(1 / player.scaleX, 1 / player.scaleY);
              ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 1.2;
              const bw = 34 * camZoom;
              const bh = 14 * camZoom;
              ctx.fillRect(-bw * 0.5, -46 * camZoom, bw, bh);
              ctx.strokeRect(-bw * 0.5, -46 * camZoom, bw, bh);

              ctx.fillStyle = '#38bdf8';
              ctx.font = `700 ${Math.round(9.5 * camZoom)}px "JetBrains Mono", monospace`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('DU', 0, -39 * camZoom);
              ctx.restore();
            },
          });
        }

        actors.sort((a, b) => a.sortY - b.sortY);
        for (const a of actors) a.draw();
      };

      // ======================================================================
      // RENDER EBENE -2: TIEFBAHNHOF NORD-SÜD (GLEIS 1–8)
      // ======================================================================
      ctx.save();
      ctx.globalAlpha = getLevelAlpha(-2);

      // Base trackbed gravel & concrete slab
      drawIsoQuad(
        -11,
        -8,
        11,
        8,
        -2,
        centerX,
        centerY,
        '#27272a',
        'rgba(148, 163, 184, 0.25)',
        1.5
      );

      // North-South Rails & Sleepers
      for (const tr of STATION_TRACKS.filter((t) => t.level === -2)) {
        drawIsoQuad(
          tr.laneCoord - 0.85,
          -8,
          tr.laneCoord + 0.85,
          8,
          -2,
          centerX,
          centerY,
          '#18181b'
        );
        // Steel rail lines
        const r1Start = worldToIso(tr.laneCoord - 0.35, -8, -2, centerX, centerY, camZoom, vm, al);
        const r1End = worldToIso(tr.laneCoord - 0.35, 8, -2, centerX, centerY, camZoom, vm, al);
        const r2Start = worldToIso(tr.laneCoord + 0.35, -8, -2, centerX, centerY, camZoom, vm, al);
        const r2End = worldToIso(tr.laneCoord + 0.35, 8, -2, centerX, centerY, camZoom, vm, al);

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.6 * camZoom;
        ctx.beginPath();
        ctx.moveTo(r1Start.sx, r1Start.sy);
        ctx.lineTo(r1End.sx, r1End.sy);
        ctx.moveTo(r2Start.sx, r2Start.sy);
        ctx.lineTo(r2End.sx, r2End.sy);
        ctx.stroke();
      }

      // Island Platforms (Gleis 1/2, Gleis 3/4, Gleis 5/6) with Yellow Tactile Safety Strips!
      const deepPlatforms = [
        { cx: -6.9, w: 1.6, label: 'GLEIS 1 / 2' },
        { cx: -0.3, w: 1.7, label: 'GLEIS 3 / 4' },
        { cx: 5.9, w: 1.6, label: 'GLEIS 5 / 6' },
      ];
      for (const plat of deepPlatforms) {
        drawIsoBox(
          plat.cx,
          0,
          plat.w,
          15.2,
          7,
          -2,
          centerX,
          centerY,
          '#cbd5e1',
          '#94a3b8',
          '#64748b',
          '#334155'
        );
        // Yellow tactile guide lines along edges
        drawIsoQuad(
          plat.cx - plat.w * 0.42,
          -7.2,
          plat.cx - plat.w * 0.34,
          7.2,
          -2,
          centerX,
          centerY,
          '#facc15'
        );
        drawIsoQuad(
          plat.cx + plat.w * 0.34,
          -7.2,
          plat.cx + plat.w * 0.42,
          7.2,
          -2,
          centerX,
          centerY,
          '#facc15'
        );
      }

      // Deep level POIs (DB Info Tief)
      for (const poi of STATION_POIS.filter((p) => p.level === -2)) {
        const b = drawIsoBox(
          poi.wx,
          poi.wy,
          poi.width,
          poi.depth,
          22,
          -2,
          centerX,
          centerY,
          poi.roofColor,
          poi.facadeColor,
          '#1e293b'
        );
        ctx.fillStyle = '#ffffff';
        ctx.font = `700 ${Math.round(9.5 * camZoom)}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(poi.signText, b.topCenter.sx, b.topCenter.sy - 4 * camZoom);
      }

      // Trains on Ebene -2
      for (const tr of trains.filter((t) => t.level === -2)) {
        drawTrainOnTrack(tr);
      }

      renderActorsOnLevel(-2);
      ctx.restore();

      // ======================================================================
      // RENDER EBENE -1: VERTEILEREBENE (CURRYWURST, SCHLIESSFÄCHER, POLIZEI)
      // ======================================================================
      ctx.save();
      ctx.globalAlpha = getLevelAlpha(-1);

      drawIsoBox(
        -0.5,
        0,
        14.5,
        7.2,
        6,
        -1,
        centerX,
        centerY,
        'rgba(203, 213, 225, 0.88)',
        '#64748b',
        '#475569',
        '#334155'
      );

      for (const poi of STATION_POIS.filter((p) => p.level === -1)) {
        const b = drawIsoBox(
          poi.wx,
          poi.wy,
          poi.width,
          poi.depth,
          24,
          -1,
          centerX,
          centerY,
          poi.roofColor,
          poi.facadeColor,
          '#334155'
        );
        ctx.fillStyle = '#fef3c7';
        ctx.font = `700 ${Math.round(10 * camZoom)}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(poi.signText, b.topCenter.sx, b.topCenter.sy - 5 * camZoom);
      }

      renderActorsOnLevel(-1);
      ctx.restore();

      // ======================================================================
      // RENDER EBENE 0: HAUPTHALLE & GALERIEBRÜCKE (BAKERAL, BANK, PRESS-SHOP)
      // ======================================================================
      ctx.save();
      ctx.globalAlpha = getLevelAlpha(0);

      // Elevated Concourse Bridge Deck (Matches the central gallery in the reference art!)
      drawIsoBox(
        0.5,
        -0.8,
        19.5,
        7.6,
        9,
        0,
        centerX,
        centerY,
        '#e2e8f0',
        '#94a3b8',
        '#64748b',
        '#334155'
      );

      // Yellow tactile path on Ebene 0 concourse
      drawIsoQuad(-8.5, 0.4, 9.2, 0.65, 0, centerX, centerY, '#facc15');

      // Render Shops on Ebene 0 (Bakeral, Bank/DB, Press-shop, Apotheke, Departure Board)
      for (const poi of STATION_POIS.filter((p) => p.level === 0)) {
        const heightPx = poi.type === 'board' ? 38 : 30;
        const b = drawIsoBox(
          poi.wx,
          poi.wy,
          poi.width,
          poi.depth,
          heightPx,
          0,
          centerX,
          centerY,
          poi.roofColor,
          poi.facadeColor,
          '#1e293b'
        );

        // Warm interior counter glow for shops
        ctx.fillStyle = 'rgba(254, 243, 199, 0.95)';
        ctx.font = `700 ${Math.round(10.5 * camZoom)}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(poi.signText, b.topCenter.sx, b.topCenter.sy - 5 * camZoom);
      }

      // Draw Twin Escalators & Glass Elevator Shafts (Connecting levels visually!)
      for (const conn of VERTICAL_CONNECTORS) {
        if (conn.kind === 'elevator') {
          const eIso = worldToIso(
            conn.fromWx,
            conn.fromWy,
            0,
            centerX,
            centerY,
            camZoom,
            vm,
            al
          );
          ctx.save();
          ctx.fillStyle = 'rgba(186, 230, 253, 0.22)';
          ctx.strokeStyle = 'rgba(125, 211, 252, 0.65)';
          ctx.lineWidth = 1.5 * camZoom;
          const sw = 26 * camZoom;
          const sh = 165 * camZoom;
          ctx.fillRect(eIso.sx - sw * 0.5, eIso.sy - sh * 0.65, sw, sh);
          ctx.strokeRect(eIso.sx - sw * 0.5, eIso.sy - sh * 0.65, sw, sh);

          // Animated elevator cabin moving inside glass shaft
          const cabinY =
            eIso.sy -
            20 * camZoom +
            Math.sin(now * 0.0018 + conn.fromWx) * 45 * camZoom;
          ctx.fillStyle = 'rgba(251, 191, 36, 0.85)';
          ctx.fillRect(eIso.sx - sw * 0.4, cabinY, sw * 0.8, 18 * camZoom);
          ctx.restore();
        } else if (conn.kind === 'escalator') {
          const pTop = worldToIso(
            conn.fromWx,
            conn.fromWy,
            conn.fromLevel,
            centerX,
            centerY,
            camZoom,
            vm,
            al
          );
          const pBot = worldToIso(
            conn.toWx,
            conn.toWy,
            conn.toLevel,
            centerX,
            centerY,
            camZoom,
            vm,
            al
          );
          ctx.save();
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 10 * camZoom;
          ctx.beginPath();
          ctx.moveTo(pTop.sx, pTop.sy);
          ctx.lineTo(pBot.sx, pBot.sy);
          ctx.stroke();

          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5 * camZoom;
          ctx.beginPath();
          ctx.moveTo(pTop.sx - 4 * camZoom, pTop.sy - 6 * camZoom);
          ctx.lineTo(pBot.sx - 4 * camZoom, pBot.sy - 6 * camZoom);
          ctx.stroke();
          ctx.restore();
        }
      }

      renderActorsOnLevel(0);
      ctx.restore();

      // ======================================================================
      // RENDER EBENE +2: STADTBAHN OST-WEST (GLEIS 11–16)
      // ======================================================================
      ctx.save();
      ctx.globalAlpha = getLevelAlpha(2);

      // Upper East-West Viaduct Deck
      drawIsoQuad(
        -10.5,
        -6.5,
        10.5,
        6.5,
        2,
        centerX,
        centerY,
        'rgba(30, 41, 59, 0.55)',
        'rgba(148, 163, 184, 0.35)',
        1.5
      );

      // East-West Tracks (Gleis 11, 12, 15, 16)
      for (const tr of STATION_TRACKS.filter((t) => t.level === 2)) {
        drawIsoQuad(
          -10.5,
          tr.laneCoord - 0.7,
          10.5,
          tr.laneCoord + 0.7,
          2,
          centerX,
          centerY,
          '#1e293b'
        );
        const rStart = worldToIso(-10.5, tr.laneCoord, 2, centerX, centerY, camZoom, vm, al);
        const rEnd = worldToIso(10.5, tr.laneCoord, 2, centerX, centerY, camZoom, vm, al);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2 * camZoom;
        ctx.beginPath();
        ctx.moveTo(rStart.sx, rStart.sy);
        ctx.lineTo(rEnd.sx, rEnd.sy);
        ctx.stroke();
      }

      // Upper Stadtbahn Platforms
      drawIsoBox(
        0,
        -3.7,
        18,
        1.5,
        6,
        2,
        centerX,
        centerY,
        '#cbd5e1',
        '#94a3b8',
        '#64748b',
        '#334155'
      );
      drawIsoBox(
        0,
        1.4,
        18,
        1.5,
        6,
        2,
        centerX,
        centerY,
        '#cbd5e1',
        '#94a3b8',
        '#64748b',
        '#334155'
      );

      for (const poi of STATION_POIS.filter((p) => p.level === 2)) {
        const b = drawIsoBox(
          poi.wx,
          poi.wy,
          poi.width,
          poi.depth,
          22,
          2,
          centerX,
          centerY,
          poi.roofColor,
          poi.facadeColor,
          '#0f172a'
        );
        ctx.fillStyle = '#ffffff';
        ctx.font = `700 ${Math.round(9.5 * camZoom)}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(poi.signText, b.topCenter.sx, b.topCenter.sy - 4 * camZoom);
      }

      for (const tr of trains.filter((t) => t.level === 2)) {
        drawTrainOnTrack(tr);
      }

      renderActorsOnLevel(2);
      ctx.restore();

      // ======================================================================
      // RENDER ARCHITECTURAL H-BEAM STEEL COLUMNS & OVERHEAD GIRDERS
      // (Directly matching the foreground steel beams in the reference image!)
      // ======================================================================
      if (vm === 'cutaway') {
        ctx.save();
        const pillarCoords = [
          { wx: -7.5, wy: -3.5 },
          { wx: -3.5, wy: 2.5 },
          { wx: 3.5, wy: -3.5 },
          { wx: 6.5, wy: 2.5 },
        ];
        const topNodes: Array<{ sx: number; sy: number }> = [];

        for (const pil of pillarCoords) {
          const pBot = worldToIso(pil.wx, pil.wy, -2, centerX, centerY, camZoom, vm, al);
          const pTop = { sx: pBot.sx, sy: pBot.sy - 345 * camZoom };
          topNodes.push(pTop);

          // Warm golden uplight glow at pillar base (just like reference image!)
          const upGlow = ctx.createRadialGradient(
            pBot.sx,
            pBot.sy,
            2,
            pBot.sx,
            pBot.sy - 20 * camZoom,
            34 * camZoom
          );
          upGlow.addColorStop(0, 'rgba(254, 243, 199, 0.78)');
          upGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.26)');
          upGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
          ctx.fillStyle = upGlow;
          ctx.beginPath();
          ctx.arc(pBot.sx, pBot.sy - 12 * camZoom, 34 * camZoom, 0, Math.PI * 2);
          ctx.fill();

          // Steel H-column shaft
          ctx.fillStyle = 'rgba(51, 65, 85, 0.76)';
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.lineWidth = 1.5;
          ctx.fillRect(
            pBot.sx - 6.5 * camZoom,
            pTop.sy,
            13 * camZoom,
            pBot.sy - pTop.sy
          );
          ctx.strokeRect(
            pBot.sx - 6.5 * camZoom,
            pTop.sy,
            13 * camZoom,
            pBot.sy - pTop.sy
          );
        }

        // Overhead Steel Cross-Girders (connecting the top nodes just like the reference image)
        const girderPairs = [
          [0, 1],
          [2, 3],
          [0, 2],
          [1, 3],
        ];
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.85)';
        ctx.lineWidth = 11 * camZoom;
        ctx.lineCap = 'round';
        for (const [ia, ib] of girderPairs) {
          const a = topNodes[ia];
          const b = topNodes[ib];
          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy);
          ctx.lineTo(b.sx, b.sy);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 2 * camZoom;
        for (const [ia, ib] of girderPairs) {
          const a = topNodes[ia];
          const b = topNodes[ib];
          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy - 3 * camZoom);
          ctx.lineTo(b.sx, b.sy - 3 * camZoom);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ======================================================================
      // RENDER POOLED PARTICLES
      // ======================================================================
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particlePool[i];
        if (!p.active) continue;
        p.life += rawDt;
        if (p.life >= p.maxLife) {
          p.active = false;
          continue;
        }
        p.sx += p.vx * rawDt;
        p.sy += p.vy * rawDt;
        p.vy += 45 * rawDt; // Subtle gravity

        const alpha = 1 - p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, p.size * camZoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
      scheduleNextFrame();
    };

    renderFrame(performance.now());

    return () => {
      isDisposed = true;
      window.clearTimeout(timerId);
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full overflow-hidden select-none bg-slate-950"
    >
      <canvas
        ref={canvasRef}
        data-testid="station-isometric-canvas"
        className="block w-full h-full cursor-grab active:cursor-grabbing"
      />
    </div>
  );
};
