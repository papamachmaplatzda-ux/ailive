/**
 * CITY ENGINE — camera
 *
 * Pan/zoom state for any scene, independent of what is drawn. Scenes only ask
 * the camera for a destination rectangle, so plates, procedural geometry and
 * future tile layers all share one navigation model.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FitOptions {
  /** Space kept free around the content in canvas pixels. */
  padding?: number;
  /** Space kept free at the top (UI header). */
  topInset?: number;
  /** Never zoom in beyond this. */
  maxScale?: number;
}

export class Camera {
  x = 0;
  y = 0;
  zoom = 1;

  reset() {
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
  }

  panBy(dx: number, dy: number) {
    this.x += dx;
    this.y += dy;
  }

  setPan(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  zoomBy(factor: number, min = 0.65, max = 2.6) {
    this.zoom = Math.max(min, Math.min(max, this.zoom * factor));
  }

  /** Letterbox-fit content of `aspect` (w/h) into the canvas and apply pan/zoom. */
  fit(canvasW: number, canvasH: number, aspect: number, opts: FitOptions = {}): Rect {
    const padding = opts.padding ?? 0;
    const topInset = opts.topInset ?? 0;
    const availW = Math.max(1, canvasW - padding * 2);
    const availH = Math.max(1, canvasH - topInset - padding * 2);
    const viewAspect = availW / availH;

    let baseW = availW;
    let baseH = availH;
    if (viewAspect > aspect) {
      baseH = availH;
      baseW = baseH * aspect;
    } else {
      baseW = availW;
      baseH = baseW / aspect;
    }

    const zoom = Math.min(this.zoom, opts.maxScale ?? this.zoom);
    const w = baseW * zoom;
    const h = baseH * zoom;
    return {
      x: (canvasW - w) * 0.5 + this.x,
      y: topInset + (availH - h) * 0.5 + padding + this.y,
      w,
      h,
    };
  }
}
