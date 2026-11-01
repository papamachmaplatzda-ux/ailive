export type StationLevelId = 2 | 1 | 0 | -1 | -2;
export type StationViewId = 'E+2' | 'E+1' | 'E0' | 'E-1' | 'E-2' | 'CUTAWAY';

export interface LevelBlueprintMeta {
  viewId: StationViewId;
  levelId: StationLevelId;
  shortCode: string;
  headerTitle: string;
  subtitle: string;
  referenceImage: string;
  altReferenceImage?: string;
  highlights: string[];
  elevationPx: number;
  color: string;
  accentColor: string;
}

export const STATION_BLUEPRINTS: LevelBlueprintMeta[] = [
  {
    viewId: 'E+2',
    levelId: 2,
    shortCode: 'EBENE E+2',
    headerTitle: 'BERLIN HBF - OBERE GLEISEBENE (EBENE E+2) - GAME TILEMAP REFERENZ',
    subtitle: 'Glasdach-Halle · Ost-West-Fernbahn & S-Bahn (Gleis 11–16) · Zentraler Lichthof',
    referenceImage: '/assets/aistudio/Gemini_Generated_Image_lxvom9lxvom9lxvo_f2f59c6f.jpeg',
    highlights: [
      'Gewölbtes Glasdach über der Ost-West-Trasse',
      'ICE & DB Regio auf den oberen Bahnsteigen',
      'Zentraler Lichthof mit 2 Glasaufzügen & Rolltreppen',
      'Südost-Glasfoyer mit Drehtüren',
    ],
    elevationPx: -260,
    color: '#6585a5',
    accentColor: '#8db3c7',
  },
  {
    viewId: 'E+1',
    levelId: 1,
    shortCode: 'EBENE E+1',
    headerTitle: 'BERLIN HBF - GALERIE & BÜGELBAUTEN (EBENE E+1) - GAME TILEMAP REFERENZ',
    subtitle: 'Einkaufsgalerie · Bügelbauten-Brücken · 2 Rote DB-Rundkioske · DB Lounge',
    referenceImage: '/assets/aistudio/Gemini_Generated_Image_lxvom9lxvom9lxvo__1__044f0320.jpeg',
    highlights: [
      '2 markante runde rote DB-Info-Pavillons',
      'Bügelbauten-Büros & Sicherheitsleitstelle im Nordosten',
      'Offene Cutaway-Läden, Cafés & Buchhandlungen',
      'Bogenportale über den Gleisbrücken',
    ],
    elevationPx: -135,
    color: '#8db3c7',
    accentColor: '#6585a5',
  },
  {
    viewId: 'E0',
    levelId: 0,
    shortCode: 'EBENE E0',
    headerTitle: 'BERLIN HBF - ERDGESCHOSS & EINGÄNGE (EBENE E0) - GAME TILEMAP REFERENZ',
    subtitle: 'Europaplatz (Busbahnhof) · Washingtonplatz (Taxistand) · Haupthalle & Gastronomie',
    referenceImage: '/assets/aistudio/Gemini_Generated_Image_lxvom9lxvom9lxvo__2__ade04f5d.jpeg',
    altReferenceImage: '/assets/aistudio/Generated_Image_November_01__2026_-_8_01PM_5382722d.jpg',
    highlights: [
      'Nordwest-Eingang Europaplatz mit gelben BVG-Bussen & Drehtüren',
      'Südost-Eingang Washingtonplatz mit Berliner Taxis & Drehtüren',
      'Große Cutaway-Gastronomie, Bäckerei Bakeral & Cafés mit Sitzgruppen',
      '2 rote Rundkioske & zentraler Lichthof mit Glasaufzügen',
    ],
    elevationPx: 0,
    color: '#f59e0b',
    accentColor: '#d97706',
  },
  {
    viewId: 'E-1',
    levelId: -1,
    shortCode: 'EBENE E-1',
    headerTitle: 'BERLIN HBF - PASSAGE & U-BAHN-VERTEILER (EBENE E-1) - GAME TILEMAP REFERENZ',
    subtitle: 'Supermarkt · Apotheke · Asia-Bistro · Schließfächer · Übergang U-Bahn U5',
    referenceImage: '/assets/aistudio/Gemini_Generated_Image_lxvom9lxvom9lxvo__4__f786640c.jpeg',
    highlights: [
      'Großer Supermarkt (Nordwest) mit Regalgängen, Einkaufswagen & Kassen',
      'Apotheke mit rotem A-Emblem & Wartebereich sowie WC-Anlagen',
      'Asia-Restaurant mit roten Laternen & Gepäck-Schließfächer',
      'Nordost-Verbindungstunnel zur U-Bahn-Linie U5 mit Drehkreuzen',
    ],
    elevationPx: 135,
    color: '#10b981',
    accentColor: '#059669',
  },
  {
    viewId: 'E-2',
    levelId: -2,
    shortCode: 'EBENE E-2',
    headerTitle: 'BERLIN HBF - TIEFBAHNHOF & U-BAHN U5 (EBENE E-2) - GAME TILEMAP REFERENZ',
    subtitle: 'Nord-Süd-Fernbahntunnel (Gleis 1–8) · ICE & Regio · Gelbe U-Bahn U5',
    referenceImage: '/assets/aistudio/Gemini_Generated_Image_lxvom9lxvom9lxvo__5__78f79b71.jpeg',
    highlights: [
      '4 Nord-Süd-Tiefbahngleise mit Beton-Tunnelportalen im Erdreich',
      '2 weiße ICE-Hochgeschwindigkeitszüge & 2 rote DB-Regionalzüge',
      'Separater U-Bahn-Bahnsteig (U5) rechts mit gelbem BVG-U-Bahn-Zug',
      'Unterster Ankunftspunkt der beiden Glasaufzüge & Rolltreppen',
    ],
    elevationPx: 270,
    color: '#c94a4a',
    accentColor: '#dc2626',
  },
  {
    viewId: 'CUTAWAY',
    levelId: 0,
    shortCode: 'QUERSCHNITT',
    headerTitle: 'BERLIN HBF - GESAMT-QUERSCHNITT (ALLE 5 EBENEN E+2 BIS E-2)',
    subtitle: 'Monumentaler Hallen-Querschnitt · Stahlträger-Tragwerk · Alle Züge & Ebenen',
    referenceImage: '/assets/aistudio/ONE_standalone_full_bleed_isometric_2D_RPG_GAME_MAP_for_Berl_d2dca29c.png',
    highlights: [
      'Gleichzeitiger Blick auf Stadtbahn (E+2), Galerie (E0/E+1) und Tiefbahnhof (E-2)',
      'Durchgehende Glasaufzüge, Doppel-Rolltreppen und Stahlstützen',
      'Live-Zugverkehr auf allen Ebenen inklusive gelber U-Bahn U5',
    ],
    elevationPx: 0,
    color: '#a78bfa',
    accentColor: '#7c3aed',
  },
];

