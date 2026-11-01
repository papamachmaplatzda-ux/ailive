export type StationLevelId = 2 | 0 | -1 | -2;

export interface LevelMeta {
  id: StationLevelId;
  code: string;
  name: string;
  subtitle: string;
  elevationPx: number; // Vertical isometric screen offset in cutaway view
  color: string;
  accentColor: string;
}

export const STATION_LEVELS: LevelMeta[] = [
  {
    id: 2,
    code: 'E+2',
    name: 'Stadtbahn (Ost-West)',
    subtitle: 'Gleis 11–16 · S-Bahn & Fernbahn Ost-West',
    elevationPx: -235,
    color: '#38bdf8',
    accentColor: '#0284c7',
  },
  {
    id: 0,
    code: 'E 0',
    name: 'Haupthalle & Galerie',
    subtitle: 'Bakeral · DB Info · Press-Shop · Apotheke',
    elevationPx: -65,
    color: '#fbbf24',
    accentColor: '#d97706',
  },
  {
    id: -1,
    code: 'E-1',
    name: 'Verteilerebene',
    subtitle: 'Currywurst · Schließfächer · Bundespolizei',
    elevationPx: 75,
    color: '#a78bfa',
    accentColor: '#7c3aed',
  },
  {
    id: -2,
    code: 'E-2',
    name: 'Tiefbahnhof (Nord-Süd)',
    subtitle: 'Gleis 1–8 · ICE Sprinter · FEX · Regio',
    elevationPx: 215,
    color: '#f87171',
    accentColor: '#dc2626',
  },
];

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
  type: 'bakery' | 'bank_db' | 'press' | 'pharmacy' | 'currywurst' | 'lockers' | 'police' | 'lounge' | 'board' | 'ticket_machine';
  level: StationLevelId;
  wx: number; // World grid X (-14 to +14)
  wy: number; // World grid Y (-14 to +14)
  width: number;
  depth: number;
  roofColor: string;
  facadeColor: string;
  signText: string;
  description: string;
  items: ShopItem[];
}

