/**
 * CITY ENGINE — asset pipeline
 *
 * Two responsibilities:
 *
 * 1. Tier resolution. Every scene ships several plates (blueprint → stylized →
 *    realistic). `resolvePlate` picks the best one that actually exists, so art
 *    can be upgraded scene by scene without breaking anything.
 *
 * 2. Plate baking. AI-generated plates are huge and slightly flat. They are
 *    baked once per quality level into an offscreen canvas at a working
 *    resolution: stepped high-quality downscale (crisper than one big blit),
 *    tonal grade, split-tone and a baked vignette. Every frame then draws a
 *    single cheap cached canvas instead of a 4000px JPEG.
 */

import { AssetTier, PlateDef, RenderQuality, TIER_PREFERENCE } from './types';

const images = new Map<string, HTMLImageElement>();

/** Load (and cache) an image. Returns the element; check `.complete` before use. */
export function loadImage(src: string): HTMLImageElement {
  const existing = images.get(src);
  if (existing) return existing;
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  images.set(src, img);
  return img;
}

export function isReady(img: HTMLImageElement | undefined): boolean {
  return !!img && img.complete && img.naturalWidth > 0;
}

/**
 * Pick the plate to draw for a scene.
 * Walks the tier preference chain starting at `wanted`, then falls back to any
 * plate of the scene so a scene never renders empty.
 */
export function resolvePlate(
  plates: PlateDef[],
  wanted: AssetTier = 'realistic',
  variant?: string
): PlateDef | null {
  if (plates.length === 0) return null;

  const matchingVariant = variant ? plates.filter((p) => p.variant === variant) : [];
  const pool = matchingVariant.length > 0 ? matchingVariant : plates.filter((p) => !p.variant);
  const candidates = pool.length > 0 ? pool : plates;

  const startIndex = Math.max(0, TIER_PREFERENCE.indexOf(wanted));
  for (const tier of TIER_PREFERENCE.slice(startIndex)) {
    const hit = candidates.find((p) => p.tier === tier);
    if (hit) return hit;
  }
  return candidates[0] ?? null;
}

export interface ResolvedPlate {
  plate: PlateDef;
  /** Tier that was requested (may differ from the resolved one). */
  requested: AssetTier;
  /** True when the wanted tier was not available and a lower one was used. */
  fellBack: boolean;
}

export function resolvePlateInfo(
  plates: PlateDef[],
  wanted: AssetTier,
  variant?: string
): ResolvedPlate | null {
  const plate = resolvePlate(plates, wanted, variant);
  if (!plate) return null;
  return { plate, requested: wanted, fellBack: plate.tier !== wanted };
}

const BAKE_MAX_WIDTH = 2048;
const baked = new Map<string, HTMLCanvasElement>();

const QUALITY_GRADE: Record<RenderQuality, string> = {
  raw: 'none',
  graded: 'contrast(1.06) saturate(1.1) brightness(1.02)',
  cinematic: 'contrast(1.13) saturate(1.18) brightness(1.03)',
};

function stepperDownscale(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  targetW: number,
  targetH: number,
  filter: string
) {
  // Halve repeatedly, then do the final pass: avoids the muddy single-step
  // downscale that browser drawImage does on very large sources.
  let src: CanvasImageSource = img;
  let w = img.naturalWidth;
  let h = img.naturalHeight;

  while (w > targetW * 2 && h > targetH * 2) {
    const step = document.createElement('canvas');
    step.width = Math.max(1, Math.floor(w / 2));
    step.height = Math.max(1, Math.floor(h / 2));
    const sctx = step.getContext('2d');
    if (!sctx) return;
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(src, 0, 0, step.width, step.height);
    src = step;
    w = step.width;
    h = step.height;
  }

  ctx.imageSmoothingQuality = 'high';
  ctx.filter = filter;
  ctx.drawImage(src, 0, 0, targetW, targetH);
  ctx.filter = 'none';
}

/** Bake (and cache) a graded, vignetted working copy of a plate. */
export function getBakedPlate(
  plate: PlateDef,
  img: HTMLImageElement,
  quality: RenderQuality
): HTMLCanvasElement | null {
  if (!isReady(img)) return null;
  const key = `${plate.src}|${quality}`;
  const cached = baked.get(key);
  if (cached) return cached;

  const scale = Math.min(1, BAKE_MAX_WIDTH / img.naturalWidth);
  const targetW = Math.max(1, Math.round(img.naturalWidth * scale));
  const targetH = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  stepperDownscale(ctx, img, targetW, targetH, QUALITY_GRADE[quality]);

  if (quality === 'cinematic') {
    // Split-tone: cool shadows, warm highlights — reads as "painted light".
    const cool = ctx.createLinearGradient(0, 0, 0, targetH);
    cool.addColorStop(0, 'rgba(255, 224, 178, 0.10)');
    cool.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
    cool.addColorStop(1, 'rgba(24, 48, 88, 0.16)');
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = cool;
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.globalCompositeOperation = 'source-over';

    // Baked vignette pulls the eye to the centre of the scene.
    const vignette = ctx.createRadialGradient(
      targetW * 0.5,
      targetH * 0.48,
      Math.min(targetW, targetH) * 0.28,
      targetW * 0.5,
      targetH * 0.5,
      Math.max(targetW, targetH) * 0.72
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(6, 10, 20, 0.38)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, targetW, targetH);
  }

  baked.set(key, canvas);
  return canvas;
}

/** Drop cached bakes for one source (used when a plate is replaced at runtime). */
export function invalidatePlate(src: string) {
  for (const key of Array.from(baked.keys())) {
    if (key.startsWith(`${src}|`)) baked.delete(key);
  }
}
