/**
 * CITY ENGINE — drawing primitives
 *
 * Small, dependency-free canvas primitives shared by every venue renderer:
 * the blueprint grid, iso boxes/cylinders (architecture) and the vehicle and
 * commuter sprites used by the simulation. Extracted from the old monolithic
 * station canvas so new scenes can reuse them unchanged.
 */

export interface Pt {
  x: number;
  y: number;
}

/** The 2:1 isometric slate grid that all plates sit on. */
export function drawIsometricGrid(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  tileW: number = 36,
  bg: string = '#3b4049'
) {
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);

  const diagSpan = Math.ceil((w + h * 2) / tileW) + 8;
  c.strokeStyle = '#2e323b';
  c.lineWidth = 1;
  c.beginPath();
  for (let i = -diagSpan; i <= diagSpan; i++) {
    const startX1 = i * tileW;
    c.moveTo(startX1, 0);
    c.lineTo(startX1 + h * 2, h);

    const startX2 = i * tileW;
    c.moveTo(startX2, 0);
    c.lineTo(startX2 - h * 2, h);
  }
  c.stroke();
}

/** An isometric prism block. */
export function drawIsoBox(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  wIso: number,
  dIso: number,
  hPx: number,
  topColor: string,
  leftColor: string,
  rightColor: string,
  strokeColor: string = '#1e2229'
) {
  const pTop = { x: cx, y: cy - hPx };
  const pRight = { x: cx + wIso, y: cy + wIso * 0.5 - hPx };
  const pBottom = { x: cx + wIso - dIso, y: cy + (wIso + dIso) * 0.5 - hPx };
  const pLeft = { x: cx - dIso, y: cy + dIso * 0.5 - hPx };

  c.fillStyle = leftColor;
  c.beginPath();
  c.moveTo(pLeft.x, pLeft.y);
  c.lineTo(pBottom.x, pBottom.y);
  c.lineTo(pBottom.x, pBottom.y + hPx);
  c.lineTo(pLeft.x, pLeft.y + hPx);
  c.closePath();
  c.fill();
  c.strokeStyle = strokeColor;
  c.lineWidth = 1;
  c.stroke();

  c.fillStyle = rightColor;
  c.beginPath();
  c.moveTo(pBottom.x, pBottom.y);
  c.lineTo(pRight.x, pRight.y);
  c.lineTo(pRight.x, pRight.y + hPx);
  c.lineTo(pBottom.x, pBottom.y + hPx);
  c.closePath();
  c.fill();
  c.stroke();

  c.fillStyle = topColor;
  c.beginPath();
  c.moveTo(pTop.x, pTop.y);
  c.lineTo(pRight.x, pRight.y);
  c.lineTo(pBottom.x, pBottom.y);
  c.lineTo(pLeft.x, pLeft.y);
  c.closePath();
  c.fill();
  c.stroke();
}

