/**
 * CITY MAP — the open-world overview.
 *
 * Renders the whole city at once: districts as isometric footprints, venues on
 * top of them. Playable venues pulse and can be entered; planned venues are
 * visible but locked, which is how the city grows place by place.
 *
 * It is fully data-driven — adding a district or venue to `berlinCity.ts` makes
 * it appear here, selectable, with no changes to this file.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Building2, MapPin, Compass } from 'lucide-react';
import { Camera } from '../engine/camera';
import { atmosphereForMinutes } from '../engine/atmosphere';
import { drawIsometricGrid } from '../engine/render/primitives';
import { CityDef, RenderQuality, VenueDef } from '../engine/types';
import { BERLIN_CITY } from '../world/berlinCity';
import { cityStats, getDistrictOfVenue, listVenues } from '../world/registry';

interface CityMapCanvasProps {
  city?: CityDef;
  renderQuality: RenderQuality;
  minutesRef: React.MutableRefObject<number>;
  activeVenueId?: string | null;
  onEnterVenue: (venueId: string) => void;
}

interface ProjectedVenue {
  venue: VenueDef;
  points: { x: number; y: number }[];
  cx: number;
  cy: number;
}

const WORLD_PAD = 4;

export const CityMapCanvas: React.FC<CityMapCanvasProps> = ({
  city = BERLIN_CITY,
  renderQuality,
  minutesRef,
  activeVenueId,
  onEnterVenue,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraRef = useRef<Camera>(new Camera());
  const hoveredRef = useRef<string | null>(null);
  const projectedRef = useRef<ProjectedVenue[]>([]);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 });
  const [hovered, setHovered] = useState<VenueDef | null>(null);

  const venues = listVenues(city);
  const stats = cityStats(city);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (time: number) => {
      const w = canvas.width;
      const h = canvas.height;
      const nowSec = time / 1000;
      const atmos = atmosphereForMinutes(minutesRef.current);

      drawIsometricGrid(ctx, w, h, 34 * dpr, '#2f343d');

      const bw = city.bounds.w + WORLD_PAD * 2;
      const bh = city.bounds.h + WORLD_PAD * 2;
      const scale = Math.min(w / ((bw + bh) * 0.5), h / ((bw + bh) * 0.25)) * 0.92 * cameraRef.current.zoom;
      const originX = w * 0.5 + cameraRef.current.x;
      const originY = h * 0.52 + cameraRef.current.y;

      const project = (x: number, y: number) => ({
        x: originX + (x - y - (city.bounds.w - city.bounds.h) * 0.5) * 0.5 * scale,
        y: originY + (x + y - (city.bounds.w + city.bounds.h) * 0.5) * 0.25 * scale,
      });

      const quad = (x: number, y: number, qw: number, qh: number) => [
        project(x, y),
        project(x + qw, y),
        project(x + qw, y + qh),
        project(x, y + qh),
      ];

      const tracePath = (points: { x: number; y: number }[]) => {
        ctx.beginPath();
        points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();
      };

      // --- Spree: the city's spine, drawn as a soft band under the districts ---
      const spreePath = [
        project(-2, 34),
        project(18, 33),
        project(38, 33.5),
        project(56, 35),
        project(74, 31),
        project(96, 26),
        project(102, 25),
      ];
      ctx.strokeStyle = 'rgba(56, 130, 178, 0.5)';
      ctx.lineWidth = 16 * dpr;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      spreePath.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.22)';
      ctx.lineWidth = 4 * dpr;
      ctx.stroke();

      // --- Districts ---
      for (const district of city.districts) {
        const pts = quad(district.map.x, district.map.y, district.map.w, district.map.h);
        tracePath(pts);
        ctx.fillStyle = hexAlpha(district.color, 0.1);
        ctx.fill();
        ctx.strokeStyle = hexAlpha(district.color, 0.55);
        ctx.lineWidth = 1.6 * dpr;
        ctx.stroke();

        // District label above the north corner.
        const labelPt = project(district.map.x + district.map.w * 0.5, district.map.y);
        ctx.font = `600 ${Math.round(10 * dpr)}px ui-monospace, monospace`;
        ctx.textAlign = 'center';
        const label = district.name.toUpperCase();
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(17, 22, 30, 0.82)';
        ctx.fillRect(labelPt.x - tw * 0.5 - 6 * dpr, labelPt.y - 20 * dpr, tw + 12 * dpr, 14 * dpr);
        ctx.fillStyle = hexAlpha(district.color, 0.95);
        ctx.fillText(label, labelPt.x, labelPt.y - 10 * dpr);
      }

      // --- Venues ---
      const projected: ProjectedVenue[] = [];
      for (const venue of venues) {
        const pts = quad(venue.map.x, venue.map.y, venue.map.w, venue.map.h);
        const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        const isHovered = hoveredRef.current === venue.id;
        const playable = venue.status === 'playable';

        // Extruded side for a physical footprint.
        ctx.fillStyle = playable ? hexAlpha(venue.palette.base, 0.55) : 'rgba(30, 38, 50, 0.6)';
        const sideH = (playable ? 10 : 5) * dpr;
        for (let i = 0; i < 4; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % 4];
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.lineTo(b.x, b.y + sideH);
          ctx.lineTo(a.x, a.y + sideH);
          ctx.closePath();
          ctx.fill();
        }

        tracePath(pts);
        ctx.fillStyle = playable
          ? hexAlpha(venue.palette.base, isHovered ? 0.92 : 0.72)
          : hexAlpha(venue.palette.base, isHovered ? 0.4 : 0.22);
        ctx.fill();

        if (playable) {
          const pulse = 0.55 + 0.45 * Math.sin(nowSec * 2.4);
          ctx.strokeStyle = hexAlpha(venue.palette.accent, isHovered ? 1 : 0.5 + pulse * 0.5);
          ctx.lineWidth = (isHovered ? 3 : 2.2) * dpr;
        } else {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
          ctx.lineWidth = 1.2 * dpr;
          ctx.setLineDash([5 * dpr, 4 * dpr]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Marker + name.
        ctx.font = `700 ${Math.round((playable ? 10.5 : 9) * dpr)}px ui-monospace, monospace`;
        ctx.textAlign = 'center';
        const name = venue.shortName.toUpperCase();
        const nameW = ctx.measureText(name).width;
        ctx.fillStyle = playable ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(cx - nameW * 0.5 - 6 * dpr, cy - 8 * dpr, nameW + 12 * dpr, 15 * dpr);
        ctx.fillStyle = playable ? '#f8fafc' : '#94a3b8';
        ctx.fillText(name, cx, cy + 3 * dpr);

        if (playable) {
          const beacon = (nowSec * 0.9) % 1;
          ctx.strokeStyle = hexAlpha(venue.palette.accent, (1 - beacon) * 0.7);
          ctx.lineWidth = 1.6 * dpr;
          ctx.beginPath();
          ctx.arc(cx, cy, (8 + beacon * 26) * dpr, 0, Math.PI * 2);
          ctx.stroke();
        }

        projected.push({ venue, points: pts, cx, cy });
      }
      projectedRef.current = projected;

      // --- Atmosphere: same lighting model as the venues ---
      if (renderQuality !== 'raw' && atmos.tintAlpha > 0.001) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = atmos.tintAlpha * 0.85;
        ctx.fillStyle = atmos.tint;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [city, renderQuality, minutesRef]);

  /** Hit-test against the projected venue quads. */
  const findVenueAt = (clientX: number, clientY: number): VenueDef | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    for (const p of projectedRef.current) {
      const minX = Math.min(...p.points.map((pt) => pt.x));
      const maxX = Math.max(...p.points.map((pt) => pt.x));
      const minY = Math.min(...p.points.map((pt) => pt.y));
      const maxY = Math.max(...p.points.map((pt) => pt.y));
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) return p.venue;
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const hit = findVenueAt(e.clientX, e.clientY);
    const nextId = hit?.id ?? null;
    if (hoveredRef.current !== nextId) {
      hoveredRef.current = nextId;
      setHovered(hit);
    }
    if (dragRef.current.active) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cameraRef.current.setPan(
        dragRef.current.origX + (e.clientX - dragRef.current.startX) * dpr,
        dragRef.current.origY + (e.clientY - dragRef.current.startY) * dpr
      );
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: cameraRef.current.x,
      origY: cameraRef.current.y,
    };
  };

  const handleMouseUp = () => {
    dragRef.current.active = false;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const hit = findVenueAt(e.clientX, e.clientY);
    if (hit && hit.status === 'playable') onEnterVenue(hit.id);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    cameraRef.current.zoomBy(e.deltaY < 0 ? 1.1 : 0.9, 0.7, 2.4);
  };

  return (
    <div className="absolute inset-0">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          hoveredRef.current = null;
          setHovered(null);
        }}
        onClick={handleClick}
        onWheel={handleWheel}
        className="block w-full h-full cursor-pointer select-none"
      />

      {/* Hover card for the venue under the pointer */}
      {hovered && (
        <div className="fixed left-3 bottom-3 z-20 max-w-sm bg-[#1f232a]/95 backdrop-blur-md border border-[#4b5262] rounded p-2.5 shadow-xl pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            {hovered.status === 'playable' ? (
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Compass className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className="text-xs font-mono font-bold text-white">{hovered.name}</span>
            <span
              className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded ${
                hovered.status === 'playable'
                  ? 'bg-amber-500/25 text-amber-200'
                  : 'bg-slate-700/60 text-slate-300'
              }`}
            >
              {hovered.status === 'playable' ? 'BETRETBAR' : 'IN PLANUNG'}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">{hovered.summary}</p>
          <div className="mt-1 text-[10px] font-mono text-slate-500">
            {getDistrictOfVenue(hovered.id)?.name} · {hovered.kind}
            {hovered.scenes.length > 0 ? ` · ${hovered.scenes.length} Ebenen` : ''}
          </div>
        </div>
      )}

      {/* City stats strip */}
      <div className="fixed left-3 top-12 z-20 bg-[#1f232a]/92 backdrop-blur-md border border-[#4b5262] rounded p-2.5 shadow-xl pointer-events-none">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-xs font-mono font-bold text-white">{city.name}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] font-mono text-slate-300">
          <span>Bezirke</span>
          <span className="text-right text-slate-100">{stats.districts}</span>
          <span>Orte</span>
          <span className="text-right text-slate-100">{stats.venues}</span>
          <span>Betretbar</span>
          <span className="text-right text-amber-300">{stats.playable}</span>
          <span>Ebenen</span>
          <span className="text-right text-slate-100">{stats.scenes}</span>
        </div>
        <div className="mt-1.5 text-[10px] font-mono text-slate-500">
          Ort anklicken · Ziehen zum Verschieben · Scrollen zum Zoomen
        </div>
      </div>
    </div>
  );
};

/** `#rrggbb` + alpha → `rgba(...)`. */
function hexAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