export const STATION_POIS: StationPOI[] = [
  // === EBENE 0: CENTRAL GALLERY (Directly matching the reference artwork!) ===
  {
    id: 'shop_bakeral',
    name: 'Bakeral — Berliner Backstube',
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
    description: 'Warm duftende Backstube neben dem Glasaufzug. Frische Brezeln, Franzbrötchen und starker Siebträger-Espresso für Pendler.',
    items: [
      {
        id: 'item_espresso',
        name: 'Doppelter Bahnhof-Espresso',
        price: 2.8,
        energyRestore: 35,
        composureRestore: 10,
        speedBoostSec: 18,
        description: '+35 Energie & +25% Schritttempo für 18 Sek.',
        category: 'food',
      },
      {
        id: 'item_brezel',
        name: 'Ofenwarme Butterbrezel',
        price: 2.2,
        energyRestore: 28,
        composureRestore: 15,
        description: 'Knusprige Laugenbrezel direkt aus dem Ofen (+28 Energie, +15 Ruhe).',
        category: 'food',
      },
      {
        id: 'item_berliner',
        name: 'Berliner Pfannkuchen',
        price: 2.5,
        energyRestore: 30,
        composureRestore: 22,
        description: 'Klassischer Berliner mit Pflaumenmus (+30 Energie, +22 Ruhe).',
        category: 'food',
      },
    ],
  },
  {
    id: 'shop_bank_db',
    name: 'DB Reisezentrum & Reisebank',
    shortLabel: 'Bank / DB Info',
    type: 'bank_db',
    level: 0,
    wx: -0.6,
    wy: -3.2,
    width: 2.8,
    depth: 2.0,
    roofColor: '#1e3a8a',
    facadeColor: '#2563eb',
    signText: 'Bank · DB',
    description: 'Fahrkarten-Schalter, Fahrgastrechte-Formulare, Sitzplatzreservierungen und Bargeld-Wechselstube direkt an den Rolltreppen.',
    items: [
      {
        id: 'item_ice_ticket',
        name: 'ICE-Sprinter Flexticket',
        price: 19.0,
        energyRestore: 0,
        composureRestore: 35,
        description: 'Berechtigt zur Mitfahrt in allen ICE-, EC- und IC-Fernzügen auf Gleis 1–4 & 11–12.',
        category: 'ticket',
      },
      {
        id: 'item_ab_ticket',
        name: 'Berlin AB 24h-Fahrausweis',
        price: 9.5,
        energyRestore: 0,
        composureRestore: 25,
        description: 'Freie Fahrt mit S-Bahn, FEX und Regionalverkehr im gesamten Berliner Stadtgebiet.',
        category: 'ticket',
      },
      {
        id: 'item_delay_claim',
        name: 'Fahrgastrechte-Erstattung',
        price: -12.0, // Gives player money if they experienced a delayed train!
        energyRestore: 5,
        composureRestore: 20,
        description: 'Auszahlung von +12 € Entschädigung bei dokumentierter Zugverspätung.',
        category: 'service',
      },
    ],
  },
  {
    id: 'shop_press',
    name: 'Press-Shop & Bahnhofsbuchhandlung',
    shortLabel: 'Press-Shop',
    type: 'press',
    level: 0,
    wx: 4.2,
    wy: -2.4,
    width: 3.4,
    depth: 2.4,
    roofColor: '#991b1b',
    facadeColor: '#dc2626',
    signText: 'Press-shop',
    description: 'Markanter roter Pavillon auf der Galeriebrücke. Internationale Presse, Kursbücher, Stadtpläne und Reiselektüre.',
    items: [
      {
        id: 'item_kursbuch',
        name: 'DB Kursbuch & Hbf-Kompass',
        price: 4.5,
        energyRestore: 10,
        composureRestore: 40,
        description: 'Zeigt alle Gleiswechsel frühzeitig an und beruhigt die Nerven (+40 Ruhe).',
        category: 'press',
      },
      {
        id: 'item_magazine',
        name: 'Berliner Architektur-Journal',
        price: 3.8,
        energyRestore: 12,
        composureRestore: 28,
        description: 'Sonderausgabe über den Lehrter Bahnhof & Glasdach-Konstruktion (+28 Ruhe).',
        category: 'press',
      },
    ],
  },
  {
    id: 'shop_pharmacy',
    name: 'Hbf-Apotheke & Bio-Reformhaus',
    shortLabel: 'Apotheke',
    type: 'pharmacy',
    level: 0,
    wx: 8.2,
    wy: -2.4,
    width: 2.8,
    depth: 2.0,
    roofColor: '#065f46',
    facadeColor: '#10b981',
    signText: 'Apotheke',
    description: 'Grüne Reise-Apotheke neben dem Press-Shop. Schnelle Hilfe bei Reisefieber, Kopfschmerzen und Erschöpfung.',
    items: [
      {
        id: 'item_ginger_shot',
        name: 'Bio-Ingwer-Guarana-Shot',
        price: 3.5,
        energyRestore: 55,
        composureRestore: 15,
        speedBoostSec: 25,
        description: 'Sofortiger Frischekick (+55 Energie & 25 Sek. Sprint-Boost).',
        category: 'food',
      },
      {
        id: 'item_vital_pack',
        name: 'Reise-Vitalpaket & Elektrolyte',
        price: 6.0,
        energyRestore: 80,
        composureRestore: 60,
        description: 'Regeneriert fast die gesamte Energie (+80) und Gelassenheit (+60).',
        category: 'service',
      },
    ],
  },
  {
    id: 'poi_main_board',
    name: 'Große Haupt-Abfahrtstafel (Fallblatt-ZZA)',
    shortLabel: 'Haupt-Abfahrtstafel',
    type: 'board',
    level: 0,
    wx: -7.5,
    wy: 1.5,
    width: 2.6,
    depth: 1.0,
    roofColor: '#1e293b',
    facadeColor: '#1d4ed8',
    signText: 'ABFAHRT · DEPARTURES',
    description: 'Die zentrale elektronische Anzeigetafel über den Fernbahnsteigen mit Echtzeit-Verspätungen und Wagenreihung.',
    items: [],
  },

  // === EBENE +2: STADTBAHN OST-WEST ===
  {
    id: 'shop_sbahn_cafe',
    name: 'Stadtbahn-Kiosk Gleis 13/14',
    shortLabel: 'S-Bahn Kiosk',
    type: 'bakery',
    level: 2,
    wx: -1.5,
    wy: -0.5,
    width: 2.4,
    depth: 1.5,
    roofColor: '#0369a1',
    facadeColor: '#0ea5e9',
    signText: 'S-Bahn Café',
    description: 'Schneller Filterkaffee, Bockwurst und S-Bahn-Tickets direkt unter dem großen Glasdach.',
    items: [
      {
        id: 'item_filterkaffee',
        name: 'Berliner Filterkaffee',
        price: 2.0,
        energyRestore: 25,
        composureRestore: 12,
        description: 'Heiß und ehrlich (+25 Energie, +12 Ruhe).',
        category: 'food',
      },
      {
        id: 'item_kurzstrecke',
        name: 'S-Bahn Kurzstrecken-Ticket',
        price: 2.4,
        energyRestore: 0,
        composureRestore: 15,
        description: 'Gültig für 3 Stationen auf der Berliner Stadtbahn (S3, S5, S7, S9).',
        category: 'ticket',
      },
    ],
  },

  // === EBENE -1: VERTEILEREBENE ===
  {
    id: 'shop_currywurst',
    name: 'Currywurst Express 36',
    shortLabel: 'Currywurst 36',
    type: 'currywurst',
    level: -1,
    wx: -4.5,
    wy: -1.8,
    width: 3.0,
    depth: 1.8,
    roofColor: '#9a3412',
    facadeColor: '#ea580c',
    signText: 'Currywurst 36',
    description: 'Legendäre Berliner Currywurst mit hausgemachter Tomatensauce, Currypulver und knusprigen Pommes.',
    items: [
      {
        id: 'item_currywurst',
        name: 'Currywurst mit Pommes Rot-Weiß',
        price: 5.5,
        energyRestore: 65,
        composureRestore: 30,
        description: 'Herzhafte Stärkung für lange Umsteigezeiten (+65 Energie, +30 Ruhe).',
        category: 'food',
      },
      {
        id: 'item_clubmate',
        name: 'Eiskalte Club-Mate (0,5l)',
        price: 2.6,
        energyRestore: 32,
        composureRestore: 18,
        speedBoostSec: 20,
        description: 'Prickelnder Mate-Eistee (+32 Energie & 20 Sek. Tempo-Boost).',
        category: 'food',
      },
    ],
  },
  {
    id: 'poi_lockers',
    name: 'Gepäck-Schließfächer & Fundbüro',
    shortLabel: 'Schließfächer',
    type: -1 as unknown as 'lockers',
    level: -1,
    wx: 3.8,
    wy: -2.0,
    width: 3.2,
    depth: 1.6,
    roofColor: '#334155',
    facadeColor: '#64748b',
    signText: 'Schließfächer · Fundbüro',
    description: 'Automatische Gepäckaufbewahrung und Abgabestelle für gefundene Reisekoffer.',
    items: [
      {
        id: 'item_locker_rent',
        name: 'Gepäck einlagern (Leichtes Reisen)',
        price: 3.0,
        energyRestore: 20,
        composureRestore: 25,
        speedBoostSec: 35,
        description: 'Befreit von schwerem Gepäck (+20 Energie, +25 Ruhe, 35 Sek. leichtfüßiges Gehen).',
        category: 'service',
      },
    ],
  },
  {
    id: 'poi_police',
    name: 'Bundespolizei & DB Sicherheit',
    shortLabel: 'Bundespolizei',
    type: 'police',
    level: -1,
    wx: 0.0,
    wy: 2.2,
    width: 2.6,
    depth: 1.6,
    roofColor: '#1e3a8a',
    facadeColor: '#3b82f6',
    signText: 'BUNDESPOLIZEI',
    description: 'Sicherheitswache in der Verteilerebene. Melde herrenlose Koffer oder Taschendiebe für Belohnungen.',
    items: [
      {
        id: 'item_report_calm',
        name: 'Sicherheitsmeldung abgeben',
        price: 0,
        energyRestore: 10,
        composureRestore: 45,
        description: 'Stellt Ordnung auf den Bahnsteigen wieder her (+45 Ruhe).',
        category: 'service',
      },
    ],
  },

  // === EBENE -2: TIEFBAHNHOF (GLEIS 1-8) ===
  {
    id: 'poi_deep_service',
    name: 'DB Information & Snackautomat Tiefbahnhof',
    shortLabel: 'DB Info Tief',
    type: 'ticket_machine',
    level: -2,
    wx: 0.2,
    wy: -0.5,
    width: 2.2,
    depth: 1.4,
    roofColor: '#991b1b',
    facadeColor: '#ef4444',
    signText: 'DB Info · Gleis 1–8',
    description: 'Express-Fahrkartenautomat und Service-Insel zwischen den ICE-Fernbahnsteigen.',
    items: [
      {
        id: 'item_automat_snack',
        name: 'Bahnhofs-Schokoriegel & Wasser',
        price: 3.0,
        energyRestore: 30,
        composureRestore: 12,
        description: 'Schneller Snack direkt am ICE-Bahnsteig (+30 Energie).',
        category: 'food',
      },
      {
        id: 'item_sprinter_upgrade',
        name: '1. Klasse Upgrade-Zuschlag',
        price: 11.0,
        energyRestore: 25,
        composureRestore: 50,
        description: 'Exklusiver Komfort und kostenlose Sitzplatzreservierung (+50 Ruhe).',
        category: 'ticket',
      },
    ],
  },
];