/** An isometric cylinder — the iconic red DB info rondells, revolving doors, kiosks. */
export function drawIsoCylinder(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  hPx: number,
  topColor: string,
  bodyColor: string,
  bandColor?: string,
  label?: string
) {
  c.fillStyle = 'rgba(0,0,0,0.28)';
  c.beginPath();
  c.ellipse(cx + 3, cy + 4, rx * 1.04, ry * 1.04, 0, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = bodyColor;
  c.beginPath();
  c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI);
  c.lineTo(cx - rx, cy - hPx);
  c.ellipse(cx, cy - hPx, rx, ry, 0, Math.PI, 0, true);
  c.closePath();
  c.fill();
  c.strokeStyle = '#1e2229';
  c.lineWidth = 1.2;
  c.stroke();

  if (bandColor) {
    c.fillStyle = bandColor;
    c.beginPath();
    c.ellipse(cx, cy - hPx * 0.35, rx * 0.99, ry * 0.99, 0, 0, Math.PI);
    c.lineTo(cx - rx * 0.99, cy - hPx * 0.72);
    c.ellipse(cx, cy - hPx * 0.72, rx * 0.99, ry * 0.99, 0, Math.PI, 0, true);
    c.closePath();
    c.fill();
  }

  c.fillStyle = topColor;
  c.beginPath();
  c.ellipse(cx, cy - hPx, rx * 1.05, ry * 1.05, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  if (label) {
    c.fillStyle = '#ffffff';
    c.font = 'bold 9px sans-serif';
    c.textAlign = 'center';
    c.fillText(label, cx, cy - hPx + 3);
  }
}

export type VehicleStyle = 'ICE' | 'REGIO' | 'UBAHN_U5' | 'BVG_BUS' | 'TAXI';

export interface VehiclePalette {
  body: string;
  roof: string;
  stripe: string;
  window: string;
  label: string;
}

export const VEHICLE_PALETTES: Record<VehicleStyle, VehiclePalette> = {
  ICE: { body: '#f1f5f9', roof: '#e2e8f0', stripe: '#dc2626', window: '#1e293b', label: '#38bdf8' },
  REGIO: { body: '#c83e3b', roof: '#94a3b8', stripe: '#f8fafc', window: '#1e293b', label: '#ef4444' },
  UBAHN_U5: { body: '#eab308', roof: '#ca8a04', stripe: '#1e293b', window: '#1e293b', label: '#facc15' },
  BVG_BUS: { body: '#facc15', roof: '#fef08a', stripe: '#334155', window: '#1e293b', label: '#facc15' },
  TAXI: { body: '#fde047', roof: '#facc15', stripe: '#1e293b', window: '#1e293b', label: '#facc15' },
};

/** An isometric train/bus/taxi along a screen-space vector. */
export function drawVehicle(
  c: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness: number,
  height: number,
  style: VehicleStyle,
  label: string,
  nowSec: number,
  showLabels: boolean
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 4) return;

  const nx = -dy / len;
  const ny = dx / len;
  const wx = nx * thickness;
  const wy = ny * thickness * 0.65;

  const palette = VEHICLE_PALETTES[style];
  const bodyFill = palette.body;
  const roofFill = palette.roof;
  const stripeFill = palette.stripe;
  const windowFill = palette.window;

  c.fillStyle = 'rgba(0, 0, 0, 0.32)';
  c.beginPath();
  c.moveTo(x1 + 3, y1 + 5);
  c.lineTo(x2 + 3, y2 + 5);
  c.lineTo(x2 + wx + 3, y2 + wy + 5);
  c.lineTo(x1 + wx + 3, y1 + wy + 5);
  c.closePath();
  c.fill();

  c.fillStyle = bodyFill;
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.lineTo(x2, y2 - height);
  c.lineTo(x1, y1 - height);
  c.closePath();
  c.fill();
  c.strokeStyle = '#1e2229';
  c.lineWidth = 1.2;
  c.stroke();

  c.fillStyle = stripeFill;
  c.beginPath();
  c.moveTo(x1, y1 - height * 0.32);
  c.lineTo(x2, y2 - height * 0.32);
  c.lineTo(x2, y2 - height * 0.48);
  c.lineTo(x1, y1 - height * 0.48);
  c.closePath();
  c.fill();

  const segments = style === 'TAXI' ? 2 : style === 'BVG_BUS' ? 4 : 8;
  for (let i = 0; i < segments; i++) {
    const tA = (i + 0.18) / segments;
    const tB = (i + 0.78) / segments;
    const sxA = x1 + dx * tA;
    const syA = y1 + dy * tA;
    const sxB = x1 + dx * tB;
    const syB = y1 + dy * tB;

    c.fillStyle = i % 2 === 0 ? windowFill : '#334155';
    c.beginPath();
    c.moveTo(sxA, syA - height * 0.52);
    c.lineTo(sxB, syB - height * 0.52);
    c.lineTo(sxB, syB - height * 0.82);
    c.lineTo(sxA, syA - height * 0.82);
    c.closePath();
    c.fill();
  }

  c.fillStyle = bodyFill;
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x1 + wx, y1 + wy);
  c.lineTo(x1 + wx, y1 + wy - height);
  c.lineTo(x1, y1 - height);
  c.closePath();
  c.fill();
  c.stroke();

  c.fillStyle = '#0f172a';
  c.beginPath();
  c.moveTo(x1 + wx * 0.15, y1 + wy * 0.15 - height * 0.48);
  c.lineTo(x1 + wx * 0.85, y1 + wy * 0.85 - height * 0.48);
  c.lineTo(x1 + wx * 0.85, y1 + wy * 0.85 - height * 0.84);
  c.lineTo(x1 + wx * 0.15, y1 + wy * 0.15 - height * 0.84);
  c.closePath();
  c.fill();

  const glow = 0.65 + 0.35 * Math.sin(nowSec * 5);
  c.fillStyle = `rgba(254, 240, 138, ${glow})`;
  c.beginPath();
  c.arc(x1 + wx * 0.25, y1 + wy * 0.25 - height * 0.24, 2.5, 0, Math.PI * 2);
  c.arc(x1 + wx * 0.75, y1 + wy * 0.75 - height * 0.24, 2.5, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = roofFill;
  c.beginPath();
  c.moveTo(x1, y1 - height);
  c.lineTo(x2, y2 - height);
  c.lineTo(x2 + wx, y2 + wy - height);
  c.lineTo(x1 + wx, y1 + wy - height);
  c.closePath();
  c.fill();
  c.stroke();

  if (showLabels && label) {
    const midX = (x1 + x2) * 0.5 + wx * 0.5;
    const midY = (y1 + y2) * 0.5 + wy * 0.5 - height - 8;
    c.font = 'bold 10px monospace';
    const tw = c.measureText(label).width + 10;
    c.fillStyle = 'rgba(15, 23, 42, 0.86)';
    c.fillRect(midX - tw * 0.5, midY - 9, tw, 14);
    c.strokeStyle = palette.label;
    c.lineWidth = 1;
    c.strokeRect(midX - tw * 0.5, midY - 9, tw, 14);
    c.fillStyle = '#f8fafc';
    c.textAlign = 'center';
    c.fillText(label, midX, midY + 1);
  }
}

