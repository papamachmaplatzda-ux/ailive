/**
 * CITY ENGINE — world model
 *
 * The game world is defined as data, not as one hand-written canvas:
 *
 *   City
 *    └─ District        (Moabit, Mitte, Kreuzberg …)
 *        └─ Venue       (a place you can enter: station, square, mall, park …)
 *            └─ Scene   (one camera view of that venue, usually one level)
 *
 * A new location therefore means: add a VenueDef with Scenes and Plates.
 * No renderer changes, no new canvas component.
 */

/** Art quality stage of a plate. Higher tiers replace lower ones as art arrives. */
export type AssetTier = 'blueprint' | 'stylized' | 'realistic';

/** Post-processing applied to a plate at runtime. */
export type RenderQuality = 'raw' | 'graded' | 'cinematic';

/** Preference order used when resolving which plate to draw. */
export const TIER_PREFERENCE: AssetTier[] = ['realistic', 'stylized', 'blueprint'];

/**
 * One drawable background image for a scene.
 * Scenes usually carry several plates so a scene keeps working while art is
 * upgraded tier by tier: the resolver falls back to the best available one.
 */
export interface PlateDef {
  tier: AssetTier;
  src: string;
  /** Optional variant switch (e.g. two alternative art passes for the same scene). */
  variant?: string;
  /** Fraction of the image height to crop at the top (AI plates carry a header strip). */
  cropTopRatio?: number;
  /** Short note shown in the plate inspector. */
  note?: string;
}

/**
 * An ambient crowd route on a plate, normalized 0..1. Moving this out of the
 * renderer is what lets a new venue come with its own life on day one.
 */
export interface CrowdRoute {
  path: { x: number; y: number }[];
  speed: number;
  coat: string;
  hasSuitcase: boolean;
  label?: string;
}

export interface SceneDef {
  id: string;
  venueId: string;
  /** Vertical position in the venue, used for ordering and connectors. */
  level: number;
  shortCode: string;
  subtitle: string;
  color: string;
  accentColor: string;
  headerTitle: string;
  highlights: string[];
  plates: PlateDef[];
  crowd: CrowdRoute[];
}

export type VenueKind =
  | 'station'
  | 'square'
  | 'street'
  | 'mall'
  | 'park'
  | 'museum'
  | 'waterfront'
  | 'arena';

export type VenueStatus = 'playable' | 'planned';

export interface VenueDef {
  id: string;
  districtId: string;
  name: string;
  shortName: string;
  kind: VenueKind;
  status: VenueStatus;
  summary: string;
  /** Footprint on the city map in world units. */
  map: { x: number; y: number; w: number; h: number };
  /** Scene the player enters first. */
  entranceSceneId?: string;
  scenes: SceneDef[];
  palette: { base: string; accent: string };
}

export interface DistrictDef {
  id: string;
  name: string;
  summary: string;
  /** Area on the city map in world units. */
  map: { x: number; y: number; w: number; h: number };
  color: string;
  venues: VenueDef[];
}

export interface CityDef {
  id: string;
  name: string;
  subtitle: string;
  /** City map extent in world units. */
  bounds: { w: number; h: number };
  districts: DistrictDef[];
  startVenueId: string;
}