// Fix type assignment on poi_lockers
STATION_POIS.find((p) => p.id === 'poi_lockers')!.type = 'lockers';

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
  // Central Twin Glass Elevators (Connect all levels!)
  {
    id: 'elev_west_2_0',
    name: 'Glasaufzug West (E+2 ↔ E0)',
    kind: 'elevator',
    fromLevel: 2,
    toLevel: 0,
    fromWx: -6.2,
    fromWy: -2.5,
    toWx: -6.2,
    toWy: -2.5,
    travelTimeSec: 1.2,
  },
  {
    id: 'elev_west_0_m1',
    name: 'Glasaufzug West (E0 ↔ E-1)',
    kind: 'elevator',
    fromLevel: 0,
    toLevel: -1,
    fromWx: -6.2,
    fromWy: -2.5,
    toWx: -6.2,
    toWy: -2.5,
    travelTimeSec: 1.2,
  },
  {
    id: 'elev_west_m1_m2',
    name: 'Glasaufzug West (E-1 ↔ E-2)',
    kind: 'elevator',
    fromLevel: -1,
    toLevel: -2,
    fromWx: -6.2,
    fromWy: -2.5,
    toWx: -6.2,
    toWy: -2.5,
    travelTimeSec: 1.2,
  },
  // Direct express elevator E0 <-> E-2
  {
    id: 'elev_east_0_m2',
    name: 'Panorama-Glasaufzug Mitte (E0 ↔ E-2 Direkt)',
    kind: 'elevator',
    fromLevel: 0,
    toLevel: -2,
    fromWx: 1.8,
    fromWy: -2.2,
    toWx: 1.8,
    toWy: -2.2,
    travelTimeSec: 1.5,
  },
  // Twin Escalators in center of reference image
  {
    id: 'esc_center_2_0',
    name: 'Rolltreppe zur Stadtbahn (E+2 ↔ E0)',
    kind: 'escalator',
    fromLevel: 2,
    toLevel: 0,
    fromWx: 0.8,
    fromWy: -1.0,
    toWx: 0.8,
    toWy: -0.6,
    travelTimeSec: 1.8,
  },
  {
    id: 'esc_center_0_m1',
    name: 'Zentral-Rolltreppe (E0 ↔ E-1)',
    kind: 'escalator',
    fromLevel: 0,
    toLevel: -1,
    fromWx: 1.2,
    fromWy: 0.2,
    toWx: 1.2,
    toWy: 0.4,
    travelTimeSec: 1.6,
  },
  {
    id: 'esc_center_m1_m2',
    name: 'Tiefbahnhof-Rolltreppe (E-1 ↔ E-2)',
    kind: 'escalator',
    fromLevel: -1,
    toLevel: -2,
    fromWx: 1.5,
    fromWy: 1.2,
    toWx: 1.5,
    toWy: 1.2,
    travelTimeSec: 1.6,
  },
  // Platform Stairs (matching the stairs going down to the red & white trains in reference art)
  {
    id: 'stairs_west_0_m2',
    name: 'Bahnsteig-Treppe Gleis 1–4 (E0 ↔ E-2)',
    kind: 'stairs',
    fromLevel: 0,
    toLevel: -2,
    fromWx: -4.8,
    fromWy: 0.8,
    toWx: -4.8,
    toWy: 1.2,
    travelTimeSec: 2.0,
  },
  {
    id: 'stairs_east_0_m2',
    name: 'Bahnsteig-Treppe Gleis 5–8 (E0 ↔ E-2)',
    kind: 'stairs',
    fromLevel: 0,
    toLevel: -2,
    fromWx: 4.5,
    fromWy: 1.2,
    toWx: 4.5,
    toWy: 1.6,
    travelTimeSec: 2.0,
  },
];

