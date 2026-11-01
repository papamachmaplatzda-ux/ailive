/**
 * World registry — lookups used by the UI and the renderers.
 * Keeping these here means screens never reach into the raw data shape.
 */

import { CityDef, SceneDef, VenueDef } from '../engine/types';
import { BERLIN_CITY } from './berlinCity';

export function listVenues(city: CityDef = BERLIN_CITY): VenueDef[] {
  return city.districts.flatMap((d) => d.venues);
}

export function getVenue(venueId: string, city: CityDef = BERLIN_CITY): VenueDef | undefined {
  return listVenues(city).find((v) => v.id === venueId);
}

export function getDistrictOfVenue(venueId: string, city: CityDef = BERLIN_CITY) {
  return city.districts.find((d) => d.venues.some((v) => v.id === venueId));
}

export function getScene(venueId: string, sceneId: string): SceneDef | undefined {
  return getVenue(venueId)?.scenes.find((s) => s.id === sceneId);
}

export function entranceScene(venue: VenueDef): SceneDef | undefined {
  if (venue.scenes.length === 0) return undefined;
  return venue.scenes.find((s) => s.id === venue.entranceSceneId) ?? venue.scenes[0];
}

export interface CityStats {
  districts: number;
  venues: number;
  playable: number;
  planned: number;
  scenes: number;
}

export function cityStats(city: CityDef = BERLIN_CITY): CityStats {
  const venues = listVenues(city);
  return {
    districts: city.districts.length,
    venues: venues.length,
    playable: venues.filter((v) => v.status === 'playable').length,
    planned: venues.filter((v) => v.status === 'planned').length,
    scenes: venues.reduce((sum, v) => sum + v.scenes.length, 0),
  };
}
