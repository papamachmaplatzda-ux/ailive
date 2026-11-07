/**
 * World data — BERLIN CITY
 *
 * The station is one node. Everything else that makes this an open-world city
 * is declared here: districts with a footprint on the city map and venues with
 * a status. A "planned" venue already renders, already has its palette and its
 * map footprint — it simply has no scenes yet, which is exactly the growth path:
 * art and scenes arrive later, the world model does not change.
 */

import { CityDef, DistrictDef, VenueDef } from '../engine/types';
import { BERLIN_HBF } from './berlinHbf';

function plannedVenue(
  venue: Omit<VenueDef, 'scenes' | 'status'>
): VenueDef {
  return { ...venue, status: 'planned', scenes: [] };
}

const HAUPTBAHNHOF: DistrictDef = {
  id: 'hauptbahnhof',
  name: 'Hauptbahnhof & Europaplatz',
  summary: 'Der Verkehrsknoten im Zentrum: fünf Ebenen, Busbahnhof, Taxistand.',
  map: { x: 34, y: 15, w: 28, h: 20 },
  color: '#f59e0b',
  venues: [
    BERLIN_HBF,
    plannedVenue({
      id: 'europaplatz',
      districtId: 'hauptbahnhof',
      name: 'Europaplatz',
      shortName: 'Europaplatz',
      kind: 'square',
      summary: 'Busbahnhof, Tramhaltestellen und der Nordwest-Eingang.',
      map: { x: 36.5, y: 17.5, w: 7, h: 5 },
      palette: { base: '#64748b', accent: '#facc15' },
    }),
    plannedVenue({
      id: 'washingtonplatz',
      districtId: 'hauptbahnhof',
      name: 'Washingtonplatz',
      shortName: 'Washingtonpl.',
      kind: 'square',
      summary: 'Südost-Vorplatz mit Taxistand und Blick auf die Kanzlermeile.',
      map: { x: 53, y: 27.5, w: 7, h: 5 },
      palette: { base: '#475569', accent: '#fbbf24' },
    }),
  ],
};

const MOABIT: DistrictDef = {
  id: 'moabit',
  name: 'Moabit',
  summary: 'Hafenkanäle, Markthalle und Hinterhöfe im Nordwesten.',
  map: { x: 5, y: 4, w: 27, h: 14 },
  color: '#38bdf8',
  venues: [
    plannedVenue({
      id: 'moabit-kanal',
      districtId: 'moabit',
      name: 'Moabiter Hafenkanal',
      shortName: 'Hafenkanal',
      kind: 'waterfront',
      summary: 'Uferpromenade, Bootsanleger und ein Nachtmarkt am Wasser.',
      map: { x: 9, y: 7, w: 11, h: 8 },
      palette: { base: '#0ea5e9', accent: '#f59e0b' },
    }),
    plannedVenue({
      id: 'moabit-markthalle',
      districtId: 'moabit',
      name: 'Markthalle Moabit',
      shortName: 'Markthalle',
      kind: 'mall',
      summary: 'Innenmarkt mit Ständen, Küchen und Stammgästen.',
      map: { x: 22, y: 8, w: 8, h: 7 },
      palette: { base: '#b45309', accent: '#fde68a' },
    }),
  ],
};

const WEDDING: DistrictDef = {
  id: 'wedding',
  name: 'Wedding & Gesundbrunnen',
  summary: 'Wohnblöcke, S-Bahn-Ring und die Werkstätten im Norden.',
  map: { x: 34, y: 2, w: 26, h: 11 },
  color: '#a78bfa',
  venues: [
    plannedVenue({
      id: 'gesundbrunnen-ring',
      districtId: 'wedding',
      name: 'S-Bahn-Ring Gesundbrunnen',
      shortName: 'Ringbahn',
      kind: 'street',
      summary: 'Ringbahnsteig, Kioske und der Übergang in den Untergrund.',
      map: { x: 39, y: 4.5, w: 9, h: 6 },
      palette: { base: '#7c3aed', accent: '#22c55e' },
    }),
  ],
};

