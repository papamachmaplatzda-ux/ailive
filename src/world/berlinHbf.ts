/**
 * World data — BERLIN HAUPTBAHNHOF (venue: berlin-hbf)
 *
 * The station is the first playable venue of the city. It keeps the existing
 * level blueprints (`STATION_BLUEPRINTS`) as its art source and adds the data
 * the engine needs to treat it like any other place:
 *   - one Scene per level (plates per art tier)
 *   - the ambient crowd routes that used to be hardcoded in the canvas
 */

import { STATION_BLUEPRINTS, StationViewId } from '../game/stationData';
import { CrowdRoute, PlateDef, SceneDef, VenueDef } from '../engine/types';
import { registerProceduralRenderer } from '../engine/assets';
import { renderE0Realistic } from '../engine/render/e0_scene';

// Register the procedural E0 renderer so the asset pipeline can bake it.
registerProceduralRenderer('procedural:e0', renderE0Realistic);

const HBF_CROWD: Record<StationViewId, CrowdRoute[]> = {
  'E+2': [
    { path: [{ x: 0.16, y: 0.56 }, { x: 0.48, y: 0.78 }, { x: 0.68, y: 0.9 }], speed: 0.045, coat: '#1e293b', hasSuitcase: true, label: 'ICE 948' },
    { path: [{ x: 0.28, y: 0.42 }, { x: 0.56, y: 0.62 }, { x: 0.78, y: 0.77 }], speed: 0.052, coat: '#b91c1c', hasSuitcase: false, label: 'S7' },
    { path: [{ x: 0.44, y: 0.26 }, { x: 0.66, y: 0.42 }, { x: 0.84, y: 0.55 }], speed: 0.038, coat: '#0284c7', hasSuitcase: true },
    { path: [{ x: 0.6, y: 0.72 }, { x: 0.74, y: 0.83 }, { x: 0.82, y: 0.89 }], speed: 0.048, coat: '#059669', hasSuitcase: false },
    { path: [{ x: 0.34, y: 0.64 }, { x: 0.52, y: 0.52 }, { x: 0.64, y: 0.43 }], speed: 0.041, coat: '#d97706', hasSuitcase: true, label: 'RE 1' },
  ],
  'E+1': [
    { path: [{ x: 0.23, y: 0.26 }, { x: 0.36, y: 0.36 }, { x: 0.46, y: 0.45 }], speed: 0.042, coat: '#dc2626', hasSuitcase: false, label: 'DB Info' },
    { path: [{ x: 0.32, y: 0.47 }, { x: 0.4, y: 0.56 }, { x: 0.52, y: 0.67 }], speed: 0.039, coat: '#1e40af', hasSuitcase: true, label: 'DB Lounge' },
    { path: [{ x: 0.52, y: 0.28 }, { x: 0.66, y: 0.38 }, { x: 0.76, y: 0.46 }], speed: 0.046, coat: '#047857', hasSuitcase: false, label: 'Bügelbauten' },
    { path: [{ x: 0.38, y: 0.62 }, { x: 0.55, y: 0.74 }, { x: 0.72, y: 0.84 }], speed: 0.044, coat: '#7c2d12', hasSuitcase: true },
    { path: [{ x: 0.25, y: 0.58 }, { x: 0.36, y: 0.5 }, { x: 0.48, y: 0.4 }], speed: 0.036, coat: '#4338ca', hasSuitcase: false },
  ],
  E0: [
    { path: [{ x: 0.14, y: 0.24 }, { x: 0.28, y: 0.35 }, { x: 0.38, y: 0.43 }], speed: 0.044, coat: '#0284c7', hasSuitcase: true, label: 'Europaplatz' },
    { path: [{ x: 0.36, y: 0.43 }, { x: 0.44, y: 0.56 }, { x: 0.58, y: 0.68 }, { x: 0.82, y: 0.85 }], speed: 0.048, coat: '#b91c1c', hasSuitcase: true, label: 'Taxi' },
    { path: [{ x: 0.52, y: 0.28 }, { x: 0.64, y: 0.37 }, { x: 0.72, y: 0.43 }], speed: 0.037, coat: '#d97706', hasSuitcase: false, label: 'Bakeral' },
    { path: [{ x: 0.22, y: 0.6 }, { x: 0.32, y: 0.53 }, { x: 0.42, y: 0.6 }], speed: 0.035, coat: '#059669', hasSuitcase: false, label: 'Café' },
    { path: [{ x: 0.86, y: 0.88 }, { x: 0.74, y: 0.78 }, { x: 0.6, y: 0.68 }], speed: 0.046, coat: '#1e293b', hasSuitcase: true, label: 'ICE 1001' },
  ],
  'E-1': [
    { path: [{ x: 0.22, y: 0.24 }, { x: 0.31, y: 0.32 }, { x: 0.38, y: 0.39 }], speed: 0.038, coat: '#16a34a', hasSuitcase: false, label: 'Supermarkt' },
    { path: [{ x: 0.38, y: 0.42 }, { x: 0.52, y: 0.32 }, { x: 0.69, y: 0.24 }, { x: 0.79, y: 0.17 }], speed: 0.052, coat: '#2563eb', hasSuitcase: true, label: 'Zur U5' },
    { path: [{ x: 0.33, y: 0.54 }, { x: 0.44, y: 0.64 }, { x: 0.58, y: 0.74 }], speed: 0.041, coat: '#dc2626', hasSuitcase: false, label: 'Apotheke' },
    { path: [{ x: 0.56, y: 0.68 }, { x: 0.66, y: 0.58 }, { x: 0.75, y: 0.5 }], speed: 0.039, coat: '#d97706', hasSuitcase: false, label: 'Asia Bistro' },
    { path: [{ x: 0.46, y: 0.74 }, { x: 0.58, y: 0.82 }, { x: 0.68, y: 0.74 }], speed: 0.043, coat: '#475569', hasSuitcase: true },
  ],
  'E-2': [
    { path: [{ x: 0.22, y: 0.48 }, { x: 0.4, y: 0.62 }, { x: 0.56, y: 0.74 }], speed: 0.046, coat: '#1e293b', hasSuitcase: true, label: 'ICE 1001' },
    { path: [{ x: 0.34, y: 0.36 }, { x: 0.48, y: 0.48 }, { x: 0.64, y: 0.6 }], speed: 0.042, coat: '#dc2626', hasSuitcase: true, label: 'RE 3' },
    { path: [{ x: 0.48, y: 0.24 }, { x: 0.65, y: 0.38 }, { x: 0.78, y: 0.48 }], speed: 0.049, coat: '#0284c7', hasSuitcase: true, label: 'ICE 592' },
    { path: [{ x: 0.66, y: 0.72 }, { x: 0.77, y: 0.62 }, { x: 0.87, y: 0.53 }], speed: 0.05, coat: '#eab308', hasSuitcase: false, label: 'U5 Hönow' },
  ],
  CUTAWAY: [
    { path: [{ x: 0.44, y: 0.36 }, { x: 0.56, y: 0.44 }, { x: 0.7, y: 0.53 }], speed: 0.042, coat: '#dc2626', hasSuitcase: true, label: 'Bakeral' },
    { path: [{ x: 0.22, y: 0.62 }, { x: 0.36, y: 0.5 }, { x: 0.46, y: 0.43 }], speed: 0.045, coat: '#0284c7', hasSuitcase: true, label: 'ICE 1001' },
    { path: [{ x: 0.52, y: 0.68 }, { x: 0.66, y: 0.56 }, { x: 0.78, y: 0.46 }], speed: 0.048, coat: '#16a34a', hasSuitcase: false, label: 'RE 3' },
  ],
};