// Keep backwards-compatible exports for rules.ts and unit tests
export interface LevelMeta {
  id: StationLevelId;
  code: string;
  name: string;
  subtitle: string;
  elevationPx: number;
  color: string;
  accentColor: string;
}

export const STATION_LEVELS: LevelMeta[] = STATION_BLUEPRINTS.filter(
  (b) => b.viewId !== 'CUTAWAY'
).map((b) => ({
  id: b.levelId,
  code: b.viewId,
  name: b.shortCode,
  subtitle: b.subtitle,
  elevationPx: b.elevationPx,
  color: b.color,
  accentColor: b.accentColor,
}));

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  energyRestore: number;
  composureRestore: number;
  speedBoostSec?: number;
  description: string;
  category: 'food' | 'ticket' | 'press' | 'service';
}

export interface StationPOI {
  id: string;
  name: string;
  shortLabel: string;
  type:
    | 'bakery'
    | 'bank_db'
    | 'press'
    | 'pharmacy'
    | 'currywurst'
    | 'lockers'
    | 'police'
    | 'lounge'
    | 'board'
    | 'ticket_machine'
    | 'supermarket'
    | 'ubahn';
  level: StationLevelId;
  wx: number;
  wy: number;
  width: number;
  depth: number;
  roofColor: string;
  facadeColor: string;
  signText: string;
  description: string;
  items: ShopItem[];
}