const REGIERUNGSVIERTEL: DistrictDef = {
  id: 'regierungsviertel',
  name: 'Regierungsviertel',
  summary: 'Spreebogen, Bundestag und Ministeriumszeilen.',
  map: { x: 7, y: 21, w: 24, h: 18 },
  color: '#34d399',
  venues: [
    plannedVenue({
      id: 'bundestag-ufer',
      districtId: 'regierungsviertel',
      name: 'Spreeufer am Bundestag',
      shortName: 'Spreeufer',
      kind: 'waterfront',
      summary: 'Uferweg, Kanzleramt-Brücke und Aussicht auf das Regierungsband.',
      map: { x: 12, y: 26, w: 12, h: 8 },
      palette: { base: '#0f766e', accent: '#e2e8f0' },
    }),
  ],
};

const TIERGARTEN: DistrictDef = {
  id: 'tiergarten',
  name: 'Tiergarten',
  summary: 'Park, Siegessäule und Alleen bis zum Zoo.',
  map: { x: 5, y: 41, w: 27, h: 19 },
  color: '#22c55e',
  venues: [
    plannedVenue({
      id: 'tiergarten-park',
      districtId: 'tiergarten',
      name: 'Tiergarten · Siegessäule',
      shortName: 'Tiergarten',
      kind: 'park',
      summary: 'Wege, Seen und Straßenmusik — der ruhige Gegenpol zur Station.',
      map: { x: 10, y: 45, w: 14, h: 10 },
      palette: { base: '#166534', accent: '#facc15' },
    }),
  ],
};

const MITTE: DistrictDef = {
  id: 'mitte',
  name: 'Mitte & Museumsinsel',
  summary: 'Museen, Spreeinsel und die Boulevards Richtung Osten.',
  map: { x: 64, y: 15, w: 29, h: 19 },
  color: '#f472b6',
  venues: [
    plannedVenue({
      id: 'museumsinsel',
      districtId: 'mitte',
      name: 'Museumsinsel',
      shortName: 'Museumsinsel',
      kind: 'museum',
      summary: 'Kolonnaden, Museumsvorplätze und der Spreekanal.',
      map: { x: 68, y: 19, w: 11, h: 9 },
      palette: { base: '#9d174d', accent: '#fbcfe8' },
    }),
    plannedVenue({
      id: 'alex-fernsehturm',
      districtId: 'mitte',
      name: 'Alexanderplatz',
      shortName: 'Alex',
      kind: 'square',
      summary: 'Fernsehturm, Brunnen und der lauteste Platz der Stadt.',
      map: { x: 80, y: 25, w: 10, h: 7 },
      palette: { base: '#be123c', accent: '#fde047' },
    }),
  ],
};

const KREUZBERG: DistrictDef = {
  id: 'kreuzberg',
  name: 'Kreuzberg',
  summary: 'Marktstraßen, Clubs und der Landwehrkanal.',
  map: { x: 38, y: 37, w: 24, h: 22 },
  color: '#fb923c',
  venues: [
    plannedVenue({
      id: 'kreuzberg-markt',
      districtId: 'kreuzberg',
      name: 'Marktstraße Kreuzberg',
      shortName: 'Marktstraße',
      kind: 'street',
      summary: 'Straßenmarkt, Imbisse und Hinterhof-Konzerte.',
      map: { x: 42, y: 41, w: 10, h: 8 },
      palette: { base: '#c2410c', accent: '#fdba74' },
    }),
    plannedVenue({
      id: 'kreuzberg-club',
      districtId: 'kreuzberg',
      name: 'Kanalufer Club',
      shortName: 'Kanalufer',
      kind: 'arena',
      summary: 'Club am Wasser — nachts der hellste Ort im Viertel.',
      map: { x: 54, y: 46, w: 7, h: 6 },
      palette: { base: '#6d28d9', accent: '#f0abfc' },
    }),
  ],
};

export const BERLIN_CITY: CityDef = {
  id: 'berlin-center',
  name: 'Berlin · Zentrum',
  subtitle: 'Open-World 2D-RPG — Bezirke, Orte und die Bahnhofs-Ebenen',
  bounds: { w: 100, h: 64 },
  districts: [
    MOABIT,
    WEDDING,
    HAUPTBAHNHOF,
    REGIERUNGSVIERTEL,
    MITTE,
    TIERGARTEN,
    KREUZBERG,
  ],
  startVenueId: 'berlin-hbf',
};
