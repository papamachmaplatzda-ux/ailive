/**
 * CITY ENGINE — procedural realistic E0 scene
 *
 * Draws the Berlin Hbf ground floor — Europaplatz (NW), Haupthalle (center),
 * Washingtonplatz (SE) — as a high-detail isometric plate for the "realistic"
 * asset tier.  Live overlays (bus headlights, taxi lights, revolving doors,
 * crowd, elevators) are drawn on top by the canvas component; this is the
 * static background only.
 *
 * Composition matches the reference image so existing overlay positions
 * (bus headlights at NW, taxi headlights at SE, revolving doors at entrances)
 * align with the static elements here.
 */

// === Constants ===

const TILE_W = 80;
const TILE_H = 40;

const C = {
  bgTop: '#1a1d24',
  bgBot: '#262932',
  hallFloor: '#c8c4bc',
  hallGrout: '#a0aca4',
  road: '#3a3d44',
  roadLine: '#c4a430',
  atriumVoid: '#0e1018',
  glassFrame: 'rgba(100, 140, 180, 0.55)',
  dbRed: '#c4202e',
  dbRedDark: '#9a1820',
  bakeryFloor: '#e8d5b0',
  bakeryWall: '#d4a843',
  foodFloor: '#f0d8c0',
  foodWall: '#c45e3a',
  cafeFloor: '#e8e0c0',
  cafeWall: '#8b6914',
  bvgYellow: '#f2a900',
  bvgDark: '#c48600',
  taxiBody: '#d4b838',
  taxiDark: '#a89220',
  treeLight: '#4a7c3a',
  treeDark: '#3a6028',
  treeTrunk: '#5d4e3a',
};

// === Projection ===

type Proj = (tx: number, ty: number, elev?: number) => { x: number; y: number };

function makeProj(cx: number, cy: number): Proj {
  return (tx, ty, elev = 0) => ({
    x: cx + (tx - ty) * TILE_W * 0.5,
    y: cy + (tx + ty) * TILE_H * 0.5 - elev,
  });
}

// === Helpers ===

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function shade(hex: string, f: number): string {
  const c = parseHex(hex);
  return `rgb(${Math.round(c.r * f)}, ${Math.round(c.g * f)}, ${Math.round(c.b * f)})`;
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function fillPoly(
  ctx: CanvasRenderingContext2D,
  pts: { x: number; y: number }[],
  fill?: string | CanvasGradient,
  stroke?: string,
  lw?: number
) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  if (fill !== undefined) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw ?? 1;
    ctx.stroke();
  }
}

function softShadow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, rx: number, ry: number, alpha: number
) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  g.addColorStop(0, `rgba(8, 10, 16, ${alpha})`);
  g.addColorStop(1, 'rgba(8, 10, 16, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function isoDiamond(
  ctx: CanvasRenderingContext2D,
  proj: Proj,
  tx: number, ty: number,
  color: string
) {
  fillPoly(ctx, [proj(tx, ty), proj(tx + 1, ty), proj(tx + 1, ty + 1), proj(tx, ty + 1)], color);
}

function texturedFloor(
  ctx: CanvasRenderingContext2D,
  proj: Proj,
  tx1: number, ty1: number, tx2: number, ty2: number,
  baseHex: string, variation: number, groutHex?: string
) {
  const base = parseHex(baseHex);
  for (let tx = tx1; tx < tx2; tx++) {
    for (let ty = ty1; ty < ty2; ty++) {
      const n = ((tx * 73 + ty * 137 + 17) % 100) / 100;
      const v = 1 + (n - 0.5) * variation;
      isoDiamond(ctx, proj, tx, ty,
        `rgb(${clampByte(base.r * v)},${clampByte(base.g * v)},${clampByte(base.b * v)})`);
    }
  }
  if (groutHex) {
    ctx.strokeStyle = groutHex;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let tx = tx1; tx <= tx2; tx++) {
      const a = proj(tx, ty1), b = proj(tx, ty2);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    }
    for (let ty = ty1; ty <= ty2; ty++) {
      const a = proj(tx1, ty), b = proj(tx2, ty);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
  }
}

function isoBox(
  ctx: CanvasRenderingContext2D,
  proj: Proj,
  tx: number, ty: number, tw: number, td: number, h: number,
  topC: string, leftC: string, rightC: string
) {
  const p1 = proj(tx, ty), p2 = proj(tx + tw, ty);
  const p3 = proj(tx + tw, ty + td), p4 = proj(tx, ty + td);
  fillPoly(ctx, [p4, p3, { x: p3.x, y: p3.y - h }, { x: p4.x, y: p4.y - h }], leftC);
  fillPoly(ctx, [p3, p2, { x: p2.x, y: p2.y - h }, { x: p3.x, y: p3.y - h }], rightC);
  fillPoly(ctx, [
    { x: p1.x, y: p1.y - h }, { x: p2.x, y: p2.y - h },
    { x: p3.x, y: p3.y - h }, { x: p4.x, y: p4.y - h },
  ], topC);
}

