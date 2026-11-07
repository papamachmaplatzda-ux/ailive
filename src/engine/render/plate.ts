/**
 * CITY ENGINE — plate renderer
 *
 * Draws a baked scene plate plus its lighting pass. This is the single place
 * where "how good does the original art look" is decided, so every venue
 * (station, square, park, club …) benefits from the same improvements:
 *   - baked high-quality downscale + tonal grade (see assets.ts)
 *   - time-of-day tint and warm key light from the shared atmosphere model
 *   - soft contact shadow so the plate reads as a physical board, not a JPEG
 *   - framed inner edge that blends the art into the blueprint background
 */

import { Rect } from '../camera';
import { Atmosphere } from '../atmosphere';
import { RenderQuality } from '../types';

export interface PlateDrawOptions {
  quality: RenderQuality;
  atmosphere?: Atmosphere;
  /** Draw the drop shadow + inner frame around the plate. */
  frame?: boolean;
  /** Opacity of the whole plate (used for cross-fades while art loads). */
  alpha?: number;
  /** Fraction of the source height cropped at the top (AI plates carry a header strip). */
  cropTopRatio?: number;
}

/** Pixel size of a drawable source (image or already-baked canvas). */
export function plateSourceSize(src: CanvasImageSource): { w: number; h: number } | null {
  if (src instanceof HTMLImageElement) {
    return src.naturalWidth > 0 ? { w: src.naturalWidth, h: src.naturalHeight } : null;
  }
  if (src instanceof HTMLCanvasElement || src instanceof OffscreenCanvas) {
    return src.width > 0 ? { w: src.width, h: src.height } : null;
  }
  return null;
}

/** Draw the plate into `rect` with the current quality and lighting. */
export function drawScenePlate(
  ctx: CanvasRenderingContext2D,
  plate: CanvasImageSource,
  rect: Rect,
  opts: PlateDrawOptions
) {
  const { quality, atmosphere, frame = true, alpha = 1, cropTopRatio = 0 } = opts;

  ctx.save();
  ctx.globalAlpha = alpha;

  if (frame) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(rect.x + 6, rect.y + 8, rect.w, rect.h);
  }

  const size = cropTopRatio > 0 ? plateSourceSize(plate) : null;
  if (size) {
    ctx.drawImage(
      plate,
      0,
      size.h * cropTopRatio,
      size.w,
      size.h * (1 - cropTopRatio),
      rect.x,
      rect.y,
      rect.w,
      rect.h
    );
  } else {
    ctx.drawImage(plate, rect.x, rect.y, rect.w, rect.h);
  }

  if (quality !== 'raw' && atmosphere) {
    // Atmospheric perspective: subtle cool haze at the top of the plate that
    // fades to clear toward the bottom — adds depth as if the far end of the
    // hall recedes into air. Faint at graded, slightly stronger at cinematic.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha * (quality === 'cinematic' ? 0.07 : 0.04);
    const haze = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    haze.addColorStop(0, 'rgba(200, 220, 240, 0.5)');
    haze.addColorStop(0.4, 'rgba(200, 220, 240, 0)');
    haze.addColorStop(1, 'rgba(200, 220, 240, 0)');
    ctx.fillStyle = haze;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();

    // Tint: multiply keeps the art's contrast while shifting its time of day.
    if (atmosphere.tintAlpha > 0.001) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = alpha * atmosphere.tintAlpha;
      ctx.fillStyle = atmosphere.tint;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.globalCompositeOperation = 'source-over';
    }

    // Warm key light: a soft elliptical patch, as if light entered from one side.
    if (atmosphere.lightAlpha > 0.001) {
      const cx = rect.x + rect.w * 0.42;
      const cy = rect.y + rect.h * 0.34;
      const radius = Math.max(rect.w, rect.h) * 0.62;
      const glow = ctx.createRadialGradient(cx, cy, radius * 0.05, cx, cy, radius);
      const [r, g, b] = hexToRgbParts(atmosphere.lightColor);
      glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${atmosphere.lightAlpha})`);
      glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = alpha;
      ctx.fillStyle = glow;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.globalCompositeOperation = 'source-over';
    }

    // Night: lamp pools over the plate pick up the interior lighting.
    if (atmosphere.lampGlow > 0.35) {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = alpha * (atmosphere.lampGlow - 0.35) * 0.22;
      ctx.fillStyle = '#ffcf8a';
      const bands = 5;
      for (let i = 0; i < bands; i++) {
        const by = rect.y + rect.h * (0.18 + i * 0.15);
        ctx.fillRect(rect.x + rect.w * 0.12, by, rect.w * 0.76, rect.h * 0.02);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  if (frame) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rect.x + 0.75, rect.y + 0.75, rect.w - 1.5, rect.h - 1.5);
  }

  ctx.restore();
}

function hexToRgbParts(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
