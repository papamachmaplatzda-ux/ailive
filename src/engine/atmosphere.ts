/**
 * CITY ENGINE — atmosphere
 *
 * One time-of-day model shared by every scene. Plates are static art; this layer
 * is what makes the same plate read as morning, noon or night, and it is the
 * cheapest step towards a more realistic look before real lighting ships.
 */

export type AtmosphereKey = 'night' | 'dawn' | 'day' | 'golden' | 'dusk';

export interface Atmosphere {
  key: AtmosphereKey;
  label: string;
  /** Multiply tint laid over the plate. */
  tint: string;
  tintAlpha: number;
  /** Warm light patch (sun / hall lighting) drawn additively. */
  lightColor: string;
  lightAlpha: number;
  /** Interior lamp glow strength 0..1. */
  lampGlow: number;
}

interface Keyframe {
  minute: number;
  atmosphere: Atmosphere;
}

const KEYFRAMES: Keyframe[] = [
  {
    minute: 0,
    atmosphere: { key: 'night', label: 'Nacht', tint: '#0a1226', tintAlpha: 0.62, lightColor: '#ffd9a0', lightAlpha: 0.05, lampGlow: 1 },
  },
  {
    minute: 330,
    atmosphere: { key: 'night', label: 'Nacht', tint: '#0a1226', tintAlpha: 0.58, lightColor: '#ffd9a0', lightAlpha: 0.05, lampGlow: 1 },
  },
  {
    minute: 390,
    atmosphere: { key: 'dawn', label: 'Morgengrauen', tint: '#7c5a8c', tintAlpha: 0.28, lightColor: '#ffb480', lightAlpha: 0.14, lampGlow: 0.6 },
  },
  {
    minute: 480,
    atmosphere: { key: 'day', label: 'Morgen', tint: '#ffffff', tintAlpha: 0.03, lightColor: '#ffe2b8', lightAlpha: 0.1, lampGlow: 0.05 },
  },
  {
    minute: 720,
    atmosphere: { key: 'day', label: 'Mittag', tint: '#ffffff', tintAlpha: 0.0, lightColor: '#fff4d6', lightAlpha: 0.07, lampGlow: 0 },
  },
  {
    minute: 1020,
    atmosphere: { key: 'day', label: 'Nachmittag', tint: '#ffe9c4', tintAlpha: 0.06, lightColor: '#ffd9a0', lightAlpha: 0.09, lampGlow: 0 },
  },
  {
    minute: 1110,
    atmosphere: { key: 'golden', label: 'Goldene Stunde', tint: '#ffb066', tintAlpha: 0.2, lightColor: '#ffb066', lightAlpha: 0.2, lampGlow: 0.2 },
  },
  {
    minute: 1200,
    atmosphere: { key: 'dusk', label: 'Dämmerung', tint: '#3b3f7a', tintAlpha: 0.36, lightColor: '#ff9f5a', lightAlpha: 0.12, lampGlow: 0.55 },
  },
  {
    minute: 1290,
    atmosphere: { key: 'night', label: 'Nacht', tint: '#0a1226', tintAlpha: 0.6, lightColor: '#ffd9a0', lightAlpha: 0.05, lampGlow: 1 },
  },
  {
    minute: 1440,
    atmosphere: { key: 'night', label: 'Nacht', tint: '#0a1226', tintAlpha: 0.62, lightColor: '#ffd9a0', lightAlpha: 0.05, lampGlow: 1 },
  },
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(rgb: [number, number, number]): string {
  return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

function mix(a: string, b: string, t: number): string {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  return rgbToHex([
    ra[0] + (rb[0] - ra[0]) * t,
    ra[1] + (rb[1] - ra[1]) * t,
    ra[2] + (rb[2] - ra[2]) * t,
  ]);
}

/** Map a station clock (minutes since midnight) onto the lighting model. */
export function atmosphereForMinutes(totalMinutes: number): Atmosphere {
  const m = ((totalMinutes % 1440) + 1440) % 1440;

  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const a = KEYFRAMES[i];
    const b = KEYFRAMES[i + 1];
    if (m >= a.minute && m <= b.minute) {
      const span = Math.max(1, b.minute - a.minute);
      const t = (m - a.minute) / span;
      const lerp = (x: number, y: number) => x + (y - x) * t;
      return {
        key: t < 0.5 ? a.atmosphere.key : b.atmosphere.key,
        label: t < 0.5 ? a.atmosphere.label : b.atmosphere.label,
        tint: mix(a.atmosphere.tint, b.atmosphere.tint, t),
        tintAlpha: lerp(a.atmosphere.tintAlpha, b.atmosphere.tintAlpha),
        lightColor: mix(a.atmosphere.lightColor, b.atmosphere.lightColor, t),
        lightAlpha: lerp(a.atmosphere.lightAlpha, b.atmosphere.lightAlpha),
        lampGlow: lerp(a.atmosphere.lampGlow, b.atmosphere.lampGlow),
      };
    }
  }
  return KEYFRAMES[0].atmosphere;
}