// === Feature Renderers ===

function drawDbKiosk(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const rx = 24 * s, ry = 12 * s, h = 30 * s;
  softShadow(ctx, x, y + ry * 0.4, rx * 1.3, ry * 0.8, 0.35);
  ctx.fillStyle = C.dbRedDark;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI);
  ctx.lineTo(x + rx, y - h);
  ctx.ellipse(x, y - h, rx, ry, 0, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.dbRed;
  ctx.beginPath();
  ctx.ellipse(x, y - h, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 80, 80, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x - rx * 0.3, y - h, rx * 0.5, ry * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${10 * s}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DB', x, y - h * 0.5);
}

function drawElevatorShaft(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const w = 14 * s, h = 85 * s;
  softShadow(ctx, x, y + 3 * s, w * 1.5, 6 * s, 0.2);
  const g = ctx.createLinearGradient(x - w, y, x + w, y);
  g.addColorStop(0, 'rgba(120, 170, 210, 0.28)');
  g.addColorStop(0.5, 'rgba(150, 200, 230, 0.12)');
  g.addColorStop(1, 'rgba(120, 170, 210, 0.22)');
  ctx.fillStyle = g;
  ctx.fillRect(x - w, y - h, w * 2, h);
  ctx.strokeStyle = 'rgba(100, 140, 180, 0.55)';
  ctx.lineWidth = 1.5 * s;
  ctx.strokeRect(x - w, y - h, w * 2, h);
  ctx.lineWidth = 1 * s;
  for (let i = 1; i < 6; i++) {
    const ly = y - h * (i / 6);
    ctx.beginPath();
    ctx.moveTo(x - w, ly);
    ctx.lineTo(x + w, ly);
    ctx.stroke();
  }
}

function drawGlassWall(
  ctx: CanvasRenderingContext2D,
  proj: Proj,
  tx: number, ty1: number, ty2: number,
  wallH: number, s: number
) {
  const p1 = proj(tx, ty1), p2 = proj(tx, ty2);
  const pts = [p1, p2, { x: p2.x, y: p2.y - wallH }, { x: p1.x, y: p1.y - wallH }];
  const g = ctx.createLinearGradient(p1.x, p1.y, p1.x, p1.y - wallH);
  g.addColorStop(0, 'rgba(140, 180, 215, 0.20)');
  g.addColorStop(0.5, 'rgba(160, 200, 230, 0.10)');
  g.addColorStop(1, 'rgba(130, 170, 205, 0.16)');
  fillPoly(ctx, pts, g);
  fillPoly(ctx, pts, undefined, C.glassFrame, 1.5 * s);
  // Vertical mullions
  const segs = Math.max(2, Math.floor(Math.abs(ty2 - ty1) / 1.5));
  ctx.strokeStyle = 'rgba(120, 150, 190, 0.35)';
  ctx.lineWidth = 1 * s;
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const mx = p1.x + (p2.x - p1.x) * t;
    const my = p1.y + (p2.y - p1.y) * t;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx, my - wallH);
    ctx.stroke();
  }
  // Horizontal frame
  for (let i = 1; i < 3; i++) {
    const ly = -wallH * (i / 3);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y + ly);
    ctx.lineTo(p2.x, p2.y + ly);
    ctx.stroke();
  }
}

function drawRevolvingDoor(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  softShadow(ctx, x, y, 8 * s, 5 * s, 0.2);
  ctx.fillStyle = 'rgba(160, 200, 230, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y, 8 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 160, 200, 0.5)';
  ctx.lineWidth = 1 * s;
  ctx.stroke();
}

function drawCutawayShop(
  ctx: CanvasRenderingContext2D,
  proj: Proj,
  tx1: number, ty1: number, tx2: number, ty2: number,
  floorHex: string, wallHex: string,
  signText: string, signHex: string, s: number
) {
  const wallH = 36 * s;
  texturedFloor(ctx, proj, tx1, ty1, tx2, ty2, floorHex, 0.03);
  const pBL = proj(tx1, ty2), pTL = proj(tx1, ty1);
  const pTR = proj(tx2, ty1), pBR = proj(tx2, ty2);
  // Left back wall
  fillPoly(ctx, [pBL, pTL, { x: pTL.x, y: pTL.y - wallH }, { x: pBL.x, y: pBL.y - wallH }],
    wallHex, '#1a1d24', 1);
  // Right back wall (darker)
  fillPoly(ctx, [pTL, pTR, { x: pTR.x, y: pTR.y - wallH }, { x: pTL.x, y: pTL.y - wallH }],
    shade(wallHex, 0.82), '#1a1d24', 1);
  // Warm interior glow
  fillPoly(ctx, [pBL, pTL, pTR, pBR], 'rgba(255, 220, 150, 0.07)');
  // Sign
  const mx = (pTL.x + pTR.x) * 0.5;
  const my = (pTL.y + pTR.y) * 0.5 - wallH * 0.72;
  ctx.fillStyle = signHex;
  ctx.fillRect(mx - 28 * s, my - 6 * s, 56 * s, 12 * s);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${7 * s}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(signText, mx, my);
}

