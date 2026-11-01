import React, { useEffect, useMemo, useRef } from 'react';
import { StationLevelId, StationViewId } from '../game/stationData';
import {
  ScheduledTrain,
  NpcAgent,
  stepTrainTimetable,
  stepNpcAgent,
} from '../game/rules';
import { Camera } from '../engine/camera';
import { atmosphereForMinutes } from '../engine/atmosphere';
import { AssetTier, PlateDef, RenderQuality, SceneDef, VenueDef } from '../engine/types';
import { getBakedPlate, isReady, loadImage, resolvePlate } from '../engine/assets';
import { drawScenePlate, plateSourceSize } from '../engine/render/plate';
import {
  drawCommuter,
  drawIsoBox,
  drawIsoCylinder,
  drawIsometricGrid,
  drawVehicle,
  VehicleStyle,
} from '../engine/render/primitives';

export type RenderStyleMode = 'reference_live' | 'procedural_iso' | 'all_levels_grid';

interface RealisticStationCanvasProps {
  /** The venue being rendered — all geometry, art and crowd come from here. */
  venue: VenueDef;
  activeView: StationViewId;
  renderStyle: RenderStyleMode;
  useAltE0Variant: boolean;
  simSpeed: number;
  showLabels: boolean;
  renderQuality: RenderQuality;
  assetTier: AssetTier;
  trainsRef: React.MutableRefObject<ScheduledTrain[]>;
  npcsRef: React.MutableRefObject<NpcAgent[]>;
  stationMinutesRef: React.MutableRefObject<number>;
  onSelectView?: (view: StationViewId) => void;
}

interface AmbientWalker {
  id: number;
  sceneId: string;
  path: { x: number; y: number }[];
  segIndex: number;
  segProgress: number;
  speed: number;
  dir: 1 | -1;
  coatColor: string;
  hairColor: string;
  hasSuitcase: boolean;
  suitcaseColor: string;
  label?: string;
}

/**
 * Build the ambient crowd from the scene data of a venue.
 * Any venue that declares `crowd` routes gets living walkways — the renderer
 * no longer knows anything about specific stations.
 */
function buildWalkers(scenes: SceneDef[]): AmbientWalker[] {
  const walkers: AmbientWalker[] = [];
  let idCounter = 1;

  for (const scene of scenes) {
    for (const route of scene.crowd) {
      walkers.push({
        id: idCounter,
        sceneId: scene.id,
        path: route.path,
        segIndex: idCounter % Math.max(1, route.path.length - 1),
        segProgress: (idCounter * 0.27) % 1,
        speed: route.speed,
        dir: idCounter % 2 === 0 ? 1 : -1,
        coatColor: route.coat,
        hairColor: idCounter % 3 === 0 ? '#fde047' : idCounter % 2 === 0 ? '#451a03' : '#1e293b',
        hasSuitcase: route.hasSuitcase,
        suitcaseColor: idCounter % 2 === 0 ? '#dc2626' : '#0284c7',
        label: route.label,
      });
      idCounter++;
    }
  }

  return walkers;
}

interface ResolvedSceneArt {
  plate: PlateDef;
  source: CanvasImageSource;
  width: number;
  height: number;
}

/**
 * Pick the best plate a scene currently owns and bake it at the active quality.
 * Every venue goes through this, so a new art tier or a new scene needs no
 * renderer change — and a scene whose art is still loading returns null so the
 * caller can fall back to the procedural build.
 */
function resolveSceneArt(
  scene: SceneDef,
  tier: AssetTier,
  quality: RenderQuality,
  useAltVariant: boolean
): ResolvedSceneArt | null {
  const plate = resolvePlate(scene.plates, tier, useAltVariant ? 'b' : undefined);
  if (!plate) return null;

  const img = loadImage(plate.src);
  if (!isReady(img)) return null;

  const baked = getBakedPlate(plate, img, quality);
  const source: CanvasImageSource = baked ?? img;
  const size = plateSourceSize(source);
  if (!size) return null;

  return { plate, source, width: size.w, height: size.h };
}