export interface TrackDefinition {
  trackNumber: number;
  label: string;
  level: StationLevelId;
  axis: 'ns' | 'ew'; // North-South (-2) or East-West (+2)
  laneCoord: number; // Perpendicular world coordinate
  platformCoord: number; // Where passengers stand to wait/board
  trainCategory: 'ICE' | 'REGIO' | 'SBAHN' | 'FEX';
}

export const STATION_TRACKS: TrackDefinition[] = [
  // Ebene -2: Deep North-South Platforms (Gleis 1–8)
  {
    trackNumber: 1,
    label: 'Gleis 1 · ICE Fernbahn Süd',
    level: -2,
    axis: 'ns',
    laneCoord: -8.5,
    platformCoord: -7.0,
    trainCategory: 'ICE',
  },
  {
    trackNumber: 2,
    label: 'Gleis 2 · ICE Sprinter München/Frankfurt',
    level: -2,
    axis: 'ns',
    laneCoord: -5.5,
    platformCoord: -6.8,
    trainCategory: 'ICE',
  },
  {
    trackNumber: 3,
    label: 'Gleis 3 · Regional-Express & FEX',
    level: -2,
    axis: 'ns',
    laneCoord: -1.8,
    platformCoord: -0.4,
    trainCategory: 'REGIO',
  },
  {
    trackNumber: 4,
    label: 'Gleis 4 · EuroCity Prag/Wien',
    level: -2,
    axis: 'ns',
    laneCoord: 1.2,
    platformCoord: -0.2,
    trainCategory: 'REGIO',
  },
  {
    trackNumber: 5,
    label: 'Gleis 5 · FEX Flughafen BER',
    level: -2,
    axis: 'ns',
    laneCoord: 4.4,
    platformCoord: 5.8,
    trainCategory: 'FEX',
  },
  {
    trackNumber: 6,
    label: 'Gleis 6 · ICE Nord Hamburg/Kiel',
    level: -2,
    axis: 'ns',
    laneCoord: 7.4,
    platformCoord: 6.0,
    trainCategory: 'ICE',
  },

  // Ebene +2: Elevated East-West Stadtbahn (Gleis 11–16)
  {
    trackNumber: 11,
    label: 'Gleis 11 · ICE Ost-West Köln/Warschau',
    level: 2,
    axis: 'ew',
    laneCoord: -5.5,
    platformCoord: -3.8,
    trainCategory: 'ICE',
  },
  {
    trackNumber: 12,
    label: 'Gleis 12 · RE1 Magdeburg ↔ Frankfurt (Oder)',
    level: 2,
    axis: 'ew',
    laneCoord: -2.2,
    platformCoord: -3.6,
    trainCategory: 'REGIO',
  },
  {
    trackNumber: 15,
    label: 'Gleis 15 · S-Bahn S5 / S7 Richtung Ostkreuz',
    level: 2,
    axis: 'ew',
    laneCoord: 2.8,
    platformCoord: 1.4,
    trainCategory: 'SBAHN',
  },
  {
    trackNumber: 16,
    label: 'Gleis 16 · S-Bahn S3 / S9 Richtung Zoologischer Garten',
    level: 2,
    axis: 'ew',
    laneCoord: 5.6,
    platformCoord: 4.2,
    trainCategory: 'SBAHN',
  },
];

