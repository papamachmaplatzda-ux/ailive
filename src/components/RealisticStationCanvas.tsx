import React, { useEffect, useRef } from 'react';
import {
  STATION_TRACKS,
  StationLevelId,
} from '../game/stationData';
import {
  ScheduledTrain,
  NpcAgent,
  stepTrainTimetable,
  stepNpcAgent,
} from '../game/rules';

export type CameraPreset = 'overview' | 'concourse' | 'deep_tracks' | 'upper_tracks';
export type RenderStyleMode = 'procedural_realistic' | 'hybrid_illustrated' | 'reference_art';

interface RealisticStationCanvasProps {
  cameraPreset: CameraPreset;
  renderStyle: RenderStyleMode;
  timeScale: number;
  lightingMode: 'warm_station' | 'daylight' | 'night';
  showLabels: boolean;
  trainsRef: React.MutableRefObject<ScheduledTrain[]>;
  npcsRef: React.MutableRefObject<NpcAgent[]>;
  stationClockRef: React.MutableRefObject<number>;
  onTickClock: () => void;
}

export const RealisticStationCanvas: React.FC<RealisticStationCanvasProps> = ({
  cameraPreset,
  renderStyle,
  timeScale,
  lightingMode,
  showLabels,
  trainsRef,
  npcsRef,
  stationClockRef,
  onTickClock,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);

  const propsRef = useRef({
    cameraPreset,
    renderStyle,
    timeScale,
    lightingMode,
    showLabels,
    onTickClock,
  });

  useEffect(() => {
    propsRef.current = {
      cameraPreset,
      renderStyle,
      timeScale,
      lightingMode,
      showLabels,
      onTickClock,
    };
  }, [cameraPreset, renderStyle, timeScale, lightingMode, showLabels, onTickClock]);

  useEffect(() => {
    // Preload the reference architectural illustration for hybrid/reference modes
    const img = new Image();
    img.src =
      '/assets/aistudio/ONE_standalone_full_bleed_isometric_2D_RPG_GAME_MAP_for_Berl_d2dca29c.png';
    img.onload = () => {
      bgImgRef.current = img;
    };
  }, []);

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

    // Camera Pan & Zoom state
    let camPanX = 0;
    let camPanY = 0;
    let camZoom = 1.0;
    let targetPanX = 0;
    let targetPanY = 0;
    let targetZoom = 1.0;
    let lastPreset: CameraPreset = propsRef.current.cameraPreset;

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    const handlePointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      targetPanX = Math.max(-500, Math.min(500, targetPanX + dx));
      targetPanY = Math.max(-350, Math.min(350, targetPanY + dy));
      camPanX = targetPanX;
      camPanY = targetPanY;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      targetZoom = Math.max(0.7, Math.min(2.1, targetZoom + delta));
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('wheel', handleWheel, { passive: true });

    let lastTime = performance.now();
    let lastClockSync = 0;
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

    // Isometric Projection matched to the exact angle of the architectural reference artwork!
    // In the reference artwork:
    // - Track axis (u): runs from bottom-left to top-right at ~26.5 deg (2:1 isometric)
    // - Gallery/Bridge axis (v): runs from top-left to bottom-right at ~26.5 deg
    const TILE_W = 64;
    const TILE_H = 32;

    const projectIso = (
      u: number, // Along the main tracks (-16 to +16)
      v: number, // Across the tracks / along the concourse bridge (-12 to +12)
      zPx: number, // Vertical elevation in pixels (positive = up)
      cx: number,
      cy: number,
      zoom: number
    ) => {
      const sx = cx + (u + v) * (TILE_W * 0.5) * zoom;
      const sy = cy + (v - u) * (TILE_H * 0.5) * zoom - zPx * zoom;
      return { sx, sy };
    };

    // Draw an isometric 3D quad given 4 (u, v, zPx) vertices
    const fillIsoPoly = (
      pts: Array<{ u: number; v: number; z: number }>,
      cx: number,
      cy: number,
      zoom: number,
      fill: string | CanvasGradient,
      stroke?: string,
      lineWidth: number = 1
    ) => {
      if (pts.length === 0) return;
      ctx.beginPath();
      const first = projectIso(pts[0].u, pts[0].v, pts[0].z, cx, cy, zoom);
      ctx.moveTo(first.sx, first.sy);
      for (let i = 1; i < pts.length; i++) {
        const p = projectIso(pts[i].u, pts[i].v, pts[i].z, cx, cy, zoom);
        ctx.lineTo(p.sx, p.sy);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth * zoom;
        ctx.stroke();
      }
    };

    // Draw a shaded 3D isometric prism block aligned with (u, v, z)
    const drawPrism = (
      u1: number,
      u2: number,
      v1: number,
      v2: number,
      zBase: number,
      zTop: number,
      cx: number,
      cy: number,
      zoom: number,
      topFill: string | CanvasGradient,
      frontLeftFill: string | CanvasGradient, // Face at u = u1 (facing bottom-left)
      frontRightFill: string | CanvasGradient, // Face at v = v2 (facing bottom-right)
      stroke: string = 'rgba(20, 24, 33, 0.65)',
      lineWidth: number = 1
    ) => {
      // Front-left face (u = u1, v from v1 to v2)
      fillIsoPoly(
        [
          { u: u1, v: v1, z: zBase },
          { u: u1, v: v2, z: zBase },
          { u: u1, v: v2, z: zTop },
          { u: u1, v: v1, z: zTop },
        ],
        cx,
        cy,
        zoom,
        frontLeftFill,
        stroke,
        lineWidth
      );

      // Front-right face (v = v2, u from u1 to u2)
      fillIsoPoly(
        [
          { u: u1, v: v2, z: zBase },
          { u: u2, v: v2, z: zBase },
          { u: u2, v: v2, z: zTop },
          { u: u1, v: v2, z: zTop },
        ],
        cx,
        cy,
        zoom,
        frontRightFill,
        stroke,
        lineWidth
      );

      // Top face (z = zTop)
      fillIsoPoly(
        [
          { u: u1, v: v1, z: zTop },
          { u: u2, v: v1, z: zTop },
          { u: u2, v: v2, z: zTop },
          { u: u1, v: v2, z: zTop },
        ],
        cx,
        cy,
        zoom,
        topFill,
        stroke,
        lineWidth
      );
    };

    // Realistic Railway Track Renderer (Ballast, Concrete Sleepers, Dual Steel Rails, Specular Shine)
    const drawRealisticTrack = (
      vCenter: number,
      uStart: number,
      uEnd: number,
      zLevel: number,
      cx: number,
      cy: number,
      zoom: number
    ) => {
      // 1. Crushed granite ballast bed
      fillIsoPoly(
        [
          { u: uStart, v: vCenter - 0.85, z: zLevel },
          { u: uEnd, v: vCenter - 0.85, z: zLevel },
          { u: uEnd, v: vCenter + 0.85, z: zLevel },
          { u: uStart, v: vCenter + 0.85, z: zLevel },
        ],
        cx,
        cy,
        zoom,
        '#3d3834',
        '#26221f',
        0.8
      );

      // Inner dark trackbed shadow trough
      fillIsoPoly(
        [
          { u: uStart, v: vCenter - 0.52, z: zLevel },
          { u: uEnd, v: vCenter - 0.52, z: zLevel },
          { u: uEnd, v: vCenter + 0.52, z: zLevel },
          { u: uStart, v: vCenter + 0.52, z: zLevel },
        ],
        cx,
        cy,
        zoom,
        '#292524'
      );

      // 2. Concrete / Timber Cross-Sleepers (Bahnschwellen)
      ctx.strokeStyle = '#57534e';
      ctx.lineWidth = 2.6 * zoom;
      for (let u = uStart + 0.3; u <= uEnd - 0.3; u += 0.55) {
        const p1 = projectIso(u, vCenter - 0.62, zLevel + 1, cx, cy, zoom);
        const p2 = projectIso(u, vCenter + 0.62, zLevel + 1, cx, cy, zoom);
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();
      }

      // 3. Dual Steel Rails with Specular Highlight
      const railOffsets = [-0.34, 0.34];
      for (const ro of railOffsets) {
        const rStart = projectIso(uStart, vCenter + ro, zLevel + 2.5, cx, cy, zoom);
        const rEnd = projectIso(uEnd, vCenter + ro, zLevel + 2.5, cx, cy, zoom);

        // Dark rail base web
        ctx.strokeStyle = '#1c1917';
        ctx.lineWidth = 3.2 * zoom;
        ctx.beginPath();
        ctx.moveTo(rStart.sx, rStart.sy + 1 * zoom);
        ctx.lineTo(rEnd.sx, rEnd.sy + 1 * zoom);
        ctx.stroke();

        // Polished steel rail head
        ctx.strokeStyle = '#d6d3d1';
        ctx.lineWidth = 1.6 * zoom;
        ctx.beginPath();
        ctx.moveTo(rStart.sx, rStart.sy);
        ctx.lineTo(rEnd.sx, rEnd.sy);
        ctx.stroke();
      }
    };

    // Realistic Island Platform Renderer (Stone Tile Grid, Yellow Tactile Line, Benches, Light Posts, ZZA, Poster Lightboxes)
    const drawRealisticPlatform = (
      v1: number,
      v2: number,
      uStart: number,
      uEnd: number,
      zBase: number,
      cx: number,
      cy: number,
      zoom: number,
      platformTitle: string,
      hasPoster: boolean
    ) => {
      const zTop = zBase + 16;

      // Platform structural slab with warm limestone top
      drawPrism(
        uStart,
        uEnd,
        v1,
        v2,
        zBase,
        zTop,
        cx,
        cy,
        zoom,
        '#d6d1c7',
        '#8c857B',
        '#6e685f',
        '#292524',
        1.1
      );

      // Transverse stone tile joint lines across platform surface
      ctx.strokeStyle = 'rgba(68, 64, 60, 0.25)';
      ctx.lineWidth = 0.8 * zoom;
      for (let u = uStart + 1; u < uEnd; u += 1.2) {
        const p1 = projectIso(u, v1, zTop, cx, cy, zoom);
        const p2 = projectIso(u, v2, zTop, cx, cy, zoom);
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();
      }

      // Yellow Tactile Safety Strips (Blindenleitstreifen) along both edges
      fillIsoPoly(
        [
          { u: uStart + 0.3, v: v1 + 0.16, z: zTop + 0.4 },
          { u: uEnd - 0.3, v: v1 + 0.16, z: zTop + 0.4 },
          { u: uEnd - 0.3, v: v1 + 0.28, z: zTop + 0.4 },
          { u: uStart + 0.3, v: v1 + 0.28, z: zTop + 0.4 },
        ],
        cx,
        cy,
        zoom,
        '#eab308'
      );
      fillIsoPoly(
        [
          { u: uStart + 0.3, v: v2 - 0.28, z: zTop + 0.4 },
          { u: uEnd - 0.3, v: v2 - 0.28, z: zTop + 0.4 },
          { u: uEnd - 0.3, v: v2 - 0.16, z: zTop + 0.4 },
          { u: uStart + 0.3, v: v2 - 0.16, z: zTop + 0.4 },
        ],
        cx,
        cy,
        zoom,
        '#eab308'
      );

      const vMid = (v1 + v2) * 0.5;

      // Warm Golden Platform Light Pools & Lamp Posts
      const lampPositions = [uStart + 3.2, (uStart + uEnd) * 0.5, uEnd - 3.2];
      for (const lu of lampPositions) {
        const floorPt = projectIso(lu, vMid, zTop, cx, cy, zoom);
        const topPt = projectIso(lu, vMid, zTop + 42, cx, cy, zoom);

        // Warm floor illumination pool
        const pool = ctx.createRadialGradient(
          floorPt.sx,
          floorPt.sy,
          2 * zoom,
          floorPt.sx,
          floorPt.sy,
          44 * zoom
        );
        pool.addColorStop(0, 'rgba(254, 240, 138, 0.42)');
        pool.addColorStop(0.55, 'rgba(245, 158, 11, 0.16)');
        pool.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = pool;
        ctx.beginPath();
        ctx.ellipse(floorPt.sx, floorPt.sy, 44 * zoom, 22 * zoom, 0, 0, Math.PI * 2);
        ctx.fill();

        // Lamp pole
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2.2 * zoom;
        ctx.beginPath();
        ctx.moveTo(floorPt.sx, floorPt.sy);
        ctx.lineTo(topPt.sx, topPt.sy);
        ctx.stroke();

        // T-bar lamp head
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3 * zoom;
        ctx.beginPath();
        ctx.moveTo(topPt.sx - 8 * zoom, topPt.sy - 3 * zoom);
        ctx.lineTo(topPt.sx + 8 * zoom, topPt.sy + 3 * zoom);
        ctx.stroke();
      }

      // Wooden Platform Waiting Benches
      for (const bu of [uStart + 4.8, uEnd - 5.2]) {
        drawPrism(
          bu - 0.6,
          bu + 0.6,
          vMid - 0.25,
          vMid + 0.25,
          zTop,
          zTop + 9,
          cx,
          cy,
          zoom,
          '#b45309',
          '#78350f',
          '#451a03',
          '#1c1917',
          0.8
        );
      }

      // Illuminated Fernsehturm Poster Display (matching bottom-left of reference artwork!)
      if (hasPoster) {
        const pu = uStart + 2.3;
        drawPrism(
          pu - 0.15,
          pu + 0.15,
          vMid - 0.45,
          vMid + 0.45,
          zTop,
          zTop + 48,
          cx,
          cy,
          zoom,
          '#475569',
          '#fde68a',
          '#334155',
          '#1e293b',
          1.2
        );
        // Poster warm glow
        const pCenter = projectIso(pu, vMid, zTop + 24, cx, cy, zoom);
        const pGlow = ctx.createRadialGradient(
          pCenter.sx,
          pCenter.sy,
          2,
          pCenter.sx,
          pCenter.sy,
          28 * zoom
        );
        pGlow.addColorStop(0, 'rgba(253, 224, 71, 0.55)');
        pGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
        ctx.fillStyle = pGlow;
        ctx.beginPath();
        ctx.arc(pCenter.sx, pCenter.sy, 28 * zoom, 0, Math.PI * 2);
        ctx.fill();
      }

      // Blue Split-Flap Departure Board (Zugzielanzeiger) on Platform
      const boardU = uStart + 6.4;
      drawPrism(
        boardU - 0.9,
        boardU + 0.9,
        vMid - 0.12,
        vMid + 0.12,
        zTop + 22,
        zTop + 48,
        cx,
        cy,
        zoom,
        '#334155',
        '#1e3a8a',
        '#1d4ed8',
        '#0f172a',
        1.1
      );
      if (propsRef.current.showLabels) {
        const bPt = projectIso(boardU, vMid, zTop + 53, cx, cy, zoom);
        ctx.save();
        ctx.font = `700 ${Math.round(9.5 * zoom)}px "JetBrains Mono", monospace`;
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.fillText(platformTitle, bPt.sx, bPt.sy);
        ctx.restore();
      }
    };

    // Ultra-Detailed Realistic Train Renderer (ICE 3/4 High-Speed & DB Regio / S-Bahn)
    const drawRealisticTrain = (
      vCenter: number,
      uPos: number, // Center of train along track
      zBase: number,
      category: 'ICE' | 'REGIO' | 'SBAHN' | 'FEX',
      lineCode: string,
      destination: string,
      isBoarding: boolean,
      cx: number,
      cy: number,
      zoom: number
    ) => {
      const numCars = 2;
      const carLen = 5.4;
      const gap = 0.25;
      const halfTotal = (numCars * carLen + (numCars - 1) * gap) * 0.5;
      const v1 = vCenter - 0.62;
      const v2 = vCenter + 0.62;
      const zBodyBot = zBase + 5;
      const zBodyTop = zBase + 34;

      const isIce = category === 'ICE';

      // Dark underbody bogie shadow
      fillIsoPoly(
        [
          { u: uPos - halfTotal - 0.8, v: v1 + 0.08, z: zBase + 2 },
          { u: uPos + halfTotal + 0.8, v: v1 + 0.08, z: zBase + 2 },
          { u: uPos + halfTotal + 0.8, v: v2 - 0.08, z: zBase + 2 },
          { u: uPos - halfTotal - 0.8, v: v2 - 0.08, z: zBase + 2 },
        ],
        cx,
        cy,
        zoom,
        'rgba(10, 12, 16, 0.82)'
      );

      for (let c = 0; c < numCars; c++) {
        const cu1 = uPos - halfTotal + c * (carLen + gap);
        const cu2 = cu1 + carLen;

        // Main carriage body
        const topColor = isIce ? '#e7e5e4' : '#b91c1c';
        const leftColor = isIce ? '#d6d3d1' : '#991b1b';
        const rightColor = isIce ? '#f5f5f4' : '#dc2626';

        drawPrism(
          cu1,
          cu2,
          v1,
          v2,
          zBodyBot,
          zBodyTop,
          cx,
          cy,
          zoom,
          topColor,
          leftColor,
          rightColor,
          '#1c1917',
          1.1
        );

        // If ICE: Iconic DB Traffic-Red Longitudinal Speed Stripe along side (v = v2)
        if (isIce) {
          fillIsoPoly(
            [
              { u: cu1, v: v2 + 0.01, z: zBodyBot + 7 },
              { u: cu2, v: v2 + 0.01, z: zBodyBot + 7 },
              { u: cu2, v: v2 + 0.01, z: zBodyBot + 11.5 },
              { u: cu1, v: v2 + 0.01, z: zBodyBot + 11.5 },
            ],
            cx,
            cy,
            zoom,
            '#dc2626'
          );
          // Continuous dark tinted passenger window ribbon
          fillIsoPoly(
            [
              { u: cu1 + 0.35, v: v2 + 0.01, z: zBodyBot + 15 },
              { u: cu2 - 0.35, v: v2 + 0.01, z: zBodyBot + 15 },
              { u: cu2 - 0.35, v: v2 + 0.01, z: zBodyBot + 23 },
              { u: cu1 + 0.35, v: v2 + 0.01, z: zBodyBot + 23 },
            ],
            cx,
            cy,
            zoom,
            '#1e293b',
            '#475569',
            0.6
          );
        } else {
          // DB Regio / S-Bahn: Light grey lower skirt + individual warm-lit passenger windows & twin doors
          fillIsoPoly(
            [
              { u: cu1, v: v2 + 0.01, z: zBodyBot },
              { u: cu2, v: v2 + 0.01, z: zBodyBot },
              { u: cu2, v: v2 + 0.01, z: zBodyBot + 5 },
              { u: cu1, v: v2 + 0.01, z: zBodyBot + 5 },
            ],
            cx,
            cy,
            zoom,
            '#d6d3d1'
          );

          // Individual windows & sliding doors along side
          for (let wu = cu1 + 0.45; wu < cu2 - 0.55; wu += 0.85) {
            const isDoor = Math.abs(wu - (cu1 + 1.3)) < 0.3 || Math.abs(wu - (cu2 - 1.4)) < 0.3;
            fillIsoPoly(
              [
                { u: wu, v: v2 + 0.02, z: isDoor ? zBodyBot + 4 : zBodyBot + 13 },
                { u: wu + 0.55, v: v2 + 0.02, z: isDoor ? zBodyBot + 4 : zBodyBot + 13 },
                { u: wu + 0.55, v: v2 + 0.02, z: zBodyBot + 24 },
                { u: wu, v: v2 + 0.02, z: zBodyBot + 24 },
              ],
              cx,
              cy,
              zoom,
              isDoor
                ? isBoarding
                  ? '#fde68a'
                  : '#94a3b8'
                : '#1e293b',
              '#0f172a',
              0.7
            );
          }

          // Roof AC cooling units
          drawPrism(
            cu1 + 1.2,
            cu2 - 1.2,
            v1 + 0.25,
            v2 - 0.25,
            zBodyTop,
            zBodyTop + 4,
            cx,
            cy,
            zoom,
            '#78716c',
            '#57534e',
            '#44403c',
            '#1c1917',
            0.7
          );
        }

        // Roof Pantograph (Stromabnehmer) on second car
        if (c === 1) {
          const pu = (cu1 + cu2) * 0.5;
          const pBase = projectIso(pu, vCenter, zBodyTop + 3, cx, cy, zoom);
          ctx.save();
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.6 * zoom;
          ctx.beginPath();
          ctx.moveTo(pBase.sx, pBase.sy);
          ctx.lineTo(pBase.sx - 12 * zoom, pBase.sy - 9 * zoom);
          ctx.lineTo(pBase.sx, pBase.sy - 18 * zoom);
          ctx.lineTo(pBase.sx + 12 * zoom, pBase.sy - 9 * zoom);
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
      }

      // Sculpted Aerodynamic Front Nose Cone at u = uPos - halfTotal (pointing bottom-left just like reference art!)
      const noseU1 = uPos - halfTotal - (isIce ? 1.85 : 0.75);
      const noseU2 = uPos - halfTotal;

      // Tapered aerodynamic wedge
      fillIsoPoly(
        [
          { u: noseU1, v: v1 + 0.15, z: zBodyBot + 2 },
          { u: noseU1, v: v2 - 0.15, z: zBodyBot + 2 },
          { u: noseU2, v: v2, z: zBodyTop },
          { u: noseU2, v: v1, z: zBodyTop },
        ],
        cx,
        cy,
        zoom,
        isIce ? '#f5f5f4' : '#dc2626',
        '#1c1917',
        1.1
      );

      // Side of nose cone
      fillIsoPoly(
        [
          { u: noseU1, v: v2 - 0.15, z: zBodyBot + 2 },
          { u: noseU2, v: v2, z: zBodyBot },
          { u: noseU2, v: v2, z: zBodyTop },
        ],
        cx,
        cy,
        zoom,
        isIce ? '#e7e5e4' : '#b91c1c',
        '#1c1917',
        1.0
      );

      // Dark panoramic driver cockpit windshield on nose slope
      fillIsoPoly(
        [
          { u: noseU1 + 0.45, v: v1 + 0.22, z: zBodyBot + 11 },
          { u: noseU1 + 0.45, v: v2 - 0.22, z: zBodyBot + 11 },
          { u: noseU2 - 0.15, v: v2 - 0.12, z: zBodyTop - 3 },
          { u: noseU2 - 0.15, v: v1 + 0.12, z: zBodyTop - 3 },
        ],
        cx,
        cy,
        zoom,
        '#0f172a',
        '#475569',
        0.9
      );

      // Glowing Dual Headlights at nose tip
      for (const hv of [v1 + 0.28, v2 - 0.28]) {
        const hl = projectIso(noseU1 + 0.15, hv, zBodyBot + 6, cx, cy, zoom);
        const hGlow = ctx.createRadialGradient(hl.sx, hl.sy, 1, hl.sx, hl.sy, 18 * zoom);
        hGlow.addColorStop(0, 'rgba(254, 249, 195, 0.95)');
        hGlow.addColorStop(0.4, 'rgba(250, 204, 21, 0.35)');
        hGlow.addColorStop(1, 'rgba(250, 204, 21, 0)');
        ctx.fillStyle = hGlow;
        ctx.beginPath();
        ctx.arc(hl.sx, hl.sy, 18 * zoom, 0, Math.PI * 2);
        ctx.fill();
      }

      // Subtle architectural label above train if enabled
      if (propsRef.current.showLabels) {
        const lblPt = projectIso(uPos, vCenter, zBodyTop + 18, cx, cy, zoom);
        ctx.save();
        ctx.font = `700 ${Math.round(9.5 * zoom)}px "JetBrains Mono", monospace`;
        const txt = `${lineCode} · ${destination}`;
        const tw = ctx.measureText(txt).width + 10 * zoom;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.fillRect(lblPt.sx - tw * 0.5, lblPt.sy - 8 * zoom, tw, 15 * zoom);
        ctx.strokeStyle = isBoarding ? '#34d399' : '#64748b';
        ctx.lineWidth = 1;
        ctx.strokeRect(lblPt.sx - tw * 0.5, lblPt.sy - 8 * zoom, tw, 15 * zoom);
        ctx.fillStyle = isBoarding ? '#6ee7b7' : '#f8fafc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, lblPt.sx, lblPt.sy - 0.5 * zoom);
        ctx.restore();
      }
    };

    // Detailed Isometric Human Character Renderer
    const drawRealisticCommuter = (
      u: number,
      v: number,
      z: number,
      coatColor: string,
      trouserColor: string,
      walkPhase: number,
      hasSuitcase: boolean,
      cx: number,
      cy: number,
      zoom: number
    ) => {
      const pt = projectIso(u, v, z, cx, cy, zoom);
      const bob = Math.abs(Math.sin(walkPhase)) * 1.8 * zoom;
      const legSwing = Math.sin(walkPhase) * 2.5 * zoom;

      ctx.save();
      // Ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
      ctx.beginPath();
      ctx.ellipse(pt.sx, pt.sy, 6 * zoom, 3.2 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();

      // Legs / Trousers
      ctx.strokeStyle = trouserColor;
      ctx.lineWidth = 2.4 * zoom;
      ctx.beginPath();
      ctx.moveTo(pt.sx - 1.8 * zoom, pt.sy - 8 * zoom);
      ctx.lineTo(pt.sx - 1.8 * zoom + legSwing, pt.sy);
      ctx.moveTo(pt.sx + 1.8 * zoom, pt.sy - 8 * zoom);
      ctx.lineTo(pt.sx + 1.8 * zoom - legSwing, pt.sy);
      ctx.stroke();

      // Rolling suitcase beside passenger
      if (hasSuitcase) {
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 0.9 * zoom;
        ctx.fillRect(pt.sx + 5 * zoom, pt.sy - 9 * zoom, 4.5 * zoom, 8 * zoom);
        ctx.strokeRect(pt.sx + 5 * zoom, pt.sy - 9 * zoom, 4.5 * zoom, 8 * zoom);
      }

      // Coat / Jacket Torso
      ctx.fillStyle = coatColor;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1 * zoom;
      ctx.beginPath();
      ctx.roundRect(
        pt.sx - 4.2 * zoom,
        pt.sy - 19 * zoom - bob,
        8.4 * zoom,
        11.5 * zoom,
        2.5 * zoom
      );
      ctx.fill();
      ctx.stroke();

      // Head & Hair
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(pt.sx, pt.sy - 22.5 * zoom - bob, 3.4 * zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.arc(pt.sx, pt.sy - 23.8 * zoom - bob, 3.2 * zoom, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const renderFrame = (now: number) => {
      if (isDisposed) return;

      const rawDt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const {
        cameraPreset: preset,
        renderStyle: styleMode,
        timeScale: ts,
        lightingMode: lightMode,
        showLabels: labelsOn,
      } = propsRef.current;

      // Update camera preset targets smoothly if preset changed
      if (preset !== lastPreset) {
        lastPreset = preset;
        if (preset === 'overview') {
          targetPanX = 0;
          targetPanY = 0;
          targetZoom = 1.0;
        } else if (preset === 'concourse') {
          targetPanX = -60;
          targetPanY = 95;
          targetZoom = 1.42;
        } else if (preset === 'deep_tracks') {
          targetPanX = 85;
          targetPanY = -125;
          targetZoom = 1.35;
        } else if (preset === 'upper_tracks') {
          targetPanX = -140;
          targetPanY = 175;
          targetZoom = 1.38;
        }
      }

      camPanX += (targetPanX - camPanX) * Math.min(1, rawDt * 8);
      camPanY += (targetPanY - camPanY) * Math.min(1, rawDt * 8);
      camZoom += (targetZoom - camZoom) * Math.min(1, rawDt * 8);

      // Step train timetable & NPCs
      const simDt = rawDt * ts;
      if (simDt > 0) {
        stationClockRef.current = (stationClockRef.current + simDt * 0.85) % 1440;
        stepTrainTimetable(trainsRef.current, simDt);
        for (const npc of npcsRef.current) {
          stepNpcAgent(npc, trainsRef.current, 0, 0, 0, simDt);
        }
      }

      if (now - lastClockSync > 250) {
        lastClockSync = now;
        propsRef.current.onTickClock();
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // If user selected pure Reference Art mode, render the high-res reference illustration full-bleed with live animated light & train indicators!
      if (styleMode === 'reference_art' && bgImgRef.current) {
        ctx.fillStyle = '#18181b';
        ctx.fillRect(0, 0, width, height);

        const img = bgImgRef.current;
        const scale = Math.max(width / img.width, height / img.height) * camZoom;
        const iw = img.width * scale;
        const ih = img.height * scale;
        const ix = (width - iw) * 0.5 + camPanX;
        const iy = (height - ih) * 0.5 + camPanY;

        ctx.drawImage(img, ix, iy, iw, ih);
        ctx.restore();
        scheduleNextFrame();
        return;
      }

      const cx = width * 0.48 + camPanX;
      const cy = height * 0.56 + camPanY;

      // ======================================================================
      // 1. ARCHITECTURAL VAULTED TUNNEL HALL BACKGROUND & WARM SCONCE LIGHTING
      // ======================================================================
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      if (lightMode === 'daylight') {
        bgGrad.addColorStop(0, '#475569');
        bgGrad.addColorStop(0.5, '#64748b');
        bgGrad.addColorStop(1, '#334155');
      } else if (lightMode === 'night') {
        bgGrad.addColorStop(0, '#111827');
        bgGrad.addColorStop(0.5, '#1e293b');
        bgGrad.addColorStop(1, '#090d16');
      } else {
        // Warm concrete station palette matching reference image
        bgGrad.addColorStop(0, '#3a3c42');
        bgGrad.addColorStop(0.45, '#4b4e57');
        bgGrad.addColorStop(1, '#26272b');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // If Hybrid Illustrated mode is active, blend the architectural reference texture subtly underneath
      if (styleMode === 'hybrid_illustrated' && bgImgRef.current) {
        ctx.save();
        ctx.globalAlpha = 0.34;
        const img = bgImgRef.current;
        const scale = Math.max(width / img.width, height / img.height) * camZoom;
        const iw = img.width * scale;
        const ih = img.height * scale;
        ctx.drawImage(img, (width - iw) * 0.5 + camPanX, (height - ih) * 0.5 + camPanY, iw, ih);
        ctx.restore();
      }

      // Vaulted Concrete Arch Ribs & Linear Wall Luminaires (top-left & top-right tunnel walls)
      ctx.save();
      ctx.strokeStyle = 'rgba(24, 24, 27, 0.45)';
      ctx.lineWidth = 4 * camZoom;
      for (let i = -5; i <= 5; i++) {
        ctx.beginPath();
        ctx.ellipse(
          cx + i * 130 * camZoom,
          cy - 60 * camZoom,
          720 * camZoom,
          490 * camZoom,
          -0.25,
          Math.PI * 0.92,
          Math.PI * 2.08
        );
        ctx.stroke();
      }

      // Warm linear tunnel wall lights along both upper walls
      for (let u = -11; u <= 9; u += 4) {
        const wallPt = projectIso(u, -10.2, 75, cx, cy, camZoom);
        const g = ctx.createRadialGradient(
          wallPt.sx,
          wallPt.sy,
          2,
          wallPt.sx,
          wallPt.sy,
          42 * camZoom
        );
        g.addColorStop(0, 'rgba(254, 243, 199, 0.92)');
        g.addColorStop(0.45, 'rgba(245, 158, 11, 0.32)');
        g.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(wallPt.sx, wallPt.sy, 42 * camZoom, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 3.2 * camZoom;
        ctx.beginPath();
        ctx.moveTo(wallPt.sx - 14 * camZoom, wallPt.sy + 7 * camZoom);
        ctx.lineTo(wallPt.sx + 14 * camZoom, wallPt.sy - 7 * camZoom);
        ctx.stroke();
      }
      ctx.restore();

      const trains = trainsRef.current;
      const npcs = npcsRef.current;

      // ======================================================================
      // 2. LOWER & UPPER TRACKS + PLATFORMS (BACK-TO-FRONT PAINTER'S ORDER BY `v`)
      // ======================================================================
      // Base station foundation slab
      fillIsoPoly(
        [
          { u: -15, v: -10.5, z: -4 },
          { u: 15, v: -10.5, z: -4 },
          { u: 15, v: 10.5, z: -4 },
          { u: -15, v: 10.5, z: -4 },
        ],
        cx,
        cy,
        camZoom,
        '#272523',
        '#1c1917',
        1.5
      );

      // Track 1 (Far top-left track: v = -8.6)
      drawRealisticTrack(-8.6, -14.5, 14.5, 0, cx, cy, camZoom);

      // Platform A (v = -7.6 to -5.4)
      drawRealisticPlatform(
        -7.6,
        -5.4,
        -14,
        14,
        0,
        cx,
        cy,
        camZoom,
        'GLEIS 1 / 2 · ICE FERNBAHN',
        true
      );

      // Track 2 (ICE High-Speed Track on left: v = -4.2)
      drawRealisticTrack(-4.2, -14.5, 14.5, 0, cx, cy, camZoom);
      const trIceLeft = trains[0];
      drawRealisticTrain(
        -4.2,
        -3.5 + trIceLeft.positionAlongTrack * 0.28,
        0,
        'ICE',
        trIceLeft.lineCode,
        trIceLeft.destination,
        trIceLeft.state === 'BOARDING',
        cx,
        cy,
        camZoom
      );

      // Platform B (Central Left Platform: v = -3.0 to -0.8)
      drawRealisticPlatform(
        -3.0,
        -0.8,
        -14,
        14,
        0,
        cx,
        cy,
        camZoom,
        'GLEIS 3 / 4 · REGIONAL & EC',
        false
      );

      // Track 3 (Center Red DB Regio Track: v = 0.5)
      drawRealisticTrack(0.5, -14.5, 14.5, 0, cx, cy, camZoom);
      const trRegioCenter = trains[1];
      drawRealisticTrain(
        0.5,
        -2.2 + trRegioCenter.positionAlongTrack * 0.25,
        0,
        'REGIO',
        trRegioCenter.lineCode,
        trRegioCenter.destination,
        trRegioCenter.state === 'BOARDING',
        cx,
        cy,
        camZoom
      );

      // Platform C (Central Right Platform: v = 1.7 to 3.9)
      drawRealisticPlatform(
        1.7,
        3.9,
        -14,
        14,
        0,
        cx,
        cy,
        camZoom,
        'GLEIS 5 / 6 · FEX FLUGHAFEN BER',
        false
      );

      // Track 4 (Lower Right Red S-Bahn / FEX Track: v = 5.1)
      drawRealisticTrack(5.1, -14.5, 14.5, 0, cx, cy, camZoom);
      const trFexRight = trains[2];
      drawRealisticTrain(
        5.1,
        -1.5 + trFexRight.positionAlongTrack * 0.25,
        0,
        'FEX',
        trFexRight.lineCode,
        trFexRight.destination,
        trFexRight.state === 'BOARDING',
        cx,
        cy,
        camZoom
      );

      // Track 5 (Parallel White ICE Sprinter Track on Right: v = 6.9)
      drawRealisticTrack(6.9, -14.5, 14.5, 0, cx, cy, camZoom);
      const trIceRight = trains[3];
      drawRealisticTrain(
        6.9,
        1.2 + trIceRight.positionAlongTrack * 0.25,
        0,
        'ICE',
        trIceRight.lineCode,
        trIceRight.destination,
        trIceRight.state === 'BOARDING',
        cx,
        cy,
        camZoom
      );

      // Platform D (Foreground Right Platform: v = 8.1 to 10.1)
      drawRealisticPlatform(
        8.1,
        10.1,
        -14,
        14,
        0,
        cx,
        cy,
        camZoom,
        'GLEIS 7 / 8 · ICE SPRINTER',
        false
      );

      // Render Commuters on the Lower Platforms
      for (let i = 0; i < 14; i++) {
        const npc = npcs[i % npcs.length];
        const platV = [-6.5, -1.9, 2.8, 9.0][i % 4];
        const uWalk = ((npc.wx * 1.1 + i * 2.3) % 18) - 9;
        drawRealisticCommuter(
          uWalk,
          platV + ((i % 3) - 1) * 0.35,
          16,
          npc.coatColor,
          '#1e293b',
          npc.walkPhase + now * 0.004,
          npc.hasLuggage,
          cx,
          cy,
          camZoom
        );
      }

      // ======================================================================
      // 3. UPPER STADTBAHN VIADUCT GALLERY (TOP-RIGHT ELEVATED RED S-BAHN)
      // (Directly matching the elevated red train in the top-right of the reference art!)
      // ======================================================================
      const zUpperViaduct = 148;
      drawPrism(
        6.2,
        14.2,
        -10.2,
        10.2,
        zUpperViaduct - 14,
        zUpperViaduct,
        cx,
        cy,
        camZoom,
        '#b8b2a8',
        '#78716c',
        '#57534e',
        '#1c1917',
        1.2
      );

      // Long Red S-Bahn Train running along the elevated viaduct (`v` axis from -9 to +9 at u = 10.5)
      const sBahnShift = Math.sin(now * 0.0005) * 1.8;
      for (let sc = -2; sc <= 1; sc++) {
        const sv1 = sc * 4.2 + sBahnShift;
        const sv2 = sv1 + 3.85;
        drawPrism(
          9.4,
          11.2,
          sv1,
          sv2,
          zUpperViaduct + 2,
          zUpperViaduct + 30,
          cx,
          cy,
          camZoom,
          '#991b1b',
          '#dc2626',
          '#b91c1c',
          '#1c1917',
          1.1
        );
        // S-Bahn Window Ribbon along front-left face (u = 9.4)
        fillIsoPoly(
          [
            { u: 9.39, v: sv1 + 0.3, z: zUpperViaduct + 14 },
            { u: 9.39, v: sv2 - 0.3, z: zUpperViaduct + 14 },
            { u: 9.39, v: sv2 - 0.3, z: zUpperViaduct + 23 },
            { u: 9.39, v: sv1 + 0.3, z: zUpperViaduct + 23 },
          ],
          cx,
          cy,
          camZoom,
          '#1e293b',
          '#fde68a',
          0.6
        );
      }

      // ======================================================================
      // 4. ELEVATED CENTRAL CONCOURSE GALLERY BRIDGE (EBENE 0: EINKAUFSPASSAGE)
      // (Directly matching the bridge with Bakeral, Bank, Twin Escalators, and Press-shop!)
      // ======================================================================
      const zBridgeBot = 78;
      const zBridgeTop = 94;

      // Cast dark ambient shadow from the concourse bridge onto the platforms/tracks below
      fillIsoPoly(
        [
          { u: 0.2, v: -9.5, z: 16.5 },
          { u: 6.8, v: -9.5, z: 16.5 },
          { u: 6.8, v: 10.2, z: 16.5 },
          { u: 0.2, v: 10.2, z: 16.5 },
        ],
        cx,
        cy,
        camZoom,
        'rgba(10, 12, 18, 0.42)'
      );

      // Main Concourse Bridge Structural Deck
      drawPrism(
        0.5,
        7.2,
        -9.8,
        10.2,
        zBridgeBot,
        zBridgeTop,
        cx,
        cy,
        camZoom,
        '#e7e2d8',
        '#9ca3af',
        '#6b7280',
        '#1f2937',
        1.3
      );

      // Concourse Floor Tile Grid & Yellow Tactile Strip
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.25)';
      ctx.lineWidth = 0.8 * camZoom;
      for (let v = -9; v <= 9.5; v += 1.2) {
        const p1 = projectIso(0.5, v, zBridgeTop, cx, cy, camZoom);
        const p2 = projectIso(7.2, v, zBridgeTop, cx, cy, camZoom);
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();
      }

      fillIsoPoly(
        [
          { u: 2.2, v: -9.2, z: zBridgeTop + 0.5 },
          { u: 2.45, v: -9.2, z: zBridgeTop + 0.5 },
          { u: 2.45, v: 9.6, z: zBridgeTop + 0.5 },
          { u: 2.2, v: 9.6, z: zBridgeTop + 0.5 },
        ],
        cx,
        cy,
        camZoom,
        '#eab308'
      );

      // Glass Safety Balustrade along front-left edge of the concourse bridge (u = 0.5)
      fillIsoPoly(
        [
          { u: 0.5, v: -9.5, z: zBridgeTop },
          { u: 0.5, v: 10.0, z: zBridgeTop },
          { u: 0.5, v: 10.0, z: zBridgeTop + 12 },
          { u: 0.5, v: -9.5, z: zBridgeTop + 12 },
        ],
        cx,
        cy,
        camZoom,
        'rgba(186, 230, 253, 0.34)',
        '#475569',
        1.1
      );

      // Staircases descending from the Concourse Bridge down to Platforms B & C
      for (const stairV of [-2.4, 2.3]) {
        // Sloped stair ramp from u = 0.5 (z=94) down to u = -2.2 (z=16)
        fillIsoPoly(
          [
            { u: -2.2, v: stairV - 0.65, z: 16 },
            { u: -2.2, v: stairV + 0.65, z: 16 },
            { u: 0.5, v: stairV + 0.65, z: zBridgeTop },
            { u: 0.5, v: stairV - 0.65, z: zBridgeTop },
          ],
          cx,
          cy,
          camZoom,
          '#94a3b8',
          '#334155',
          1.1
        );
        // Individual stair treads
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.2 * camZoom;
        for (let s = 0; s <= 10; s++) {
          const t = s / 10;
          const su = -2.2 + t * 2.7;
          const sz = 16 + t * (zBridgeTop - 16);
          const sp1 = projectIso(su, stairV - 0.62, sz, cx, cy, camZoom);
          const sp2 = projectIso(su, stairV + 0.62, sz, cx, cy, camZoom);
          ctx.beginPath();
          ctx.moveTo(sp1.sx, sp1.sy);
          ctx.lineTo(sp2.sx, sp2.sy);
          ctx.stroke();
        }
      }

      // ======================================================================
      // 5. REALISTIC SHOPS, ESCALATORS & GLASS ELEVATORS ON THE CONCOURSE BRIDGE
      // ======================================================================

      // A. BAKERAL (Warm Bakery Storefront at v = -5.2 to -2.4, u = 4.2 to 6.8)
      drawPrism(
        4.2,
        6.9,
        -5.4,
        -2.6,
        zBridgeTop,
        zBridgeTop + 46,
        cx,
        cy,
        camZoom,
        '#78350f',
        '#fef3c7', // Warm illuminated bakery interior on front-left face!
        '#92400e',
        '#1c1917',
        1.2
      );
      // Bakery pastry counter & fascia sign
      drawPrism(
        4.0,
        4.5,
        -5.2,
        -2.8,
        zBridgeTop,
        zBridgeTop + 16,
        cx,
        cy,
        camZoom,
        '#f59e0b',
        '#b45309',
        '#78350f',
        '#1c1917',
        1.0
      );
      // Fascia header
      fillIsoPoly(
        [
          { u: 4.18, v: -5.4, z: zBridgeTop + 34 },
          { u: 4.18, v: -2.6, z: zBridgeTop + 34 },
          { u: 4.18, v: -2.6, z: zBridgeTop + 45 },
          { u: 4.18, v: -5.4, z: zBridgeTop + 45 },
        ],
        cx,
        cy,
        camZoom,
        '#78350f',
        '#451a03',
        1.0
      );
      if (labelsOn) {
        const bakPt = projectIso(4.18, -4.0, zBridgeTop + 39, cx, cy, camZoom);
        ctx.save();
        ctx.font = `700 ${Math.round(11 * camZoom)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = '#fde68a';
        ctx.textAlign = 'center';
        ctx.fillText('Bakeral', bakPt.sx, bakPt.sy);
        ctx.restore();
      }

      // B. BANK · DB REISEZENTRUM (Blue Storefront at v = -2.4 to -0.2, u = 4.2 to 6.9)
      drawPrism(
        4.2,
        6.9,
        -2.4,
        -0.1,
        zBridgeTop,
        zBridgeTop + 46,
        cx,
        cy,
        camZoom,
        '#1e3a8a',
        '#dbeafe',
        '#1d4ed8',
        '#0f172a',
        1.2
      );
      fillIsoPoly(
        [
          { u: 4.18, v: -2.4, z: zBridgeTop + 34 },
          { u: 4.18, v: -0.1, z: zBridgeTop + 34 },
          { u: 4.18, v: -0.1, z: zBridgeTop + 45 },
          { u: 4.18, v: -2.4, z: zBridgeTop + 45 },
        ],
        cx,
        cy,
        camZoom,
        '#1d4ed8',
        '#1e3a8a',
        1.0
      );
      if (labelsOn) {
        const bnkPt = projectIso(4.18, -1.25, zBridgeTop + 39, cx, cy, camZoom);
        ctx.save();
        ctx.font = `700 ${Math.round(10.5 * camZoom)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('Bank · DB', bnkPt.sx, bnkPt.sy);
        ctx.restore();
      }

      // C. TWIN ESCALATORS (Rolltreppen ascending from Concourse Bridge to Upper Stadtbahn Level)
      for (const escV of [0.5, 1.55]) {
        fillIsoPoly(
          [
            { u: 2.6, v: escV - 0.35, z: zBridgeTop },
            { u: 2.6, v: escV + 0.35, z: zBridgeTop },
            { u: 5.8, v: escV + 0.35, z: zUpperViaduct },
            { u: 5.8, v: escV - 0.35, z: zUpperViaduct },
          ],
          cx,
          cy,
          camZoom,
          '#475569',
          '#1e293b',
          1.2
        );
        // Animated escalator steps
        const stepOffset = (now * 0.003) % 1;
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.3 * camZoom;
        for (let s = 0; s < 10; s++) {
          const t = (s + stepOffset) / 10;
          const eu = 2.6 + t * 3.2;
          const ez = zBridgeTop + t * (zUpperViaduct - zBridgeTop);
          const ep1 = projectIso(eu, escV - 0.3, ez, cx, cy, camZoom);
          const ep2 = projectIso(eu, escV + 0.3, ez, cx, cy, camZoom);
          ctx.beginPath();
          ctx.moveTo(ep1.sx, ep1.sy);
          ctx.lineTo(ep2.sx, ep2.sy);
          ctx.stroke();
        }
      }

      // D. PRESS-SHOP (Iconic Crimson-Red Kiosk Pavilion at v = 2.4 to 5.4, u = 2.8 to 5.8)
      drawPrism(
        2.8,
        5.8,
        2.4,
        5.4,
        zBridgeTop,
        zBridgeTop + 44,
        cx,
        cy,
        camZoom,
        '#991b1b',
        '#fef2f2', // Bright interior book/magazine alcove
        '#b91c1c',
        '#1c1917',
        1.2
      );
      // Checkout counter inside Press-shop with clerk
      drawPrism(
        2.6,
        3.5,
        3.0,
        4.9,
        zBridgeTop,
        zBridgeTop + 15,
        cx,
        cy,
        camZoom,
        '#d97706',
        '#b45309',
        '#92400e',
        '#1c1917',
        0.9
      );
      // Red roof fascia overhang
      drawPrism(
        2.5,
        5.9,
        2.2,
        5.6,
        zBridgeTop + 34,
        zBridgeTop + 46,
        cx,
        cy,
        camZoom,
        '#7f1d1d',
        '#dc2626',
        '#991b1b',
        '#1c1917',
        1.1
      );
      if (labelsOn) {
        const prsPt = projectIso(2.5, 3.9, zBridgeTop + 39, cx, cy, camZoom);
        ctx.save();
        ctx.font = `700 ${Math.round(11 * camZoom)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('Press-shop', prsPt.sx, prsPt.sy);
        ctx.restore();
      }

      // E. APOTHEKE / BIO-MARKT (Green Storefront beside Press-shop at v = 5.6 to 7.8)
      drawPrism(
        3.8,
        6.5,
        5.6,
        7.8,
        zBridgeTop,
        zBridgeTop + 40,
        cx,
        cy,
        camZoom,
        '#065f46',
        '#d1fae5',
        '#059669',
        '#064e3b',
        1.1
      );
      if (labelsOn) {
        const apoPt = projectIso(3.8, 6.7, zBridgeTop + 34, cx, cy, camZoom);
        ctx.save();
        ctx.font = `700 ${Math.round(10 * camZoom)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = '#6ee7b7';
        ctx.textAlign = 'center';
        ctx.fillText('Apotheke', apoPt.sx, apoPt.sy);
        ctx.restore();
      }

      // F. TOWERING TRANSPARENT GLASS ELEVATOR SHAFTS (Glasaufzüge)
      const elevatorShafts = [
        { u: 3.1, v: -6.2, zBot: zBridgeTop, zTop: zBridgeTop + 125 },
        { u: 3.2, v: 0.9, zBot: zBridgeTop, zTop: zBridgeTop + 108 },
      ];
      for (let idx = 0; idx < elevatorShafts.length; idx++) {
        const el = elevatorShafts[idx];
        // Moving elevator cabin inside shaft
        const cabinZ =
          el.zBot +
          12 +
          (Math.sin(now * 0.0014 + idx * 2.1) * 0.5 + 0.5) * (el.zTop - el.zBot - 38);
        drawPrism(
          el.u - 0.48,
          el.u + 0.48,
          el.v - 0.48,
          el.v + 0.48,
          cabinZ,
          cabinZ + 22,
          cx,
          cy,
          camZoom,
          '#cbd5e1',
          '#fde68a',
          '#94a3b8',
          '#334155',
          1.0
        );

        // Translucent laminated glass shaft walls
        drawPrism(
          el.u - 0.62,
          el.u + 0.62,
          el.v - 0.62,
          el.v + 0.62,
          el.zBot,
          el.zTop,
          cx,
          cy,
          camZoom,
          'rgba(186, 230, 253, 0.38)',
          'rgba(148, 197, 235, 0.26)',
          'rgba(125, 211, 252, 0.22)',
          'rgba(71, 85, 105, 0.85)',
          1.3
        );
      }

      // Render Commuters Strolling on the Elevated Concourse Bridge
      for (let i = 0; i < 10; i++) {
        const npc = npcs[(i + 7) % npcs.length];
        const vBridge = ((npc.wy * 1.4 + i * 1.9) % 16) - 7.5;
        drawRealisticCommuter(
          1.6 + (i % 3) * 0.55,
          vBridge,
          zBridgeTop,
          npc.coatColor,
          '#0f172a',
          npc.walkPhase + now * 0.004,
          npc.hasLuggage,
          cx,
          cy,
          camZoom
        );
      }

      // ======================================================================
      // 6. FOREGROUND MONUMENTAL 3D STEEL H-BEAM COLUMNS & OVERHEAD GIRDER GRID
      // (Directly matching the foreground steel framework in the reference art!)
      // ======================================================================
      const columns = [
        { u: -7.5, v: -6.5 },
        { u: -3.2, v: -6.5 },
        { u: -5.2, v: -1.8 },
        { u: -6.5, v: 2.8 },
        { u: -1.8, v: 2.8 },
        { u: 7.5, v: -1.8 },
        { u: 2.2, v: 8.8 },
      ];
      const zGirderTop = 215;

      for (const col of columns) {
        // Warm golden architectural uplight at column base
        const basePt = projectIso(col.u, col.v, 16, cx, cy, camZoom);
        const upGlow = ctx.createRadialGradient(
          basePt.sx,
          basePt.sy,
          2,
          basePt.sx,
          basePt.sy - 14 * camZoom,
          36 * camZoom
        );
        upGlow.addColorStop(0, 'rgba(254, 243, 199, 0.85)');
        upGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.28)');
        upGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = upGlow;
        ctx.beginPath();
        ctx.arc(basePt.sx, basePt.sy - 10 * camZoom, 36 * camZoom, 0, Math.PI * 2);
        ctx.fill();

        // 3D Isometric Steel Column Shaft
        drawPrism(
          col.u - 0.34,
          col.u + 0.34,
          col.v - 0.34,
          col.v + 0.34,
          16,
          zGirderTop,
          cx,
          cy,
          camZoom,
          '#64748b',
          '#475569',
          '#334155',
          '#1e293b',
          1.2
        );
      }

      // 3D Isometric Overhead Steel Girder Beams connecting the columns
      // Beams running along `u`
      for (const gv of [-6.5, -1.8, 2.8]) {
        drawPrism(
          -10.5,
          9.5,
          gv - 0.32,
          gv + 0.32,
          zGirderTop - 12,
          zGirderTop,
          cx,
          cy,
          camZoom,
          '#64748b',
          '#475569',
          '#334155',
          '#1e293b',
          1.1
        );
      }
      // Cross-beams running along `v`
      for (const gu of [-6.5, -2.2, 7.5]) {
        drawPrism(
          gu - 0.32,
          gu + 0.32,
          -9.5,
          6.5,
          zGirderTop - 12,
          zGirderTop,
          cx,
          cy,
          camZoom,
          '#64748b',
          '#475569',
          '#334155',
          '#1e293b',
          1.1
        );
      }

      // Diegetic Storefront Signage Badges (rendered on top of geometry so never occluded)
      const shopSigns = [
        { u: 4.1, v: -4.0, z: zBridgeTop + 40, text: 'Bakeral', bg: '#78350f', fg: '#fde68a' },
        { u: 4.1, v: -1.25, z: zBridgeTop + 40, text: 'Bank · DB', bg: '#1e3a8a', fg: '#ffffff' },
        { u: 2.6, v: 3.9, z: zBridgeTop + 42, text: 'Press-shop', bg: '#991b1b', fg: '#ffffff' },
        { u: 3.8, v: 6.7, z: zBridgeTop + 36, text: 'Apotheke', bg: '#065f46', fg: '#a7f3d0' },
      ];
      for (const s of shopSigns) {
        const pt = projectIso(s.u, s.v, s.z, cx, cy, camZoom);
        ctx.save();
        ctx.font = `700 ${Math.round(10 * camZoom)}px "Plus Jakarta Sans", sans-serif`;
        const tw = ctx.measureText(s.text).width + 10 * camZoom;
        const th = 15 * camZoom;
        ctx.fillStyle = s.bg;
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.lineWidth = 1;
        ctx.fillRect(pt.sx - tw * 0.5, pt.sy - th * 0.5, tw, th);
        ctx.strokeRect(pt.sx - tw * 0.5, pt.sy - th * 0.5, tw, th);
        ctx.fillStyle = s.fg;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.text, pt.sx, pt.sy);
        ctx.restore();
      }

      ctx.restore();
      scheduleNextFrame();
    };

    renderFrame(performance.now());

    return () => {
      isDisposed = true;
      window.clearTimeout(timerId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full overflow-hidden select-none bg-zinc-900"
    >
      <canvas
        ref={canvasRef}
        data-testid="realistic-station-canvas"
        className="block w-full h-full cursor-grab active:cursor-grabbing"
      />
    </div>
  );
};