/** A walking commuter sprite. */
export function drawCommuter(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  coatColor: string,
  hairColor: string,
  hasSuitcase: boolean,
  suitcaseColor: string,
  walkPhase: number,
  label: string | undefined,
  showLabels: boolean
) {
  const bob = Math.abs(Math.sin(walkPhase)) * 1.8 * scale;
  const legSwing = Math.sin(walkPhase) * 2.5 * scale;

  c.fillStyle = 'rgba(0, 0, 0, 0.35)';
  c.beginPath();
  c.ellipse(x, y + 1, 4.5 * scale, 2.2 * scale, 0, 0, Math.PI * 2);
  c.fill();

  c.strokeStyle = '#0f172a';
  c.lineWidth = 1.8 * scale;
  c.beginPath();
  c.moveTo(x - 1.5 * scale, y - 5 * scale);
  c.lineTo(x - 1.5 * scale + legSwing, y);
  c.moveTo(x + 1.5 * scale, y - 5 * scale);
  c.lineTo(x + 1.5 * scale - legSwing, y);
  c.stroke();

  if (hasSuitcase) {
    c.fillStyle = suitcaseColor;
    c.fillRect(x + 4 * scale, y - 6 * scale, 4.2 * scale, 5.5 * scale);
    c.strokeStyle = '#0f172a';
    c.lineWidth = 0.9 * scale;
    c.strokeRect(x + 4 * scale, y - 6 * scale, 4.2 * scale, 5.5 * scale);
  }

  c.fillStyle = coatColor;
  c.beginPath();
  c.roundRect(x - 3.4 * scale, y - 13 * scale - bob, 6.8 * scale, 8.5 * scale, 2 * scale);
  c.fill();
  c.strokeStyle = '#0f172a';
  c.lineWidth = 0.9 * scale;
  c.stroke();

  c.fillStyle = '#fed7aa';
  c.beginPath();
  c.arc(x, y - 15.8 * scale - bob, 2.8 * scale, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = hairColor;
  c.beginPath();
  c.arc(x, y - 16.6 * scale - bob, 2.8 * scale, Math.PI, 0);
  c.fill();

  if (showLabels && label) {
    c.font = 'bold 9px monospace';
    const w = c.measureText(label).width + 6;
    c.fillStyle = 'rgba(15, 23, 42, 0.82)';
    c.fillRect(x - w * 0.5, y - 28 * scale - bob, w, 11);
    c.fillStyle = '#e2e8f0';
    c.textAlign = 'center';
    c.fillText(label, x, y - 20 * scale - bob);
  }
}