export interface CommuterQuest {
  id: string;
  title: string;
  giverName: string;
  giverRole: string;
  level: StationLevelId;
  targetType: 'board_train' | 'buy_item' | 'visit_poi' | 'assist_npc';
  targetId: string;
  targetLevel: StationLevelId;
  rewardEuro: number;
  rewardXp: number;
  description: string;
  completed: boolean;
}

export const INITIAL_QUESTS: CommuterQuest[] = [
  {
    id: 'quest_morning_espresso',
    title: 'Pendler-Ritual: Espresso bei Bakeral',
    giverName: 'Station-Leitstelle',
    giverRole: 'Tagesauftakt',
    level: 0,
    targetType: 'buy_item',
    targetId: 'shop_bakeral',
    targetLevel: 0,
    rewardEuro: 8,
    rewardXp: 50,
    description: 'Kaufe einen Espresso oder eine warme Butterbrezel in der Bäckerei Bakeral auf Ebene 0.',
    completed: false,
  },
  {
    id: 'quest_tourist_ice',
    title: 'Anschluss-Sicherung: ICE 1001 auf Gleis 1/2',
    giverName: 'Dr. Clara Lindemann',
    giverRole: 'Fernreisende nach München',
    level: -2,
    targetType: 'visit_poi',
    targetId: 'poi_deep_service',
    targetLevel: -2,
    rewardEuro: 15,
    rewardXp: 85,
    description: 'Begib dich über die Rolltreppe oder den Glasaufzug in den Tiefbahnhof (Ebene -2) zum DB Info-Punkt an den ICE-Gleisen.',
    completed: false,
  },
  {
    id: 'quest_press_kursbuch',
    title: 'Fahrplan-Check am Press-Shop',
    giverName: 'Bahnhofsmanager Weber',
    giverRole: 'DB Station & Service',
    level: 0,
    targetType: 'buy_item',
    targetId: 'shop_press',
    targetLevel: 0,
    rewardEuro: 12,
    rewardXp: 70,
    description: 'Besorge das aktuelle Kursbuch oder Architektur-Journal im roten Press-Shop auf der Galeriebrücke (Ebene 0).',
    completed: false,
  },
  {
    id: 'quest_sbahn_panorama',
    title: 'Stadtbahn-Kontrolle unter dem Glasdach',
    giverName: 'S-Bahn Aufsicht',
    giverRole: 'Gleis 15/16',
    level: 2,
    targetType: 'visit_poi',
    targetId: 'shop_sbahn_cafe',
    targetLevel: 2,
    rewardEuro: 18,
    rewardXp: 100,
    description: 'Fahre auf die Ebene +2 (Stadtbahn Ost-West) und prüfe den S-Bahn-Kiosk an Gleis 13–16.',
    completed: false,
  },
  {
    id: 'quest_board_any_train',
    title: 'Pünktliche Abfahrt: Zug Einstieg',
    giverName: 'Fahrdienstleitung Berlin Hbf',
    giverRole: 'Hauptauftrag',
    level: -2,
    targetType: 'board_train',
    targetId: 'any',
    targetLevel: -2,
    rewardEuro: 25,
    rewardXp: 150,
    description: 'Steige in einen eingefahrenen Zug (Status: BOARDING) auf Ebene -2 oder Ebene +2 ein (Taste [E] am offenen Zug).',
    completed: false,
  },
];