export const RealisticStationCanvas: React.FC<RealisticStationCanvasProps> = ({
  venue,
  activeView,
  renderStyle,
  useAltE0Variant,
  simSpeed,
  showLabels,
  renderQuality,
  assetTier,
  trainsRef,
  npcsRef,
  stationMinutesRef,
  onSelectView,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraRef = useRef<Camera>(new Camera());
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const walkersRef = useRef<AmbientWalker[]>(buildWalkers(venue.scenes));
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; origX: number; origY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  const scenes = venue.scenes;
  const activeScene = useMemo(
    () => scenes.find((s) => s.id === activeView) ?? scenes[0],
    [scenes, activeView]
  );

  // Preload every plate of the venue (all art tiers, all variants).
  useEffect(() => {
    for (const scene of venue.scenes) {
      for (const plate of scene.plates) loadImage(plate.src);
    }
  }, [venue]);

  // A different venue means a different crowd.
  useEffect(() => {
    walkersRef.current = buildWalkers(venue.scenes);
  }, [venue]);

  // Reset pan/zoom when the view changes
  useEffect(() => {
    cameraRef.current.reset();
    panRef.current = { x: 0, y: 0 };
    zoomRef.current = 1;
  }, [activeView, renderStyle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let timerId: number | null = null;
    let lastTime = performance.now();

    const handleResize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Thin bindings over the shared engine primitives so the station visuals
    // keep their exact call signature while living in engine/render/primitives.
    const drawLiveIsoTrain = (
      c: CanvasRenderingContext2D,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      thickness: number,
      height: number,
      style: VehicleStyle,
      label: string,
      nowSec: number
    ) => drawVehicle(c, x1, y1, x2, y2, thickness, height, style, label, nowSec, showLabels);

    const drawCommuterSprite = (
      c: CanvasRenderingContext2D,
      x: number,
      y: number,
      scale: number,
      coatColor: string,
      hairColor: string,
      hasSuitcase: boolean,
      suitcaseColor: string,
      walkPhase: number,
      label?: string
    ) => drawCommuter(c, x, y, scale, coatColor, hairColor, hasSuitcase, suitcaseColor, walkPhase, label, showLabels);

    const drawBlueprintLiveOverlays = (
      c: CanvasRenderingContext2D,
      viewId: StationViewId,
      rx: number,
      ry: number,
      rw: number,
      rh: number,
      nowSec: number,
      scaleFactor: number = 1
    ) => {
      const px = (nx: number) => rx + nx * rw;
      const py = (ny: number) => ry + ny * rh;

      // 1. CENTRAL ATRIUM (LICHTHOF) LIVE GLASS ELEVATORS & ESCALATORS
      if (viewId !== 'CUTAWAY') {
        const elev1X = px(0.493);
        const elev1TopY = py(0.39);
        const elev1BotY = py(0.50);
        const cabin1T = 0.5 + 0.42 * Math.sin(nowSec * 1.15);
        const cabin1Y = elev1TopY + (elev1BotY - elev1TopY) * cabin1T;

        const elev2X = px(0.534);
        const elev2TopY = py(0.50);
        const elev2BotY = py(0.60);
        const cabin2T = 0.5 + 0.42 * Math.cos(nowSec * 0.95);
        const cabin2Y = elev2TopY + (elev2BotY - elev2TopY) * cabin2T;

        for (const [ex, ey] of [
          [elev1X, cabin1Y],
          [elev2X, cabin2Y],
        ]) {
          c.fillStyle = 'rgba(56, 189, 248, 0.35)';
          c.fillRect(ex - 11 * scaleFactor, ey - 8 * scaleFactor, 22 * scaleFactor, 16 * scaleFactor);
          c.strokeStyle = 'rgba(224, 242, 254, 0.9)';
          c.lineWidth = 1.3 * scaleFactor;
          c.strokeRect(ex - 11 * scaleFactor, ey - 8 * scaleFactor, 22 * scaleFactor, 16 * scaleFactor);

          // Glowing cabin ceiling light
          c.fillStyle = 'rgba(254, 249, 195, 0.9)';
          c.fillRect(ex - 7 * scaleFactor, ey - 6 * scaleFactor, 14 * scaleFactor, 3 * scaleFactor);
        }

        // Animated Escalator step highlights in the Atrium pit
        const escSteps = 6;
        for (let s = 0; s < escSteps; s++) {
          const t = ((s / escSteps) + nowSec * 0.35) % 1;
          const sx1 = px(0.415 + t * 0.045);
          const sy1 = py(0.415 + t * 0.068);
          c.fillStyle = 'rgba(250, 204, 21, 0.65)';
          c.fillRect(sx1 - 3 * scaleFactor, sy1 - 1 * scaleFactor, 6 * scaleFactor, 2 * scaleFactor);

          const sx2 = px(0.635 - t * 0.042);
          const sy2 = py(0.545 + t * 0.065);
          c.fillRect(sx2 - 3 * scaleFactor, sy2 - 1 * scaleFactor, 6 * scaleFactor, 2 * scaleFactor);
        }
      } else {
        // CUTAWAY view twin glass elevators
        const elevLeftX = px(0.44);
        const cabinLeftY = py(0.18 + (0.5 + 0.45 * Math.sin(nowSec * 1.1)) * 0.22);
        const elevRightX = px(0.608);
        const cabinRightY = py(0.26 + (0.5 + 0.45 * Math.cos(nowSec * 0.95)) * 0.20);

        for (const [ex, ey] of [
          [elevLeftX, cabinLeftY],
          [elevRightX, cabinRightY],
        ]) {
          c.fillStyle = 'rgba(56, 189, 248, 0.35)';
          c.fillRect(ex - 13 * scaleFactor, ey - 9 * scaleFactor, 26 * scaleFactor, 18 * scaleFactor);
          c.strokeStyle = 'rgba(224, 242, 254, 0.85)';
          c.lineWidth = 1.4 * scaleFactor;
          c.strokeRect(ex - 13 * scaleFactor, ey - 9 * scaleFactor, 26 * scaleFactor, 18 * scaleFactor);
        }
      }

      // 2. LEVEL-SPECIFIC LIVE VEHICLES, TRAINS & ARCHITECTURAL LIGHTS
      if (viewId === 'E+2') {
        // Animated shuttle train gliding along the upper East-West track (SW -> NE)
        const tIce = ((nowSec * 0.07) % 1.3) - 0.15;
        if (tIce >= 0 && tIce <= 1) {
          const startX = px(0.10 + tIce * 0.36);
          const startY = py(0.56 - tIce * 0.25);
          const endX = startX + 86 * scaleFactor;
          const endY = startY - 54 * scaleFactor;
          drawLiveIsoTrain(
            c,
            startX,
            startY,
            endX,
            endY,
            15 * scaleFactor,
            14 * scaleFactor,
            'ICE',
            'ICE 948 → Köln Hbf',
            nowSec
          );
        }

        // Live destination badges on the upper tracks
        if (showLabels) {
          for (const [bx, by, txt, col] of [
            [0.24, 0.38, 'ICE 1001 · Gl. 11', '#38bdf8'],
            [0.26, 0.67, 'RE 1 · S7 Stadtbahn · Gl. 15', '#ef4444'],
          ] as const) {
            const lx = px(bx);
            const ly = py(by);
            c.font = `bold ${Math.max(9, Math.round(10 * scaleFactor))}px monospace`;
            const tw = c.measureText(txt).width + 12;
            c.fillStyle = 'rgba(15, 23, 42, 0.88)';
            c.fillRect(lx - tw * 0.5, ly - 10, tw, 16);
            c.strokeStyle = col;
            c.lineWidth = 1.2;
            c.strokeRect(lx - tw * 0.5, ly - 10, tw, 16);
            c.fillStyle = '#f8fafc';
            c.textAlign = 'center';
            c.fillText(txt, lx, ly + 2);
          }
        }

        // Subtle sunlight shimmer across the curved glass barrel vault ribs
        const shimmerAlpha = 0.07 + 0.04 * Math.sin(nowSec * 1.6);
        c.fillStyle = `rgba(186, 230, 253, ${shimmerAlpha})`;
        c.beginPath();
        c.moveTo(px(0.32), py(0.24));
        c.lineTo(px(0.64), py(0.03));
        c.lineTo(px(0.95), py(0.26));
        c.lineTo(px(0.64), py(0.47));
        c.closePath();
        c.fill();
      } else if (viewId === 'E+1') {
        // Glowing red halos on the 2 circular DB Info Rondells on E+1
        const pulse = 0.25 + 0.14 * Math.sin(nowSec * 2.8);
        c.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
        c.lineWidth = 2.5 * scaleFactor;
        c.beginPath();
        c.ellipse(px(0.324), py(0.345), 30 * scaleFactor, 18 * scaleFactor, 0, 0, Math.PI * 2);
        c.stroke();
        c.beginPath();
        c.ellipse(px(0.402), py(0.600), 28 * scaleFactor, 17 * scaleFactor, 0, 0, Math.PI * 2);
        c.stroke();
      } else if (viewId === 'E0') {
        // NW Europaplatz: Headlight glow & live badge on the BVG Buses at the bus stop
        const glow = 0.55 + 0.35 * Math.sin(nowSec * 4.0);
        c.fillStyle = `rgba(254, 240, 138, ${glow * 0.45})`;
        c.beginPath();
        c.ellipse(px(0.055), py(0.075), 14 * scaleFactor, 8 * scaleFactor, -0.4, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.ellipse(px(0.018), py(0.115), 14 * scaleFactor, 8 * scaleFactor, -0.4, 0, Math.PI * 2);
        c.fill();

        // SE Washingtonplatz: Headlight glow & live badge on the Berlin Taxis
        c.beginPath();
        c.ellipse(px(0.945), py(0.915), 14 * scaleFactor, 8 * scaleFactor, -0.4, 0, Math.PI * 2);
        c.fill();

        if (showLabels) {
          for (const [bx, by, txt, col] of [
            [0.085, 0.055, 'BVG BUS M41 / M85 · Europaplatz', '#facc15'],
            [0.915, 0.875, 'TAXISTAND · Washingtonplatz', '#facc15'],
            [0.325, 0.315, 'DB Information Rondell', '#ef4444'],
          ] as const) {
            const lx = px(bx);
            const ly = py(by);
            c.font = `bold ${Math.max(8, Math.round(9.5 * scaleFactor))}px monospace`;
            const tw = c.measureText(txt).width + 10;
            c.fillStyle = 'rgba(15, 23, 42, 0.88)';
            c.fillRect(lx - tw * 0.5, ly - 9, tw, 15);
            c.strokeStyle = col;
            c.lineWidth = 1.1;
            c.strokeRect(lx - tw * 0.5, ly - 9, tw, 15);
            c.fillStyle = '#f8fafc';
            c.textAlign = 'center';
            c.fillText(txt, lx, ly + 2);
          }
        }

        // Rotating glass leaves inside the 3 NW and 3 SE Revolving Doors (Drehtüren)
        const doorCenters = [
          [0.098, 0.220],
          [0.132, 0.195],
          [0.165, 0.172],
          [0.838, 0.865],
          [0.868, 0.842],
          [0.896, 0.820],
        ];
        for (const [dx, dy] of doorCenters) {
          const cxDoor = px(dx);
          const cyDoor = py(dy);
          const angle = nowSec * 1.8;
          c.strokeStyle = 'rgba(224, 242, 254, 0.78)';
          c.lineWidth = 1.4 * scaleFactor;
          c.beginPath();
          c.moveTo(
            cxDoor - Math.cos(angle) * 7 * scaleFactor,
            cyDoor - Math.sin(angle) * 4 * scaleFactor
          );
          c.lineTo(
            cxDoor + Math.cos(angle) * 7 * scaleFactor,
            cyDoor + Math.sin(angle) * 4 * scaleFactor
          );
          c.stroke();
        }
      } else if (viewId === 'E-1') {
        // Pulsing red Pharmacy 'A' sign and glowing blue U-Bahn U5 sign
        const glow = 0.55 + 0.45 * Math.sin(nowSec * 3.2);
        c.fillStyle = `rgba(239, 68, 68, ${glow * 0.32})`;
        c.beginPath();
        c.arc(px(0.32), py(0.48), 14 * scaleFactor, 0, Math.PI * 2);
        c.fill();

        // U-Bahn U5 portal beacon at top-right (NE)
        c.fillStyle = `rgba(37, 99, 235, ${0.45 + 0.3 * Math.cos(nowSec * 2.5)})`;
        c.fillRect(px(0.755), py(0.085), 52 * scaleFactor, 16 * scaleFactor);
        if (showLabels) {
          c.fillStyle = '#ffffff';
          c.font = `bold ${Math.max(8, Math.round(10 * scaleFactor))}px monospace`;
          c.textAlign = 'center';
          c.fillText('U-BAHN U5 →', px(0.755) + 26 * scaleFactor, py(0.085) + 11 * scaleFactor);
        }
      } else if (viewId === 'E-2') {
        // Headlight beams & animated door indicators on the 2 ICE trains, 2 Regio trains, and the yellow U5 train
        const beamAlpha = 0.35 + 0.25 * Math.sin(nowSec * 3.0);
        c.fillStyle = `rgba(254, 240, 138, ${beamAlpha})`;
        for (const [bx, by] of [
          [0.228, 0.652], // ICE Track 1 nose
          [0.415, 0.700], // Regio Track 3 nose
          [0.592, 0.525], // Regio Track 4 nose
          [0.895, 0.695], // Yellow U-Bahn U5 nose
        ]) {
          c.beginPath();
          c.ellipse(px(bx), py(by), 14 * scaleFactor, 8 * scaleFactor, -0.4, 0, Math.PI * 2);
          c.fill();
        }

        if (showLabels) {
          for (const [bx, by, txt, col] of [
            [0.34, 0.28, 'ICE 592 → Frankfurt(M) · Gl. 2', '#38bdf8'],
            [0.30, 0.54, 'ICE 1001 → München Hbf · Gl. 1', '#38bdf8'],
            [0.57, 0.32, 'RE 3 / FEX → Flughafen BER · Gl. 4', '#ef4444'],
            [0.835, 0.60, 'BVG U5 → Alex · Hönow', '#facc15'],
          ] as const) {
            const lx = px(bx);
            const ly = py(by);
            c.font = `bold ${Math.max(8, Math.round(9.5 * scaleFactor))}px monospace`;
            const tw = c.measureText(txt).width + 10;
            c.fillStyle = 'rgba(15, 23, 42, 0.88)';
            c.fillRect(lx - tw * 0.5, ly - 9, tw, 15);
            c.strokeStyle = col;
            c.lineWidth = 1.2;
            c.strokeRect(lx - tw * 0.5, ly - 9, tw, 15);
            c.fillStyle = '#f8fafc';
            c.textAlign = 'center';
            c.fillText(txt, lx, ly + 2);
          }
        }
      }
    };

    // Ambient crowd, driven by the active scene's crowd routes. Works for any
    // venue, not just the station.
    const drawCrowd = (
      c: CanvasRenderingContext2D,
      sceneId: string,
      rx: number,
      ry: number,
      rw: number,
      rh: number,
      nowSec: number,
      scaleFactor: number
    ) => {
      const px = (nx: number) => rx + nx * rw;
      const py = (ny: number) => ry + ny * rh;

      for (const w of walkersRef.current) {
        if (w.sceneId !== sceneId) continue;
        const pA = w.path[w.segIndex];
        const pB = w.path[w.segIndex + 1] ?? w.path[0];
        const wx = px(pA.x + (pB.x - pA.x) * w.segProgress);
        const wy = py(pA.y + (pB.y - pA.y) * w.segProgress);

        drawCommuterSprite(
          c,
          wx,
          wy,
          scaleFactor,
          w.coatColor,
          w.hairColor,
          w.hasSuitcase,
          w.suitcaseColor,
          nowSec * 7 + w.id,
          w.label
        );
      }
    };

    // Full Procedural Isometric Architecture Renderer (Mode B: 'procedural_iso')
    // Faithfully constructs each level's geometry on the #3b4049 engineering grid
    // matching the reference blueprints and fixing all previous geometry issues.
    const drawProceduralLevel = (
      c: CanvasRenderingContext2D,
      viewId: StationViewId,
      w: number,
      h: number,
      nowSec: number
    ) => {
      drawIsometricGrid(c, w, h, 36);

      const cx = w * 0.5 + panRef.current.x;
      const cy = h * 0.52 + panRef.current.y;
      const s = Math.min(w / 1280, h / 760) * zoomRef.current;

      // Helper to convert tile coordinates (tx, ty) to screen (sx, sy)
      const tileToScreen = (tx: number, ty: number, elev: number = 0) => ({
        x: cx + (tx - ty) * 28 * s,
        y: cy + (tx + ty) * 14 * s - elev * s,
      });

      // Draw an isometric floor polygon from tile bounds [tx1..tx2, ty1..ty2]
      const drawFloorSlab = (
        tx1: number,
        ty1: number,
        tx2: number,
        ty2: number,
        fillColor: string,
        borderColor: string = '#475569',
        thickness: number = 8,
        subGrid: boolean = true
      ) => {
        const p1 = tileToScreen(tx1, ty1);
        const p2 = tileToScreen(tx2, ty1);
        const p3 = tileToScreen(tx2, ty2);
        const p4 = tileToScreen(tx1, ty2);

        // Slab thickness sides
        c.fillStyle = '#4b5563';
        c.beginPath();
        c.moveTo(p4.x, p4.y);
        c.lineTo(p3.x, p3.y);
        c.lineTo(p3.x, p3.y + thickness * s);
        c.lineTo(p4.x, p4.y + thickness * s);
        c.closePath();
        c.fill();

        c.fillStyle = '#374151';
        c.beginPath();
        c.moveTo(p3.x, p3.y);
        c.lineTo(p2.x, p2.y);
        c.lineTo(p2.x, p2.y + thickness * s);
        c.lineTo(p3.x, p3.y + thickness * s);
        c.closePath();
        c.fill();

        // Top floor surface
        c.fillStyle = fillColor;
        c.beginPath();
        c.moveTo(p1.x, p1.y);
        c.lineTo(p2.x, p2.y);
        c.lineTo(p3.x, p3.y);
        c.lineTo(p4.x, p4.y);
        c.closePath();
        c.fill();
        c.strokeStyle = borderColor;
        c.lineWidth = 1.5 * s;
        c.stroke();

        if (subGrid) {
          c.strokeStyle = 'rgba(100, 116, 139, 0.22)';
          c.lineWidth = 0.8 * s;
          c.beginPath();
          for (let tx = tx1 + 1; tx < tx2; tx++) {
            const a = tileToScreen(tx, ty1);
            const b = tileToScreen(tx, ty2);
            c.moveTo(a.x, a.y);
            c.lineTo(b.x, b.y);
          }
          for (let ty = ty1 + 1; ty < ty2; ty++) {
            const a = tileToScreen(tx1, ty);
            const b = tileToScreen(tx2, ty);
            c.moveTo(a.x, a.y);
            c.lineTo(b.x, b.y);
          }
          c.stroke();
        }
      };

      // Draw a cutaway shop room with 2 back walls + floor + interior furniture
      const drawCutawayRoom = (
        tx1: number,
        ty1: number,
        tx2: number,
        ty2: number,
        floorColor: string,
        wallColor: string,
        signText: string,
        signColor: string
      ) => {
        drawFloorSlab(tx1, ty1, tx2, ty2, floorColor, '#334155', 4, true);
        const wallH = 34 * s;
        const pNW = tileToScreen(tx1, ty1);
        const pNE = tileToScreen(tx2, ty1);
        const pSW = tileToScreen(tx1, ty2);

        // Back-left wall (tx1, ty1 -> tx1, ty2)
        c.fillStyle = wallColor;
        c.beginPath();
        c.moveTo(pNW.x, pNW.y);
        c.lineTo(pSW.x, pSW.y);
        c.lineTo(pSW.x, pSW.y - wallH);
        c.lineTo(pNW.x, pNW.y - wallH);
        c.closePath();
        c.fill();
        c.strokeStyle = '#1e293b';
        c.lineWidth = 1.2 * s;
        c.stroke();

        // Back-right wall (tx1, ty1 -> tx2, ty1)
        c.fillStyle = wallColor;
        c.beginPath();
        c.moveTo(pNW.x, pNW.y);
        c.lineTo(pNE.x, pNE.y);
        c.lineTo(pNE.x, pNE.y - wallH);
        c.lineTo(pNW.x, pNW.y - wallH);
        c.closePath();
        c.fill();
        c.stroke();

        // Signboard on back-right wall
        const midX = (pNW.x + pNE.x) * 0.5;
        const midY = (pNW.y + pNE.y) * 0.5 - wallH * 0.72;
        c.fillStyle = signColor;
        c.fillRect(midX - 34 * s, midY - 8 * s, 68 * s, 15 * s);
        c.fillStyle = '#ffffff';
        c.font = `bold ${Math.max(8, Math.round(9 * s))}px sans-serif`;
        c.textAlign = 'center';
        c.fillText(signText, midX, midY + 3 * s);
      };

      // Draw the signature Central Atrium Core (Lichthof) shared by all levels
      const drawCentralAtriumCore = () => {
        const p1 = tileToScreen(-3.2, -1.8);
        const p2 = tileToScreen(3.2, -1.8);
        const p3 = tileToScreen(3.2, 1.8);
        const p4 = tileToScreen(-3.2, 1.8);

        // Deep atrium shaft void
        c.fillStyle = '#1e2530';
        c.beginPath();
        c.moveTo(p1.x, p1.y);
        c.lineTo(p2.x, p2.y);
        c.lineTo(p3.x, p3.y);
        c.lineTo(p4.x, p4.y);
        c.closePath();
        c.fill();

        // Steel-blue parapet curbing around the Atrium opening (matching #8db3c7 / #6585a5 swatch)
        c.strokeStyle = '#8db3c7';
        c.lineWidth = 6 * s;
        c.stroke();
        c.strokeStyle = '#1e293b';
        c.lineWidth = 1.5 * s;
        c.stroke();

        // Escalator banks inside the Atrium
        for (const offset of [-1.8, 1.8]) {
          const eStart = tileToScreen(offset - 0.8, -1.2);
          const eEnd = tileToScreen(offset + 0.8, 1.2);
          c.strokeStyle = '#64748b';
          c.lineWidth = 10 * s;
          c.beginPath();
          c.moveTo(eStart.x, eStart.y);
          c.lineTo(eEnd.x, eEnd.y);
          c.stroke();

          c.strokeStyle = '#1e293b';
          c.lineWidth = 6 * s;
          c.beginPath();
          c.moveTo(eStart.x, eStart.y);
          c.lineTo(eEnd.x, eEnd.y);
          c.stroke();
        }

        // Twin transparent cyan Glass Elevator Towers (Glasaufzüge)
        for (const [tx, ty] of [
          [-0.4, -0.5],
          [0.9, 0.5],
        ]) {
          const ep = tileToScreen(tx, ty);
          const cabinY = ep.y - (35 + 22 * Math.sin(nowSec * 1.2 + tx)) * s;
          // Elevator cabin
          drawIsoBox(
            c,
            ep.x,
            cabinY,
            14 * s,
            14 * s,
            20 * s,
            '#bae6fd',
            '#38bdf8',
            '#0284c7',
            '#0f172a'
          );
          // Glass shaft tower
          drawIsoBox(
            c,
            ep.x,
            ep.y,
            16 * s,
            16 * s,
            92 * s,
            'rgba(186, 230, 253, 0.35)',
            'rgba(125, 211, 252, 0.26)',
            'rgba(56, 189, 248, 0.32)',
            '#6585a5'
          );
        }

        // 4 Iconic Heavy Grey Concrete Columns along the NE edge of the Atrium
        for (const colTx of [-3.5, -1.2, 1.2, 3.5]) {
          const cp = tileToScreen(colTx, -2.5);
          drawIsoBox(
            c,
            cp.x,
            cp.y,
            12 * s,
            12 * s,
            78 * s,
            '#94a3b8',
            '#6c7077',
            '#535869',
            '#1e2229'
          );
        }
      };

      if (viewId === 'E+2' || viewId === 'CUTAWAY') {
        // E+2: Upper track deck + SE foyer + Curved Glass Barrel Vault
        drawFloorSlab(-10, -8, 10, 8, '#cbd5e1', '#64748b', 10, true);
        // Yellow tactile guide strips along platforms
        for (const ty of [-5.2, -2.2, 2.4, 5.2]) {
          const a = tileToScreen(-9.5, ty);
          const b = tileToScreen(9.5, ty);
          c.strokeStyle = '#eab308';
          c.lineWidth = 2.5 * s;
          c.beginPath();
          c.moveTo(a.x, a.y);
          c.lineTo(b.x, b.y);
          c.stroke();
        }
        // Track beds
        for (const ty of [-6.5, -3.8, 3.8, 6.5]) {
          drawFloorSlab(-9.8, ty - 0.7, 9.8, ty + 0.7, '#475569', '#1e293b', 2, false);
        }

        drawCentralAtriumCore();

        // Live trains on E+2
        const icePos = Math.sin(nowSec * 0.45) * 2.5;
        const pIceA = tileToScreen(-7 + icePos, 3.8);
        const pIceB = tileToScreen(4 + icePos, 3.8);
        drawLiveIsoTrain(c, pIceA.x, pIceA.y, pIceB.x, pIceB.y, 18 * s, 18 * s, 'ICE', 'ICE 948 Köln', nowSec);

        const regPos = Math.cos(nowSec * 0.5) * 2.0;
        const pRegA = tileToScreen(-6 + regPos, -3.8);
        const pRegB = tileToScreen(5 + regPos, -3.8);
        drawLiveIsoTrain(c, pRegA.x, pRegA.y, pRegB.x, pRegB.y, 18 * s, 17 * s, 'REGIO', 'RE 1 · S7', nowSec);

        // Curved Glass Barrel Vault (Glasdach-Tonne) over the NE half
        for (let tx = -8; tx <= 8; tx += 2) {
          const pArchL = tileToScreen(tx, -7.8);
          const pArchR = tileToScreen(tx, 1.5);
          const midX = (pArchL.x + pArchR.x) * 0.5;
          const midY = (pArchL.y + pArchR.y) * 0.5 - 120 * s;

          c.strokeStyle = 'rgba(141, 179, 199, 0.85)';
          c.lineWidth = 3 * s;
          c.beginPath();
          c.moveTo(pArchL.x, pArchL.y);
          c.quadraticCurveTo(midX, midY, pArchR.x, pArchR.y);
          c.stroke();
        }
      } else if (viewId === 'E+1') {
        // E+1: Gallery level with cutaway shops, Bügelbauten offices & 2 Red DB Rondells
        drawFloorSlab(-9.5, -7.5, 9.5, 7.5, '#d6d3d1', '#64748b', 10, true);
        drawCutawayRoom(-9, -7, -3.5, -3.5, '#fef3c7', '#f59e0b', 'Presse & Buch', '#b45309');
        drawCutawayRoom(2, -7, 9, -3.2, '#e2e8f0', '#6585a5', 'Bügelbauten · DB Leitstelle', '#1e3a8a');
        drawCutawayRoom(-9, 2.5, -3.5, 7, '#f3e8ff', '#9333ea', 'Galerie-Café & Bistro', '#6b21a8');
        drawCutawayRoom(3.5, 2.5, 9, 7, '#dcfce7', '#16a34a', 'Reisebedarf & Mode', '#15803d');

        drawCentralAtriumCore();

        // 2 Circular Red DB Info Rondells matching the E+1 reference image
        const r1 = tileToScreen(-3.8, -1.2);
        const r2 = tileToScreen(-2.2, 2.8);
        drawIsoCylinder(c, r1.x, r1.y, 26 * s, 16 * s, 24 * s, '#991b1b', '#c94a4a', '#1e293b', 'DB INFO');
        drawIsoCylinder(c, r2.x, r2.y, 26 * s, 16 * s, 24 * s, '#991b1b', '#c94a4a', '#1e293b', 'DB SERVICE');
      } else if (viewId === 'E0') {
        // E0: Ground floor with NW Europaplatz (BVG Buses), SE Washingtonplatz (Taxis), 2 Red DB Rondells, Bakeral
        // Exterior roads
        drawFloorSlab(-12, -9.5, -8.5, 3, '#64748b', '#334155', 4, false); // Europaplatz road
        drawFloorSlab(8.5, -3, 12, 9.5, '#64748b', '#334155', 4, false); // Washingtonplatz road

        // Main Hall Floor
        drawFloorSlab(-8.5, -7.5, 8.5, 7.5, '#e7e5e4', '#57534e', 10, true);

        // Cutaway Shops & Gastronomy
        drawCutawayRoom(-8, -7, -2.5, -3.5, '#fef3c7', '#d97706', 'Bakeral Bäckerei', '#92400e');
        drawCutawayRoom(2.5, -7, 8, -2.5, '#ffedd5', '#ea580c', 'Food Court & Café', '#9a3412');
        drawCutawayRoom(-8, 2.5, -2.5, 7, '#fef9c3', '#ca8a04', 'Berliner Kaffeerösterei', '#854d0e');

        drawCentralAtriumCore();

        // 2 Iconic Circular Red DB Info Rondells on E0
        const r1 = tileToScreen(-3.6, -1.0);
        const r2 = tileToScreen(-2.0, 2.6);
        drawIsoCylinder(c, r1.x, r1.y, 27 * s, 17 * s, 25 * s, '#991b1b', '#c94a4a', '#1e293b', 'DB INFO');
        drawIsoCylinder(c, r2.x, r2.y, 27 * s, 17 * s, 25 * s, '#991b1b', '#c94a4a', '#1e293b', 'TICKETS');

        // NW Europaplatz Glass Curtain Wall & 3 Revolving Doors
        for (const ty of [-4.5, -2.5, -0.5]) {
          const dp = tileToScreen(-8.4, ty);
          drawIsoCylinder(c, dp.x, dp.y, 13 * s, 8 * s, 22 * s, '#94a3b8', 'rgba(125, 211, 252, 0.55)');
        }
        // Yellow BVG Buses outside Europaplatz
        const bus1A = tileToScreen(-10.5, -6.2);
        const bus1B = tileToScreen(-10.5, -2.5);
        drawLiveIsoTrain(c, bus1A.x, bus1A.y, bus1B.x, bus1B.y, 14 * s, 15 * s, 'BVG_BUS', 'BVG M41', nowSec);

        // SE Washingtonplatz Glass Curtain Wall, 3 Revolving Doors & Yellow Taxis
        for (const ty of [0.5, 2.5, 4.5]) {
          const dp = tileToScreen(8.4, ty);
          drawIsoCylinder(c, dp.x, dp.y, 13 * s, 8 * s, 22 * s, '#94a3b8', 'rgba(125, 211, 252, 0.55)');
        }
        const taxi1A = tileToScreen(10.2, 2.0);
        const taxi1B = tileToScreen(10.2, 4.0);
        drawLiveIsoTrain(c, taxi1A.x, taxi1A.y, taxi1B.x, taxi1B.y, 12 * s, 10 * s, 'TAXI', 'TAXI', nowSec);
      } else if (viewId === 'E-1') {
        // E-1: Mezzanine with Green Supermarket (NW), Pharmacy, Lockers, Asia Bistro, and U5 Transfer Corridor (NE)
        drawFloorSlab(-9.5, -7.5, 9.5, 7.5, '#cbd5e1', '#475569', 10, true);
        // U-Bahn U5 NE Corridor Extension
        drawFloorSlab(3.5, -10.5, 9.5, -7.5, '#bfdbfe', '#2563eb', 10, true);

        drawCutawayRoom(-9, -7, -2.5, -2.5, '#dcfce7', '#16a34a', 'HBF SUPERMARKT', '#166534');
        drawCutawayRoom(-9, 1.5, -3.5, 6.8, '#f8fafc', '#ef4444', 'APOTHEKE [A] & WC', '#dc2626');
        drawCutawayRoom(3.2, 2.0, 9.0, 7.0, '#ffedd5', '#b91c1c', 'ASIA BISTRO & SCHLIESSFÄCHER', '#991b1b');
        drawCutawayRoom(4.0, -10.2, 9.2, -7.2, '#dbeafe', '#1d4ed8', 'ÜBERGANG U-BAHN U5', '#1e40af');

        drawCentralAtriumCore();
      } else if (viewId === 'E-2') {
        // E-2: Deep Underground North-South Tracks (with Tunnel Portals in Earth) + Separate Yellow U5 Platform
        drawFloorSlab(-10.5, -8.0, 6.5, 8.0, '#94a3b8', '#334155', 12, true);
        // Separate U-Bahn U5 Platform on the East/Right side
        drawFloorSlab(7.2, -6.5, 11.8, 7.5, '#cbd5e1', '#1d4ed8', 12, true);

        // Earth Embankment Cross-Sections & Concrete Tunnel Portals at North/South ends
        drawCutawayRoom(-10.2, -7.8, 6.2, -6.2, '#475569', '#78350f', 'NORD-SÜD-TUNNELPORTALE', '#451a03');

        // 4 Mainline Deep Tracks + Trains
        const pIce1A = tileToScreen(-8.2, -5.5);
        const pIce1B = tileToScreen(-8.2, 5.5);
        drawLiveIsoTrain(c, pIce1A.x, pIce1A.y, pIce1B.x, pIce1B.y, 18 * s, 18 * s, 'ICE', 'ICE 1001 München', nowSec);

        const pReg1A = tileToScreen(-4.5, -5.0);
        const pReg1B = tileToScreen(-4.5, 5.2);
        drawLiveIsoTrain(c, pReg1A.x, pReg1A.y, pReg1B.x, pReg1B.y, 18 * s, 17 * s, 'REGIO', 'RE 3 · FEX BER', nowSec);

        const pIce2A = tileToScreen(4.2, -5.2);
        const pIce2B = tileToScreen(4.2, 5.5);
        drawLiveIsoTrain(c, pIce2A.x, pIce2A.y, pIce2B.x, pIce2B.y, 18 * s, 18 * s, 'ICE', 'ICE 592 Frankfurt', nowSec);

        // Yellow BVG U-Bahn U5 Train on the right-hand U5 platform
        const pU5A = tileToScreen(9.6, -4.8);
        const pU5B = tileToScreen(9.6, 5.2);
        drawLiveIsoTrain(c, pU5A.x, pU5A.y, pU5B.x, pU5B.y, 16 * s, 16 * s, 'UBAHN_U5', 'U5 Hönow ↔ Hbf', nowSec);

        drawCentralAtriumCore();
      }

      // Draw live NPCs from simulation state on the procedural level
      const targetLvl: StationLevelId =
        viewId === 'E+2'
          ? 2
          : viewId === 'E+1'
            ? 1
            : viewId === 'E0' || viewId === 'CUTAWAY'
              ? 0
              : viewId === 'E-1'
                ? -1
                : -2;

      for (const npc of npcsRef.current) {
        if (viewId !== 'CUTAWAY' && npc.level !== targetLvl) continue;
        const pos = tileToScreen(npc.wx * 0.75, npc.wy * 0.75);
        drawCommuterSprite(
          c,
          pos.x,
          pos.y,
          s,
          npc.coatColor,
          npc.accentColor,
          npc.hasLuggage,
          '#dc2626',
          npc.walkPhase,
          npc.thoughtBubble
        );
      }
    };

    const renderFrame = (now: number) => {
      const rawDt = Math.min(0.1, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const dt = rawDt * simSpeed;
      const nowSec = now / 1000;

      // Advance simulation state (trains, NPCs, ambient blueprint walkers)
      if (simSpeed > 0) {
        stationMinutesRef.current += dt * 0.85;
        stepTrainTimetable(trainsRef.current, dt);
        for (const npc of npcsRef.current) {
          stepNpcAgent(npc, trainsRef.current, 0, 0, 0, dt);
        }
        for (const w of walkersRef.current) {
          w.segProgress += w.speed * dt * 2.2;
          if (w.segProgress >= 1) {
            w.segProgress = 0;
            w.segIndex = (w.segIndex + 1) % Math.max(1, w.path.length - 1);
          }
        }
      }

      const w = canvas.width;
      const h = canvas.height;
      const atmosphere = atmosphereForMinutes(stationMinutesRef.current);
      ctx.clearRect(0, 0, w, h);

      // =========================================================================
      // MODE 3: ALL 6 LEVELS OVERVIEW GRID ('all_levels_grid')
      // =========================================================================
      if (renderStyle === 'all_levels_grid') {
        drawIsometricGrid(ctx, w, h, 32);

        const topPad = Math.max(48, h * 0.065);
        const botPad = 14;
        const sidePad = 16;
        const cols = 3;
        const rows = 2;
        const gap = 14;
        const cellW = (w - sidePad * 2 - gap * (cols - 1)) / cols;
        const cellH = (h - topPad - botPad - gap * (rows - 1)) / rows;

        scenes.forEach((scene, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const x = sidePad + col * (cellW + gap);
          const y = topPad + row * (cellH + gap);
          const art = resolveSceneArt(scene, assetTier, renderQuality, useAltE0Variant);

          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y, cellW, cellH, 8);
          ctx.clip();

          ctx.fillStyle = '#3b4049';
          ctx.fillRect(x, y, cellW, cellH);

          if (art) {
            const crop = art.plate.cropTopRatio ?? 0;
            const imgAspect = art.width / (art.height * (1 - crop));
            const contentY = y + 26;
            const contentH = cellH - 26;
            const cellAspect = cellW / contentH;
            let drawW = cellW;
            let drawH = contentH;
            if (cellAspect > imgAspect) {
              drawH = contentH;
              drawW = drawH * imgAspect;
            } else {
              drawW = cellW;
              drawH = drawW / imgAspect;
            }
            const dx = x + (cellW - drawW) * 0.5;
            const dy = contentY + (contentH - drawH) * 0.5;
            drawScenePlate(
              ctx,
              art.source,
              { x: dx, y: dy, w: drawW, h: drawH },
              { quality: renderQuality, atmosphere, frame: false, cropTopRatio: crop }
            );
            drawBlueprintLiveOverlays(ctx, scene.id as StationViewId, dx, dy, drawW, drawH, nowSec, 0.52);
            drawCrowd(ctx, scene.id, dx, dy, drawW, drawH, nowSec, 0.52);
          }

          // Card Header Bar matching the reference style
          ctx.fillStyle = 'rgba(30, 34, 41, 0.96)';
          ctx.fillRect(x, y, cellW, 26);
          ctx.fillStyle = scene.color;
          ctx.fillRect(x, y, 5, 26);

          ctx.fillStyle = '#f1f5f9';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`${scene.shortCode} — ${scene.subtitle.split('·')[0].trim()}`, x + 12, y + 17);

          ctx.restore();

          // Border highlight
          ctx.strokeStyle = scene.id === activeView ? '#f59e0b' : '#535869';
          ctx.lineWidth = scene.id === activeView ? 2.5 : 1.2;
          ctx.beginPath();
          ctx.roundRect(x, y, cellW, cellH, 8);
          ctx.stroke();
        });
      }
      // =========================================================================
      // MODE 2: PROCEDURAL ISOMETRIC ARCHITECTURE ('procedural_iso')
      // =========================================================================
      else if (renderStyle === 'procedural_iso') {
        drawProceduralLevel(ctx, activeView, w, h, nowSec);
      }
      // =========================================================================
      // MODE 1: HIGH-RES REFERENCE TILEMAP + LIVE SIMULATION ('reference_live')
      // =========================================================================
      else {
        drawIsometricGrid(ctx, w, h, 36);

        const art = activeScene
          ? resolveSceneArt(activeScene, assetTier, renderQuality, useAltE0Variant)
          : null;

        if (activeScene && art) {
          const crop = art.plate.cropTopRatio ?? 0;
          const topMargin = 36;
          const availW = w;
          const availH = h - topMargin;
          const imgAspect = art.width / (art.height * (1 - crop));
          const viewAspect = availW / availH;

          let baseW = availW;
          let baseH = availH;
          if (viewAspect > imgAspect) {
            baseH = availH * 0.99;
            baseW = baseH * imgAspect;
          } else {
            baseW = availW * 0.99;
            baseH = baseW / imgAspect;
          }

          const drawW = baseW * zoomRef.current;
          const drawH = baseH * zoomRef.current;
          const dx = (w - drawW) * 0.5 + panRef.current.x;
          const dy = topMargin + (availH - drawH) * 0.5 + panRef.current.y;

          // Baked + graded plate, time-of-day lighting and frame from the engine.
          drawScenePlate(
            ctx,
            art.source,
            { x: dx, y: dy, w: drawW, h: drawH },
            { quality: renderQuality, atmosphere, cropTopRatio: crop }
          );

          // Live animated trains, buses, taxis, elevators, escalators and commuters on top.
          const scaleFactor = Math.max(0.75, Math.min(1.8, drawW / 1280));
          drawBlueprintLiveOverlays(
            ctx,
            activeScene.id as StationViewId,
            dx,
            dy,
            drawW,
            drawH,
            nowSec,
            scaleFactor
          );
          drawCrowd(ctx, activeScene.id, dx, dy, drawW, drawH, nowSec, scaleFactor);
        } else {
          // Fallback while art loads
          drawProceduralLevel(ctx, activeView, w, h, nowSec);
        }
      }

      timerId = window.setTimeout(() => {
        renderFrame(performance.now());
      }, 32);
    };

    renderFrame(performance.now());

    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
      window.removeEventListener('resize', handleResize);
    };
  }, [
    venue,
    activeScene,
    activeView,
    renderStyle,
    useAltE0Variant,
    simSpeed,
    showLabels,
    renderQuality,
    assetTier,
    stationMinutesRef,
    trainsRef,
    npcsRef,
  ]);

  // Mouse drag pan & wheel zoom handlers (plus click-to-select in 6-level grid mode)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (renderStyle === 'all_levels_grid' && onSelectView && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const topPad = Math.max(48, rect.height * 0.065);
      const cols = 3;
      const rows = 2;
      const col = Math.floor((mx / rect.width) * cols);
      const row = Math.floor(((my - topPad) / (rect.height - topPad)) * rows);
      const idx = row * cols + col;
      if (idx >= 0 && idx < scenes.length) {
        onSelectView(scenes[idx].id as StationViewId);
      }
      return;
    }

    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: panRef.current.x,
      origY: panRef.current.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    panRef.current = {
      x: dragRef.current.origX + (e.clientX - dragRef.current.startX) * dpr,
      y: dragRef.current.origY + (e.clientY - dragRef.current.startY) * dpr,
    };
  };

  const handleMouseUp = () => {
    dragRef.current.active = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (renderStyle === 'all_levels_grid') return;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    zoomRef.current = Math.max(0.65, Math.min(2.6, zoomRef.current * factor));
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className="block w-full h-full cursor-grab active:cursor-grabbing select-none"
    />
  );
};