export const STATION_POIS: StationPOI[] = [
  {
    id: 'shop_bakeral',
    name: 'Bakeral — Berliner Backstube (E0)',
    shortLabel: 'Bakeral',
    type: 'bakery',
    level: 0,
    wx: -4.2,
    wy: -3.2,
    width: 3.2,
    depth: 2.0,
    roofColor: '#78350f',
    facadeColor: '#f59e0b',
    signText: 'Bakeral',
    description: 'Große Backstube mit Café-Sitzbereich im Erdgeschoss E0.',
    items: [],
  },
  {
    id: 'shop_db_rondell',
    name: 'DB Information Rundkiosk (E0 / E+1)',
    shortLabel: 'DB Rundkiosk',
    type: 'bank_db',
    level: 0,
    wx: -1.8,
    wy: -1.2,
    width: 2.2,
    depth: 2.2,
    roofColor: '#991b1b',
    facadeColor: '#dc2626',
    signText: 'DB Info',
    description: 'Markanter runder roter DB-Servicepavillon vor dem zentralen Lichthof.',
    items: [],
  },
  {
    id: 'shop_buegelbauten',
    name: 'DB Lounge & Bügelbauten-Leitstelle (E+1)',
    shortLabel: 'Bügelbauten',
    type: 'lounge',
    level: 1,
    wx: 3.5,
    wy: -3.8,
    width: 4.0,
    depth: 2.8,
    roofColor: '#475569',
    facadeColor: '#64748b',
    signText: 'DB Lounge · Bügelbauten',
    description: 'Galeriegeschoss E+1 mit Büros, Sicherheitskontrolle und Lounge.',
    items: [],
  },
  {
    id: 'shop_supermarkt',
    name: 'Hbf Supermarkt & Frischemarkt (E-1)',
    shortLabel: 'Supermarkt',
    type: 'supermarket',
    level: -1,
    wx: -5.8,
    wy: -4.2,
    width: 4.8,
    depth: 3.4,
    roofColor: '#166534',
    facadeColor: '#22c55e',
    signText: 'Supermarkt',
    description: 'Großer Cutaway-Supermarkt mit Regalgängen, Obstinsel und Kassen auf E-1.',
    items: [],
  },
  {
    id: 'shop_pharmacy',
    name: 'Bahnhofs-Apotheke (E-1)',
    shortLabel: 'Apotheke',
    type: 'pharmacy',
    level: -1,
    wx: -3.5,
    wy: -1.5,
    width: 2.8,
    depth: 2.2,
    roofColor: '#e2e8f0',
    facadeColor: '#ef4444',
    signText: 'Apotheke A',
    description: 'Helle Apotheke mit rotem A-Emblem direkt am Lichthof auf Ebene E-1.',
    items: [],
  },
  {
    id: 'poi_ubahn_u5_gate',
    name: 'U-Bahn U5 Zugang & Drehkreuze (E-1)',
    shortLabel: 'U-Bahn U5 Tunnel',
    type: 'ubahn',
    level: -1,
    wx: 6.5,
    wy: -4.5,
    width: 3.0,
    depth: 2.0,
    roofColor: '#1e3a8a',
    facadeColor: '#2563eb',
    signText: 'U-Bahn U5',
    description: 'Verbindungspassage mit blauen U-Schildern und Zugangsschranken zur U5.',
    items: [],
  },
  {
    id: 'shop_sbahn_cafe',
    name: 'Glasdach-Kiosk Gleis 11–16 (E+2)',
    shortLabel: 'Glasdach-Kiosk',
    type: 'bakery',
    level: 2,
    wx: -2.5,
    wy: -0.8,
    width: 2.4,
    depth: 1.6,
    roofColor: '#3f6212',
    facadeColor: '#84cc16',
    signText: 'Kiosk E+2',
    description: 'Bahnsteig-Kiosk auf der oberen Gleisebene unter der Glaskuppel.',
    items: [],
  },
  {
    id: 'poi_deep_service',
    name: 'Tiefbahnhof Kiosk & U5-Übergang (E-2)',
    shortLabel: 'Service E-2',
    type: 'ticket_machine',
    level: -2,
    wx: -2.2,
    wy: -1.5,
    width: 2.2,
    depth: 1.6,
    roofColor: '#92400e',
    facadeColor: '#f59e0b',
    signText: 'Gleis 1–8 · U5',
    description: 'Bahnsteig-Kiosk zwischen den ICE-Gleisen und dem U5-Bahnsteig.',
    items: [],
  },
];

export interface VerticalConnector {
  id: string;
  name: string;
  kind: 'elevator' | 'escalator' | 'stairs';
  fromLevel: StationLevelId;
  toLevel: StationLevelId;
  fromWx: number;
  fromWy: number;
  toWx: number;
  toWy: number;
  travelTimeSec: number;
}

