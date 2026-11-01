import React from 'react';
import {
  STATION_LEVELS,
  STATION_POIS,
  StationLevelId,
  StationPOI,
  ShopItem,
  CommuterQuest,
} from '../game/stationData';
import { ScheduledTrain, formatStationTime } from '../game/rules';
import { NearbyInteraction } from './IsometricCanvas';

interface TitleScreenOverlayProps {
  selectedRole: 'commuter' | 'manager';
  onSelectRole: (role: 'commuter' | 'manager') => void;
  onStartGame: () => void;
  onOpenBlueprint: () => void;
}

export const TitleScreenOverlay: React.FC<TitleScreenOverlayProps> = ({
  selectedRole,
  onSelectRole,
  onStartGame,
  onOpenBlueprint,
}) => {
  return (
    <div
      className="fixed inset-0 z-30 flex flex-col justify-between p-8 md:p-14 pointer-events-none"
      style={{
        background:
          'linear-gradient(90deg, rgba(10, 15, 26, 0.94) 0%, rgba(10, 15, 26, 0.82) 38%, rgba(10, 15, 26, 0.18) 72%, rgba(10, 15, 26, 0.05) 100%)',
      }}
    >
      {/* Left-Third Asymmetric Negative Space Column */}
      <div className="max-w-lg pointer-events-auto my-auto">
        {/* Bespoke Inline SVG Title Emblem Lockup */}
        <div className="mb-6">
          <svg
            viewBox="0 0 440 132"
            className="w-full max-w-[420px] h-auto drop-shadow-[0_6px_18px_rgba(0,0,0,0.75)]"
            role="img"
            aria-label="BERLIN HBF — Isometrische Bahnhof-Simulation"
          >
            {/* Outer Architectural Steel Arch Frame */}
            <rect
              x="3"
              y="6"
              width="434"
              height="120"
              rx="8"
              fill="#0f172a"
              stroke="#475569"
              strokeWidth="2.5"
            />
            <rect
              x="10"
              y="13"
              width="420"
              height="106"
              rx="5"
              fill="#1e293b"
              stroke="#334155"
              strokeWidth="1.5"
            />

            {/* Iconic DB Red-Inspired Emblem Badge */}
            <rect
              x="24"
              y="28"
              width="68"
              height="48"
              rx="6"
              fill="#dc2626"
              stroke="#fca5a5"
              strokeWidth="2"
            />
            <text
              x="58"
              y="61"
              textAnchor="middle"
              fill="#ffffff"
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontWeight="700"
              fontSize="28"
              letterSpacing="1"
            >
              Hbf
            </text>

            {/* Primary Display Title */}
            <text
              x="108"
              y="54"
              fill="#f8fafc"
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontWeight="700"
              fontSize="30"
              letterSpacing="2"
            >
              BERLIN HBF
            </text>
            <text
              x="108"
              y="74"
              fill="#fbbf24"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="600"
              fontSize="12.5"
              letterSpacing="1.6"
            >
              ISOMETRISCHE 2D RPG-SIMULATION
            </text>

            {/* Split-Flap Track Indicator Strip at Bottom of Plaque */}
            <line x1="24" y1="88" x2="416" y2="88" stroke="#334155" strokeWidth="1.5" />
            <text
              x="24"
              y="107"
              fill="#94a3b8"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="600"
              fontSize="9.8"
            >
              4 EBENEN (E+2 BIS E-2) · GLEIS 1–16 · KI-PENDLER &amp; LIVE-FAHRPLAN
            </text>
          </svg>
        </div>

        <p className="text-slate-300 text-base leading-relaxed mb-6 max-w-[54ch]">
          Erkunde den mehrstöckigen Berliner Hauptbahnhof im Querschnitt: Vom
          gläsernen Stadtbahn-Viadukt über die Einkaufspassage mit{' '}
          <span className="text-amber-300 font-semibold">Bakeral</span> und{' '}
          <span className="text-red-400 font-semibold">Press-Shop</span> bis zu den
          ICE-Sprintern im Tiefbahnhof.
        </p>

        {/* Role Selector (2 clean segmented buttons) */}
        <div className="mb-6">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
            Start-Rolle wählen
          </div>
          <div className="grid grid-cols-2 gap-2.5 p-1.5 bg-slate-900/95 border border-slate-700 rounded-lg">
            <button
              type="button"
              onClick={() => onSelectRole('commuter')}
              className={`px-3.5 py-2.5 rounded-md text-left transition-colors ${
                selectedRole === 'commuter'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <div className="text-sm font-semibold whitespace-nowrap">Fernreise-Pendler</div>
              <div className="text-xs opacity-80">Start: 45 € · Fokus: Züge &amp; Läden</div>
            </button>
            <button
              type="button"
              onClick={() => onSelectRole('manager')}
              className={`px-3.5 py-2.5 rounded-md text-left transition-colors ${
                selectedRole === 'manager'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <div className="text-sm font-semibold whitespace-nowrap">DB Stationsleiter</div>
              <div className="text-xs opacity-80">Start: 80 € · Fokus: Betrieb &amp; Hilfe</div>
            </button>
          </div>
        </div>

        {/* Primary CTA + Secondary Blueprint Inspection Action (<= 3 actions total) */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStartGame();
            }}
            className="px-7 py-3.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-base rounded-lg shadow-[0_4px_20px_rgba(220,38,38,0.45)] transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
          >
            Simulation Starten
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenBlueprint();
            }}
            className="px-4 py-3.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            Architektur-Querschnitt ansehen
          </button>
        </div>
      </div>

      {/* Bottom Safe-Margin Single Flat Control-Hint Line */}
      <div className="text-xs font-mono text-slate-300 tracking-wide pointer-events-none">
        WASD / Klick Bewegen · E Interagieren · Space Sprint-Durchsage · 1–4 Ebenen · Tab Fahrplan · Esc Pause
      </div>
    </div>
  );
};