function drawIsoVehicle(
  ctx: CanvasRenderingContext2D,
  proj: Proj,
  tx: number, ty: number,
  len: number, wid: number, h: number,
  topC: string, leftC: string, rightC: string,
  hasWindows: boolean, s: number
) {
  const p = proj(tx, ty);
  softShadow(ctx, p.x, p.y, len * TILE_W * 0.35, wid * TILE_H * 0.35, 0.3);
  isoBox(ctx, proj, tx - len * 0.5, ty - wid * 0.5, len, wid, h, topC, leftC, rightC);
  if (hasWindows) {
    const p1 = proj(tx - len * 0.5, ty - wid * 0.5);
    const p2 = proj(tx + len * 0.5, ty - wid * 0.5);
    const p3 = proj(tx + len * 0.5, ty + wid * 0.5);
    const p4 = proj(tx - len * 0.5, ty + wid * 0.5);
    const inset = 2 * s;
    fillPoly(ctx, [
      { x: p1.x + inset, y: p1.y - h + 1 },
      { x: p2.x - inset, y: p2.y - h + 1 },
      { x: p3.x - inset, y: p3.y - h + 1 },
      { x: p4.x + inset, y: p4.y - h + 1 },
    ], 'rgba(180, 220, 240, 0.5)');
  }
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  softShadow(ctx, x, y + 2 * s, 13 * s, 6 * s, 0.25);
  ctx.fillStyle = C.treeTrunk;
  ctx.fillRect(x - 2 * s, y - 16 * s, 4 * s, 16 * s);
  ctx.fillStyle = C.treeDark;
  ctx.beginPath();
  ctx.arc(x, y - 22 * s, 12 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.treeLight;
  ctx.beginPath();
  ctx.arc(x - 3 * s, y - 26 * s, 8 * s, 0, Math.PI * 2);
  ctx.fill();
}

// === Main Render ===

export function renderE0Realistic(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const cx = width * 0.5;
  const cy = height * 0.46;
  const proj = makeProj(cx, cy);
  const s = TILE_W / 40; // scale features proportional to tile size

  // 1. Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, C.bgTop);
  bg.addColorStop(1, C.bgBot);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // 2. Outdoor roads
  texturedFloor(ctx, proj, -12, -9.5, -8.5, 3, C.road, 0.02);
  texturedFloor(ctx, proj, 8.5, -3, 12, 9.5, C.road, 0.02);
  // Road lane markings
  ctx.strokeStyle = C.roadLine;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 6]);
  for (const [tx1, ty, tx2] of [[-12, -3.25, -8.5], [8.5, 3.25, 12]] as const) {
    const a = proj(tx1, ty), b = proj(tx2, ty);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // 3. Main hall floor (textured stone with grout)
  texturedFloor(ctx, proj, -8.5, -7.5, 8.5, 7.5, C.hallFloor, 0.04, C.hallGrout);

  // 4. Atrium void + railing
  texturedFloor(ctx, proj, -3.2, -1.8, 3.2, 1.8, C.atriumVoid, 0.01);
  ctx.strokeStyle = 'rgba(150, 195, 225, 0.55)';
  ctx.lineWidth = 2;
  const a1 = proj(-3.2, -1.8), a2 = proj(3.2, -1.8);
  const a3 = proj(3.2, 1.8), a4 = proj(-3.2, 1.8);
  ctx.beginPath();
  ctx.moveTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y);
  ctx.lineTo(a3.x, a3.y); ctx.lineTo(a4.x, a4.y);
  ctx.closePath(); ctx.stroke();

  // 5. Escalators in atrium
  ctx.strokeStyle = 'rgba(120, 140, 160, 0.5)';
  ctx.lineWidth = 3 * s;
  for (const off of [-1.5, 1.5] as const) {
    const e1 = proj(off - 0.6, -1), e2 = proj(off + 0.6, 1);
    ctx.beginPath();
    ctx.moveTo(e1.x, e1.y);
    ctx.lineTo(e2.x, e2.y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(200, 200, 210, 0.15)';
  for (const off of [-1.5, 1.5] as const) {
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const p = proj(off - 0.6 + t * 1.2, -1 + t * 2);
      ctx.fillRect(p.x - 3 * s, p.y - 1 * s, 6 * s, 2 * s);
    }
  }

  // 6. NW glass curtain wall (Europaplatz entrance)
  drawGlassWall(ctx, proj, -8.4, -7.5, 7.5, 55 * s, s);
  for (const ty of [-4.5, -2.5, -0.5] as const) {
    drawRevolvingDoor(ctx, proj(-8.2, ty).x, proj(-8.2, ty).y, s);
  }

  // 7. SE glass curtain wall (Washingtonplatz entrance)
  drawGlassWall(ctx, proj, 8.4, -7.5, 7.5, 55 * s, s);
  for (const ty of [0.5, 2.5, 4.5] as const) {
    drawRevolvingDoor(ctx, proj(8.2, ty).x, proj(8.2, ty).y, s);
  }

  // 8. Cutaway shops with warm interiors
  drawCutawayShop(ctx, proj, -8, -7, -2.5, -3.5, C.bakeryFloor, C.bakeryWall, 'Bakeral', '#92400e', s);
  drawCutawayShop(ctx, proj, 2.5, -7, 8, -2.5, C.foodFloor, C.foodWall, 'Food Court', '#9a3412', s);
  drawCutawayShop(ctx, proj, -8, 2.5, -2.5, 7, C.cafeFloor, C.cafeWall, 'Kaffee', '#854d0e', s);

  // 9. Warm light spill from shops onto hall floor
  for (const [tx, ty, r] of [[-5, -5, 180], [5, -5, 180], [-5, 5, 180]] as const) {
    const p = proj(tx, ty);
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * s);
    g.addColorStop(0, 'rgba(255, 220, 150, 0.08)');
    g.addColorStop(1, 'rgba(255, 220, 150, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(p.x - r * s, p.y - r * s, r * s * 2, r * s * 2);
  }

  // 10. DB info kiosks (2 red cylinders)
  drawDbKiosk(ctx, proj(-3.6, -1.0).x, proj(-3.6, -1.0).y, s);
  drawDbKiosk(ctx, proj(-2.0, 2.6).x, proj(-2.0, 2.6).y, s);

  // 11. Glass elevator shafts (2 towers)
  drawElevatorShaft(ctx, proj(-0.4, -0.5).x, proj(-0.4, -0.5).y, s);
  drawElevatorShaft(ctx, proj(0.9, 0.5).x, proj(0.9, 0.5).y, s);

  // 12. BVG buses on Europaplatz road
  drawIsoVehicle(ctx, proj, -10.5, -4, 1, 4, 22 * s, C.bvgYellow, C.bvgDark, shade(C.bvgDark, 0.7), true, s);
  drawIsoVehicle(ctx, proj, -10.5, 1, 1, 3, 20 * s, C.bvgYellow, C.bvgDark, shade(C.bvgDark, 0.7), true, s);

  // 13. Taxis on Washingtonplatz road
  drawIsoVehicle(ctx, proj, 10.2, 3, 1, 2, 16 * s, C.taxiBody, C.taxiDark, shade(C.taxiDark, 0.7), true, s);
  drawIsoVehicle(ctx, proj, 10.2, 6, 1, 2, 16 * s, C.taxiBody, C.taxiDark, shade(C.taxiDark, 0.7), true, s);

  // 14. Trees at plazas entrances
  for (const [tx, ty] of [[-11, -8], [-11, 2], [11, -1], [11, 8]] as const) {
    drawTree(ctx, proj(tx, ty).x, proj(tx, ty).y, s);
  }

  // 15. Cool light wash from NW entrance
  const nwP = proj(-8, -3);
  const nwG = ctx.createRadialGradient(nwP.x, nwP.y, 0, nwP.x, nwP.y, 350 * s);
  nwG.addColorStop(0, 'rgba(180, 210, 240, 0.06)');
  nwG.addColorStop(1, 'rgba(180, 210, 240, 0)');
  ctx.fillStyle = nwG;
  ctx.fillRect(0, 0, width, height);

  // 16. Warm light from SE entrance
  const seP = proj(8, 3);
  const seG = ctx.createRadialGradient(seP.x, seP.y, 0, seP.x, seP.y, 350 * s);
  seG.addColorStop(0, 'rgba(255, 230, 180, 0.05)');
  seG.addColorStop(1, 'rgba(255, 230, 180, 0)');
  ctx.fillStyle = seG;
  ctx.fillRect(0, 0, width, height);
}