export const VERTICAL_CONNECTORS: VerticalConnector[] = [
  {
    id: 'elev_atrium_2_1',
    name: 'Zentral-Glasaufzug (E+2 ↔ E+1)',
    kind: 'elevator',
    fromLevel: 2,
    toLevel: 1,
    fromWx: 0.0,
    fromWy: 0.0,
    toWx: 0.0,
    toWy: 0.0,
    travelTimeSec: 1.0,
  },
  {
    id: 'elev_atrium_1_0',
    name: 'Zentral-Glasaufzug (E+1 ↔ E0)',
    kind: 'elevator',
    fromLevel: 1,
    toLevel: 0,
    fromWx: 0.0,
    fromWy: 0.0,
    toWx: 0.0,
    toWy: 0.0,
    travelTimeSec: 1.0,
  },
  {
    id: 'elev_atrium_0_m1',
    name: 'Zentral-Glasaufzug (E0 ↔ E-1)',
    kind: 'elevator',
    fromLevel: 0,
    toLevel: -1,
    fromWx: 0.0,
    fromWy: 0.0,
    toWx: 0.0,
    toWy: 0.0,
    travelTimeSec: 1.0,
  },
  {
    id: 'elev_atrium_m1_m2',
    name: 'Zentral-Glasaufzug (E-1 ↔ E-2)',
    kind: 'elevator',
    fromLevel: -1,
    toLevel: -2,
    fromWx: 0.0,
    fromWy: 0.0,
    toWx: 0.0,
    toWy: 0.0,
    travelTimeSec: 1.0,
  },
  {
    id: 'esc_atrium_2_0',
    name: 'Lichthof-Rolltreppe (E+2 ↔ E0)',
    kind: 'escalator',
    fromLevel: 2,
    toLevel: 0,
    fromWx: -1.5,
    fromWy: -0.5,
    toWx: -1.5,
    toWy: -0.5,
    travelTimeSec: 1.4,
  },
  {
    id: 'esc_atrium_0_m2',
    name: 'Lichthof-Rolltreppe (E0 ↔ E-2)',
    kind: 'escalator',
    fromLevel: 0,
    toLevel: -2,
    fromWx: 1.5,
    fromWy: 0.5,
    toWx: 1.5,
    toWy: 0.5,
    travelTimeSec: 1.5,
  },
];

export interface TrackDefinition {
  trackNumber: number;
  label: string;
  level: StationLevelId;
  axis: 'ns' | 'ew';
  laneCoord: number;
  platformCoord: number;
  trainCategory: 'ICE' | 'REGIO' | 'SBAHN' | 'FEX';
}

export const STATION_TRACKS: TrackDefinition[] = [
  {
    trackNumber: 1,
    label: 'Gleis 1 · ICE Fernbahn Nord-Süd',
    level: -2,
    axis: 'ns',
    laneCoord: -7.5,
    platformCoord: -5.8,
    trainCategory: 'ICE',
  },
  {
    trackNumber: 2,
    label: 'Gleis 2 · ICE Sprinter München/Frankfurt',
    level: -2,
    axis: 'ns',
    laneCoord: -4.2,
    platformCoord: -5.8,
    trainCategory: 'ICE',
  },
  {
    trackNumber: 3,
    label: 'Gleis 3 · Regional-Express RE 3',
    level: -2,
    axis: 'ns',
    laneCoord: 0.5,
    platformCoord: -1.2,
    trainCategory: 'REGIO',
  },
  {
    trackNumber: 4,
    label: 'Gleis 4 · FEX Flughafen BER',
    level: -2,
    axis: 'ns',
    laneCoord: 3.8,
    platformCoord: 2.2,
    trainCategory: 'FEX',
  },
  {
    trackNumber: 5,
    label: 'Gleis 5 · U-Bahn U5 Hönow ↔ Hauptbahnhof',
    level: -2,
    axis: 'ew',
    laneCoord: 7.5,
    platformCoord: 6.2,
    trainCategory: 'SBAHN',
  },
  {
    trackNumber: 11,
    label: 'Gleis 11 · ICE Ost-West Köln/Warschau',
    level: 2,
    axis: 'ew',
    laneCoord: -4.5,
    platformCoord: -2.8,
    trainCategory: 'ICE',
  },
  {
    trackNumber: 12,
    label: 'Gleis 12 · RE 1 Magdeburg ↔ Frankfurt(O)',
    level: 2,
    axis: 'ew',
    laneCoord: -1.5,
    platformCoord: -2.8,
    trainCategory: 'REGIO',
  },
  {
    trackNumber: 15,
    label: 'Gleis 15 · S-Bahn S5 / S7 Stadtbahn',
    level: 2,
    axis: 'ew',
    laneCoord: 2.8,
    platformCoord: 1.4,
    trainCategory: 'SBAHN',
  },
  {
    trackNumber: 16,
    label: 'Gleis 16 · S-Bahn S3 / S9 Stadtbahn',
    level: 2,
    axis: 'ew',
    laneCoord: 5.5,
    platformCoord: 4.2,
    trainCategory: 'SBAHN',
  },
];