interface PlayingHudProps {
  energy: number;
  ghostEnergy: number;
  composure: number;
  euros: number;
  xp: number;
  boardedCount: number;
  stationMinutes: number;
  activeLevel: StationLevelId;
  playerLevel: StationLevelId;
  viewMode: 'cutaway' | 'single';
  trains: ScheduledTrain[];
  quests: CommuterQuest[];
  nearby: NearbyInteraction | null;
  announcement: string | null;
  muted: boolean;
  timeScale: number;
  onSelectLevel: (lvl: StationLevelId) => void;
  onToggleViewMode: () => void;
  onWalkToPoi: (poi: StationPOI) => void;
  onInteract: (nearby: NearbyInteraction) => void;
  onOpenShop: (poi: StationPOI) => void;
  onOpenTimetable: () => void;
  onOpenBlueprint: () => void;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onRestart: () => void;
  onToggleFastForward: () => void;
}

export const PlayingHud: React.FC<PlayingHudProps> = ({
  energy,
  ghostEnergy,
  composure,
  euros,
  xp,
  boardedCount,
  stationMinutes,
  activeLevel,
  playerLevel,
  viewMode,
  trains,
  quests,
  nearby,
  announcement,
  muted,
  timeScale,
  onSelectLevel,
  onToggleViewMode,
  onWalkToPoi,
  onInteract,
  onOpenShop,
  onOpenTimetable,
  onOpenBlueprint,
  onToggleMute,
  onTogglePause,
  onRestart,
  onToggleFastForward,
}) => {
  const activeQuest = quests.find((q) => !q.completed) ?? quests[quests.length - 1];
  const completedCount = quests.filter((q) => q.completed).length;

  // Discrete 5 vitality sockets for Composure (Ruhe/Pünktlichkeits-Moral)
  const renderVitalitySockets = (value: number) => {
    return Array.from({ length: 5 }, (_, idx) => {
      const thresholdFull = (idx + 1) * 20;
      const thresholdDamaged = idx * 20 + 8;
      const state: 'full' | 'damaged' | 'empty' =
        value >= thresholdFull ? 'full' : value >= thresholdDamaged ? 'damaged' : 'empty';

      return (
        <svg
          key={idx}
          viewBox="0 0 24 24"
          className="w-5 h-5 shrink-0"
          aria-hidden="true"
        >
          {/* Dark outer silhouette */}
          <polygon
            points="12,2 22,7 22,17 12,22 2,17 2,7"
            fill="#0f172a"
            stroke="#334155"
            strokeWidth="2"
          />
          {state === 'full' && (
            <>
              <polygon points="12,4 19,8 19,16 12,20 5,16 5,8" fill="#10b981" />
              <polygon points="12,4 19,8 12,11 5,8" fill="#6ee7b7" />
            </>
          )}
          {state === 'damaged' && (
            <>
              <polygon points="12,4 19,8 19,16 12,20 5,16 5,8" fill="#f59e0b" />
              <line x1="7" y1="7" x2="17" y2="17" stroke="#0f172a" strokeWidth="2.2" />
            </>
          )}
        </svg>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3.5 md:p-5">
      {/* Low Energy Peripheral Vignette */}
      {energy < 28 && (
        <div
          className="fixed inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            boxShadow: 'inset 0 0 90px rgba(220, 38, 38, 0.55)',
          }}
        />
      )}

      {/* TOP ROW: Left Status Cluster + Right Departure ZZA & Utility Controls */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* TOP-LEFT CLUSTER: World-Matched Steel Status Plaque & Active Quest */}
        <div className="flex flex-col gap-2 max-w-md pointer-events-auto">
          <div
            className="px-4 py-2.5 rounded-lg border border-slate-700 text-slate-100 shadow-lg"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.94)' }}
          >
            <div className="flex items-center gap-5">
              {/* Energie Gauge with Delayed Ghost Bar */}
              <div className="min-w-[125px]">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    ENERGIE
                  </span>
                  <span
                    className="text-lg font-bold font-mono tabular-nums text-amber-400"
                    style={{ paintOrder: 'stroke fill' }}
                  >
                    {Math.round(energy)}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded overflow-hidden relative border border-slate-800">
                  {/* Delayed ghost drain bar */}
                  <div
                    className="absolute inset-y-0 left-0 bg-red-500/70 transition-all duration-300"
                    style={{ width: `${Math.max(0, Math.min(100, ghostEnergy))}%` }}
                  />
                  {/* Primary live bar */}
                  <div
                    className="absolute inset-y-0 left-0 bg-amber-400 transition-all duration-100"
                    style={{ width: `${Math.max(0, Math.min(100, energy))}%` }}
                  />
                </div>
              </div>

              {/* Discrete Vitality Pips (Gelassenheit / Ruhe) */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                  GELASSENHEIT · {Math.round(composure)}
                </div>
                <div className="flex items-center gap-1">{renderVitalitySockets(composure)}</div>
              </div>

              {/* Guthaben (€) */}
              <div className="shrink-0">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  BUDGET
                </div>
                <div className="text-xl font-bold font-mono tabular-nums text-emerald-400 whitespace-nowrap">
                  {Math.round(euros)} €
                </div>
              </div>

              {/* Reputation / XP */}
              <div className="shrink-0">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  RUF / ZÜGE
                </div>
                <div className="text-xl font-bold font-mono tabular-nums text-sky-400 whitespace-nowrap">
                  {Math.round(xp)} <span className="text-xs text-slate-400">({boardedCount})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Commuter Quest Strip */}
          {activeQuest && (
            <div
              className="px-3.5 py-2 rounded-lg border border-slate-700/90 flex items-center justify-between gap-3 shadow-md"
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
            >
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400">
                  AUFTRAG {completedCount + 1}/{quests.length} · EBENE{' '}
                  {activeQuest.targetLevel > 0
                    ? `+${activeQuest.targetLevel}`
                    : activeQuest.targetLevel}
                </div>
                <div className="text-xs font-semibold text-white truncate">
                  {activeQuest.title}
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  {activeQuest.description}
                </div>
              </div>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  const targetPoi = STATION_POIS.find((p) => p.id === activeQuest.targetId);
                  if (targetPoi) {
                    onWalkToPoi(targetPoi);
                  } else {
                    onSelectLevel(activeQuest.targetLevel);
                  }
                }}
                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded shrink-0 cursor-pointer transition-colors"
              >
                Hinweg
              </button>
            </div>
          )}
        </div>

        {/* TOP-RIGHT CLUSTER: Authentic DB Blue Split-Flap ZZA Board + Utility Icons */}
        <div className="flex items-start gap-2.5 pointer-events-auto">
          {/* Live ZZA Departure Mini-Board */}
          <div
            onClick={onOpenTimetable}
            role="button"
            tabIndex={0}
            aria-label="Live Zugfahrplan öffnen"
            onKeyDown={(e) => {
              if (e.key === 'Enter') onOpenTimetable();
            }}
            className="px-3.5 py-2 rounded-lg border border-blue-400/50 cursor-pointer shadow-lg hover:border-blue-300 transition-colors"
            style={{ backgroundColor: 'rgba(23, 37, 84, 0.95)' }}
          >
            <div className="flex items-center justify-between gap-4 border-b border-blue-800 pb-1 mb-1.5">
              <span className="text-[10px] font-mono font-bold tracking-wider text-amber-300">
                ABFAHRT BERLIN HBF · [TAB]
              </span>
              <span className="text-xs font-mono font-bold tabular-nums text-white">
                {formatStationTime(stationMinutes)} Uhr
              </span>
            </div>
            <div className="space-y-1 font-mono text-[11px] tabular-nums">
              {trains.slice(0, 3).map((tr) => (
                <div key={tr.id} className="flex items-center justify-between gap-3 text-white">
                  <span className="font-bold text-amber-300 w-16 shrink-0">{tr.lineCode}</span>
                  <span className="truncate w-28 text-blue-100">{tr.destination}</span>
                  <span className="text-sky-300 shrink-0">Gl. {tr.trackNumber}</span>
                  <span
                    className={`w-20 text-right font-semibold shrink-0 ${
                      tr.state === 'BOARDING'
                        ? 'text-emerald-300'
                        : tr.delayMinutes > 0
                        ? 'text-amber-300'
                        : 'text-blue-200'
                    }`}
                  >
                    {tr.state === 'BOARDING'
                      ? 'EINSTIEG'
                      : tr.state === 'APPROACHING'
                      ? 'EINFAHRT'
                      : tr.delayMinutes > 0
                      ? `+${tr.delayMinutes} Min`
                      : `in ${Math.ceil(tr.stateTimerSec)}s`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Square Utility Control Buttons (Fast-Forward, Blueprint, Mute, Pause, Restart) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Zeitraffer umschalten"
              title="Zeitraffer (1x / 2.5x)"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleFastForward();
              }}
              className={`w-10 h-10 rounded-lg border flex items-center justify-center font-mono text-xs font-bold cursor-pointer transition-colors ${
                timeScale > 1
                  ? 'bg-amber-500 text-slate-950 border-amber-300'
                  : 'bg-slate-900/95 text-slate-200 border-slate-700 hover:bg-slate-800'
              }`}
            >
              {timeScale > 1 ? '2.5x' : '1x'}
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Architektur-Querschnitt öffnen [K]"
              title="Architektur-Vorlage & Querschnitt [K]"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenBlueprint();
              }}
              className="w-10 h-10 rounded-lg bg-slate-900/95 hover:bg-slate-800 text-amber-300 border border-slate-700 flex items-center justify-center cursor-pointer transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                <line x1="9" y1="3" x2="9" y2="18" />
                <line x1="15" y1="6" x2="15" y2="21" />
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label={muted ? 'Ton einschalten [M]' : 'Ton stummschalten [M]'}
              title="Ton umschalten [M]"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="w-10 h-10 rounded-lg bg-slate-900/95 hover:bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center cursor-pointer transition-colors"
            >
              {muted ? (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Simulation pausieren [P]"
              title="Pause [P / Esc]"
              onClick={(e) => {
                e.currentTarget.blur();
                onTogglePause();
              }}
              className="w-10 h-10 rounded-lg bg-slate-900/95 hover:bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center cursor-pointer transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Schicht neu starten [R]"
              title="Neustart [R]"
              onClick={(e) => {
                e.currentTarget.blur();
                onRestart();
              }}
              className="w-10 h-10 rounded-lg bg-slate-900/95 hover:bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center cursor-pointer transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: Left Architectural Level Switcher + Center Contextual Prompt + Right Quick POIs */}
      <div className="flex flex-col gap-2">
        {/* Live Station Loud-Speaker Banner docked cleanly at bottom perimeter so center playfield stays 100% clear */}
        {announcement && (
          <div className="mx-auto px-3.5 py-1 rounded bg-blue-950/90 border border-amber-400/50 text-amber-200 text-[11px] font-mono shadow pointer-events-none truncate max-w-2xl">
            Durchsage: {announcement}
          </div>
        )}
        <div className="flex flex-wrap items-end justify-between gap-3">
        {/* BOTTOM-LEFT: Multi-Level Selector (E+2, E0, E-1, E-2 + Cutaway Mode) */}
        <div
          className="p-2.5 rounded-lg border border-slate-700 pointer-events-auto shadow-lg"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.94)' }}
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              BAHNHOFS-EBENEN (SPIELER: {playerLevel > 0 ? `+${playerLevel}` : playerLevel})
            </span>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleViewMode();
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold cursor-pointer transition-colors ${
                viewMode === 'cutaway'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
              }`}
            >
              {viewMode === 'cutaway' ? 'Querschnitt (Alle)' : 'Einzel-Ebene Fokus'}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {STATION_LEVELS.map((lvl, idx) => {
              const isPlayerHere = playerLevel === lvl.id;
              const isFocused = activeLevel === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSelectLevel(lvl.id);
                  }}
                  className={`px-3 py-1.5 rounded-md text-left border transition-colors cursor-pointer ${
                    isPlayerHere
                      ? 'bg-sky-600 text-white border-sky-300'
                      : isFocused
                      ? 'bg-slate-800 text-white border-slate-500'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold">{lvl.code}</span>
                    <span className="text-[10px] font-mono opacity-75">[{idx + 1}]</span>
                  </div>
                  <div className="text-[10px] truncate max-w-[92px] opacity-90">{lvl.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* BOTTOM-CENTER: Context-Sensitive Interaction Prompt */}
        {nearby && (
          <div
            className="px-4 py-3 rounded-lg border-2 border-amber-400 text-white shadow-xl flex items-center gap-4 pointer-events-auto"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.96)' }}
          >
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-amber-300">
                INTERAKTION BEREIT
              </div>
              <div className="text-sm font-bold">{nearby.title}</div>
              <div className="text-xs text-slate-300 max-w-xs truncate">{nearby.subtitle}</div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onInteract(nearby);
              }}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-md cursor-pointer whitespace-nowrap transition-colors"
            >
              {nearby.actionLabel}
            </button>
          </div>
        )}

        {/* BOTTOM-RIGHT: Quick Station Landmarks & Shops Directory */}
        <div
          className="p-2.5 rounded-lg border border-slate-700 pointer-events-auto shadow-lg"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.94)' }}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
            DIREKTWAHL: LÄDEN &amp; SCHALTER
          </div>
          <div className="flex flex-wrap items-center gap-1.5 max-w-md">
            {STATION_POIS.filter((p) => p.items.length > 0).map((poi) => (
              <button
                key={poi.id}
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onWalkToPoi(poi);
                  onOpenShop(poi);
                }}
                className="px-2.5 py-1.5 rounded bg-slate-800/95 hover:bg-slate-700 text-slate-100 border border-slate-600/80 text-xs font-medium cursor-pointer transition-colors whitespace-nowrap"
              >
                {poi.shortLabel}{' '}
                <span className="text-[10px] font-mono text-amber-300">
                  (E{poi.level > 0 ? `+${poi.level}` : poi.level})
                </span>
              </button>
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

interface ShopModalProps {
  poi: StationPOI;
  euros: number;
  onBuyItem: (poi: StationPOI, item: ShopItem) => void;
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ poi, euros, onBuyItem, onClose }) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70 pointer-events-auto">
      <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
          <div>
            <div className="text-xs font-mono text-amber-400">
              EBENE {poi.level > 0 ? `+${poi.level}` : poi.level} · GEÖFFNET
            </div>
            <h2 className="text-xl font-bold text-white">{poi.name}</h2>
            <p className="text-xs text-slate-300 mt-1">{poi.description}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] font-mono text-slate-400">DEIN BUDGET</div>
            <div className="text-lg font-mono font-bold tabular-nums text-emerald-400">
              {Math.round(euros)} €
            </div>
          </div>
        </div>

        <div className="space-y-2.5 mb-5">
          {poi.items.map((item) => {
            const canAfford = item.price <= 0 || euros >= item.price;
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-lg bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-sm font-semibold text-white">{item.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
                </div>
                <button
                  type="button"
                  disabled={!canAfford}
                  onClick={() => onBuyItem(poi, item)}
                  className={`px-4 py-2 rounded-lg font-mono text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    canAfford
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {item.price < 0
                    ? `+${Math.abs(item.price)} € Erhalten`
                    : item.price === 0
                    ? 'Melden (0 €)'
                    : `Kaufen · ${item.price.toFixed(2)} €`}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Schließen [Esc]
          </button>
        </div>
      </div>
    </div>
  );
};

interface TimetableModalProps {
  trains: ScheduledTrain[];
  stationMinutes: number;
  onTriggerTrackSwap: () => void;
  onBoardTrain: (train: ScheduledTrain) => void;
  onJumpToTrainPlatform: (train: ScheduledTrain) => void;
  onClose: () => void;
}

export const TimetableModal: React.FC<TimetableModalProps> = ({
  trains,
  stationMinutes,
  onTriggerTrackSwap,
  onBoardTrain,
  onJumpToTrainPlatform,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75 pointer-events-auto">
      <div className="w-full max-w-4xl rounded-xl bg-blue-950 border-2 border-blue-400/60 p-6 text-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-blue-800 pb-4 mb-4">
          <div>
            <div className="text-xs font-mono text-amber-300">
              DEUTSCHE BAHN · DYNAMISCHES ZUGFAHRPLAN-SYSTEM
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Abfahrt &amp; Ankunft — Berlin Hauptbahnhof
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-bold tabular-nums bg-blue-900 px-3 py-1 rounded border border-blue-700">
              {formatStationTime(stationMinutes)} Uhr
            </span>
            <button
              type="button"
              onClick={onTriggerTrackSwap}
              className="px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer whitespace-nowrap"
            >
              Gleiswechsel-Alarm auslösen (KI-Test)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto mb-5">
          <table className="w-full text-left border-collapse font-mono text-xs tabular-nums">
            <thead>
              <tr className="border-b border-blue-800 text-blue-300 uppercase">
                <th className="py-2 px-2">Linie</th>
                <th className="py-2 px-2">Von / Über</th>
                <th className="py-2 px-2">Zielbahnhof</th>
                <th className="py-2 px-2">Ebene / Gleis</th>
                <th className="py-2 px-2">Fahrgäste</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-900/70">
              {trains.map((tr) => (
                <tr key={tr.id} className="hover:bg-blue-900/40">
                  <td className="py-2.5 px-2 font-bold text-amber-300 whitespace-nowrap">
                    {tr.lineCode}
                  </td>
                  <td className="py-2.5 px-2 text-blue-200">{tr.via}</td>
                  <td className="py-2.5 px-2 font-bold text-white">{tr.destination}</td>
                  <td className="py-2.5 px-2 whitespace-nowrap">
                    E{tr.level > 0 ? `+${tr.level}` : tr.level} · Gleis {tr.trackNumber}
                    {tr.trackChanged && (
                      <span className="ml-1.5 text-amber-300 font-bold">(Geändert)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-sky-200">
                    {tr.passengersBoarded} eingestiegen / {tr.passengersWaiting} wartend
                  </td>
                  <td className="py-2.5 px-2 whitespace-nowrap">
                    {tr.state === 'BOARDING' ? (
                      <span className="text-emerald-300 font-bold">
                        EINSTIEG ({Math.ceil(tr.stateTimerSec)}s)
                      </span>
                    ) : tr.state === 'APPROACHING' ? (
                      <span className="text-sky-300 font-semibold">EINFAHRT LÄUFT</span>
                    ) : tr.state === 'DEPARTING' ? (
                      <span className="text-amber-300">ABFAHRT</span>
                    ) : (
                      <span className="text-blue-200">
                        Planmäßig ({Math.ceil(tr.stateTimerSec)}s)
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onJumpToTrainPlatform(tr)}
                        className="px-2.5 py-1 rounded bg-blue-800 hover:bg-blue-700 text-white text-[11px] cursor-pointer"
                      >
                        Zum Bahnsteig
                      </button>
                      {tr.state === 'BOARDING' && (
                        <button
                          type="button"
                          onClick={() => onBoardTrain(tr)}
                          className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] cursor-pointer"
                        >
                          Einsteigen
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-xs text-blue-200">
          <span>
            Hinweis: Bei einem Gleiswechsel berechnen alle wartenden KI-Pendler ihre Route über
            Rolltreppen und Aufzüge automatisch neu.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-blue-800 hover:bg-blue-700 text-white font-semibold cursor-pointer whitespace-nowrap shrink-0"
          >
            Schließen [Tab / Esc]
          </button>
        </div>
      </div>
    </div>
  );
};

interface BlueprintModalProps {
  onSelectLandmark: (level: StationLevelId, wx: number, wy: number) => void;
  onClose: () => void;
}

export const BlueprintModal: React.FC<BlueprintModalProps> = ({
  onSelectLandmark,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 pointer-events-auto">
      <div className="w-full max-w-5xl rounded-xl bg-slate-900 border border-slate-700 p-5 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <div className="text-xs font-mono text-amber-400">
              ARCHITEKTUR-REFERENZ &amp; INTERAKTIVER SCHNELLREISE-PLAN
            </div>
            <h2 className="text-xl font-bold text-white">
              Berliner Hauptbahnhof — Isometrischer Ebenen-Querschnitt
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Zurück zur Live-Simulation [Esc]
          </button>
        </div>

        {/* Embedded Reference Artwork with Interactive Schnellreise Hotspots */}
        <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-950 aspect-video max-h-[64vh] mx-auto">
          <img
            src="/assets/aistudio/ONE_standalone_full_bleed_isometric_2D_RPG_GAME_MAP_for_Berl_d2dca29c.png"
            alt="Isometrischer Querschnitt Berlin Hauptbahnhof mit ICE-Zügen, S-Bahn, Bakeral, Bank und Press-Shop"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />

          {/* Interactive Hotspots Matching the Exact Positions in the Artwork */}
          <button
            type="button"
            onClick={() => onSelectLandmark(0, -4.2, -2.0)}
            style={{ left: '45%', top: '28%' }}
            className="absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg cursor-pointer whitespace-nowrap"
          >
            Bakeral (E0)
          </button>

          <button
            type="button"
            onClick={() => onSelectLandmark(0, -0.6, -2.0)}
            style={{ left: '57%', top: '34%' }}
            className="absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg cursor-pointer whitespace-nowrap"
          >
            Bank · DB Info (E0)
          </button>

          <button
            type="button"
            onClick={() => onSelectLandmark(0, 4.2, -1.2)}
            style={{ left: '68%', top: '42%' }}
            className="absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg cursor-pointer"
          >
            Press-Shop (E0)
          </button>

          <button
            type="button"
            onClick={() => onSelectLandmark(2, 0, 1.4)}
            style={{ left: '66%', top: '18%' }}
            className="absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg cursor-pointer"
          >
            Stadtbahn Gleis 15/16 (E+2)
          </button>

          <button
            type="button"
            onClick={() => onSelectLandmark(-2, -6.8, 0)}
            style={{ left: '22%', top: '56%' }}
            className="absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded bg-slate-900/95 hover:bg-slate-800 text-white border border-red-400 font-bold text-xs shadow-lg cursor-pointer"
          >
            ICE Sprinter Gleis 1/2 (E-2)
          </button>

          <button
            type="button"
            onClick={() => onSelectLandmark(-2, 5.8, 0)}
            style={{ left: '68%', top: '76%' }}
            className="absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded bg-slate-900/95 hover:bg-slate-800 text-white border border-amber-400 font-bold text-xs shadow-lg cursor-pointer"
          >
            Tiefbahnhof Gleis 5/6 (E-2)
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-3 text-center">
          Klicke auf einen Standort im Architekturplan, um direkt dorthin zu wechseln.
        </p>
      </div>
    </div>
  );
};

interface StatusModalProps {
  mode: 'paused' | 'victory' | 'defeat';
  stats: {
    xp: number;
    bestXp: number;
    euros: number;
    boardedCount: number;
    completedQuests: number;
    totalQuests: number;
  };
  onResume?: () => void;
  onCompleteShift?: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  mode,
  stats,
  onResume,
  onCompleteShift,
  onRestart,
  onReturnTitle,
}) => {
  const isVictory = mode === 'victory';
  const isDefeat = mode === 'defeat';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 pointer-events-auto">
      <div className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl">
        <div className="text-xs font-mono uppercase tracking-wider text-amber-400 mb-1">
          {mode === 'paused'
            ? 'BETRIEBSPAUSE · BERLIN HBF'
            : isVictory
            ? 'SCHICHT-BILANZ · ERFOLGREICH ABGESCHLOSSEN'
            : 'ERSCHÖPFUNG · ANSCHLUSS VERPASST'}
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {mode === 'paused'
            ? 'Simulation Pausiert'
            : isVictory
            ? 'Meister der Schiene!'
            : 'Reise-Stress Überlastung'}
        </h2>
        <p className="text-xs text-slate-300 mb-5">
          {mode === 'paused'
            ? 'Alle Züge, Rolltreppen und KI-Pendler warten auf deine Rückkehr.'
            : isVictory
            ? 'Du hast den Berliner Hauptbahnhof souverän gemeistert, Fahrgästen geholfen und deine Züge pünktlich erreicht.'
            : 'Das Gedränge zur Hauptverkehrszeit hat deine Energie aufgebraucht. Gönn dir beim nächsten Mal rechtzeitig einen Espresso bei Bakeral!'}
        </p>

        {/* 3 Tabular-Nums Stat Tiles */}
        <div className="grid grid-cols-3 gap-2.5 mb-6 font-mono tabular-nums">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-400">RUF / BESTWERT</div>
            <div className="text-lg font-bold text-sky-400">
              {Math.round(stats.xp)} / {Math.round(stats.bestXp)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-400">AUFTRÄGE</div>
            <div className="text-lg font-bold text-amber-400">
              {stats.completedQuests}/{stats.totalQuests}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-400">ZÜGE / BUDGET</div>
            <div className="text-lg font-bold text-emerald-400">
              {stats.boardedCount} · {Math.round(stats.euros)}€
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {mode === 'paused' && onResume && (
            <button
              type="button"
              onClick={onResume}
              className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-sm cursor-pointer"
            >
              Weiterfahren [Esc / P]
            </button>
          )}

          {mode === 'paused' && onCompleteShift && (
            <button
              type="button"
              onClick={onCompleteShift}
              className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
            >
              Tagesbilanz &amp; Schicht-Auswertung abschließen
            </button>
          )}

          <button
            type="button"
            data-start={mode !== 'paused' ? 'true' : undefined}
            onClick={onRestart}
            className={`w-full py-3 rounded-lg font-bold text-sm cursor-pointer ${
              mode !== 'paused'
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            {isDefeat ? 'Erneut versuchen' : 'Neue Schicht starten'}
          </button>

          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-semibold cursor-pointer"
          >
            Zum Titelbildschirm
          </button>
        </div>
      </div>
    </div>
  );
};