/**
 * The AI-generated plates are the "stylized" art tier: detailed illustrations,
 * not raw engineering blueprints. A "realistic" tier (higher-fidelity render
 * pass) can be added per scene; when absent the resolver falls back to
 * stylized so the scene never goes dark. The E0 entrance scene already has a
 * second, higher-resolution generation pass that serves as its realistic plate.
 */
function platesForView(viewId: StationViewId, referenceImage: string, altReferenceImage?: string): PlateDef[] {
  const plates: PlateDef[] = [
    {
      tier: 'stylized',
      src: referenceImage,
      cropTopRatio: viewId === 'CUTAWAY' ? 0 : 0.062,
      note: 'AI-Illustration (stilisierte Ebene)',
    },
  ];

  // The alternate E0 image stays as a stylized variant for the variant switcher.
  if (altReferenceImage) {
    plates.push({
      tier: 'stylized',
      src: altReferenceImage,
      variant: 'b',
      cropTopRatio: 0.062,
      note: 'Alternative stilisierte Fassung',
    });
  }
  return plates;
}

export const BERLIN_HBF_SCENES: SceneDef[] = STATION_BLUEPRINTS.map((bp) => {
  const plates = platesForView(bp.viewId, bp.referenceImage, bp.altReferenceImage);

  // E0 gets a procedural realistic plate — a high-detail isometric render of
  // the ground floor.  Other scenes fall back to stylized via the resolver.
  if (bp.viewId === 'E0') {
    plates.unshift({
      tier: 'realistic',
      src: 'procedural:e0',
      procedural: true,
      note: 'Prozedurale Realismus-Szene (E0)',
    });
  }

  return {
    id: bp.viewId,
    venueId: 'berlin-hbf',
    level: bp.levelId,
    shortCode: bp.shortCode,
    subtitle: bp.subtitle,
    headerTitle: bp.headerTitle,
    color: bp.color,
    accentColor: bp.accentColor,
    highlights: bp.highlights,
    plates,
    crowd: HBF_CROWD[bp.viewId] ?? [],
  };
});

export const BERLIN_HBF: VenueDef = {
  id: 'berlin-hbf',
  districtId: 'hauptbahnhof',
  name: 'Berlin Hauptbahnhof',
  shortName: 'Hbf',
  kind: 'station',
  status: 'playable',
  summary:
    'Fünf Ebenen, 16 Gleise, Passage, Galerie und U5-Anschluss — Ausgangspunkt der offenen Stadt.',
  map: { x: 46, y: 24, w: 12, h: 9 },
  entranceSceneId: 'E0',
  scenes: BERLIN_HBF_SCENES,
  palette: { base: '#6585a5', accent: '#f59e0b' },
};
