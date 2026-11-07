/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  Play,
  Pause,
  FastForward,
  Grid,
  Cpu,
  Image as ImageIcon,
  Tag,
  Train,
  Building2,
  Wand2,
} from 'lucide-react';
import { StationViewId } from './game/stationData';
import { BERLIN_CITY } from './world/berlinCity';
import { entranceScene, getVenue } from './world/registry';
import { AssetTier, RenderQuality, SceneDef } from './engine/types';
import { resolvePlateInfo } from './engine/assets';
import { CityMapCanvas } from './components/CityMapCanvas';
import {
  createInitialTimetable,
  createInitialNpcs,
  formatStationTime,
  ScheduledTrain,
  NpcAgent,
} from './game/rules';
import {
  RealisticStationCanvas,
  RenderStyleMode,
} from './components/RealisticStationCanvas';

const REFERENCE_SWATCHES = ['#6c7077', '#535869', '#6585a5', '#8db3c7', '#c94a4a'];

export default function App() {
  const [venueId, setVenueId] = useState<string>(BERLIN_CITY.startVenueId);
  const [view, setView] = useState<'city' | 'venue'>('venue');
  const [activeView, setActiveView] = useState<StationViewId>('E0');
  const [renderStyle, setRenderStyle] = useState<RenderStyleMode>('reference_live');
  const [renderQuality, setRenderQuality] = useState<RenderQuality>('graded');
  const [useAltE0Variant, setUseAltE0Variant] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [hideControls, setHideControls] = useState<boolean>(false);
  const [clockText, setClockText] = useState<string>('08:15');

  const trainsRef = useRef<ScheduledTrain[]>(createInitialTimetable());
  const npcsRef = useRef<NpcAgent[]>(createInitialNpcs(trainsRef.current));
  const stationMinutesRef = useRef<number>(8 * 60 + 15);

  // The venue and its scenes come from the world model — the app knows nothing
  // about a station's levels beyond what the data declares.
  const venue = getVenue(venueId) ?? BERLIN_CITY.districts[0].venues[0];
  const scenes: SceneDef[] = venue.scenes;
  const currentScene: SceneDef =
    scenes.find((s) => s.id === activeView) ?? scenes[0];

  // Show which asset tier the engine resolved for the active scene.
  const resolvedTier = currentScene
    ? resolvePlateInfo(currentScene.plates, 'realistic', useAltE0Variant ? 'b' : undefined)
    : null;

  const enterVenue = (nextVenueId: string) => {
    const next = getVenue(nextVenueId);
    const scene = next ? entranceScene(next) : undefined;
    if (!next || !scene) return;
    setVenueId(next.id);
    setActiveView(scene.id as StationViewId);
    setRenderStyle('reference_live');
    setView('venue');
  };

  // Update displayed station clock periodically
  useEffect(() => {
    const id = window.setInterval(() => {
      setClockText(formatStationTime(stationMinutesRef.current));
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  // Keyboard shortcuts: [1]-[6] switch levels, [M] switches render mode, [L] labels, [H] pure render
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') {
        setActiveView('E+2');
        if (renderStyle === 'all_levels_grid') setRenderStyle('reference_live');
      } else if (e.key === '2') {
        setActiveView('E+1');
        if (renderStyle === 'all_levels_grid') setRenderStyle('reference_live');
      } else if (e.key === '3') {
        setActiveView('E0');
        if (renderStyle === 'all_levels_grid') setRenderStyle('reference_live');
      } else if (e.key === '4') {
        setActiveView('E-1');
        if (renderStyle === 'all_levels_grid') setRenderStyle('reference_live');
      } else if (e.key === '5') {
        setActiveView('E-2');
        if (renderStyle === 'all_levels_grid') setRenderStyle('reference_live');
      } else if (e.key === '6') {
        setActiveView('CUTAWAY');
        if (renderStyle === 'all_levels_grid') setRenderStyle('reference_live');
      } else if (e.key === 'g' || e.key === 'G') {
        setRenderStyle((prev) => (prev === 'all_levels_grid' ? 'reference_live' : 'all_levels_grid'));
      } else if (e.key === 'm' || e.key === 'M') {
        setRenderStyle((prev) =>
          prev === 'reference_live'
            ? 'procedural_iso'
            : prev === 'procedural_iso'
              ? 'all_levels_grid'
              : 'reference_live'
        );
      } else if (e.key === 'l' || e.key === 'L') {
        setShowLabels((prev) => !prev);
      } else if (e.key === 'h' || e.key === 'H') {
        setHideControls((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [renderStyle]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#3b4049] text-slate-100 select-none">
      {/* Full-Viewport Isometric Canvas */}
      {view === 'city' ? (
        <CityMapCanvas
          city={BERLIN_CITY}
          renderQuality={renderQuality}
          minutesRef={stationMinutesRef}
          activeVenueId={venue.id}
          onEnterVenue={enterVenue}
        />
      ) : (
        <RealisticStationCanvas
          venue={venue}
          activeView={activeView}
          renderStyle={renderStyle}
          useAltE0Variant={useAltE0Variant}
          simSpeed={simSpeed}
          showLabels={showLabels}
          renderQuality={renderQuality}
          assetTier="realistic"
          trainsRef={trainsRef}
          npcsRef={npcsRef}
          stationMinutesRef={stationMinutesRef}
          onSelectView={(nextView) => {
            setActiveView(nextView);
            setRenderStyle('reference_live');
          }}
        />
      )}

      {/* Top Reference Specification Bar matching the exact header of the uploaded tilemaps */}
      {!hideControls && (
        <header className="fixed top-0 left-0 right-0 z-20 h-9 bg-[#1f232a]/95 border-b border-[#4b5262] px-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-xs shrink-0"
              style={{ backgroundColor: view === 'city' ? '#f59e0b' : currentScene.color }}
            />
            <h1 className="text-xs sm:text-sm font-mono font-bold tracking-wider text-slate-100 truncate">
              {view === 'city'
                ? `${BERLIN_CITY.name} — STADTKARTE · ${BERLIN_CITY.subtitle}`
                : renderStyle === 'all_levels_grid'
                  ? `${venue.name.toUpperCase()} — ALLE EBENEN IM RASTER`
                  : currentScene.headerTitle}
            </h1>
          </div>

          {/* Right side: Station Clock + Authentic 5-Color Reference Swatch Strip */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-amber-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
              <Train className="w-3 h-3 text-amber-400" />
              <span>HBF {clockText}</span>
            </div>

            <div className="flex items-center gap-1" title="Referenz-Farbpalette">
              {REFERENCE_SWATCHES.map((hex) => (
                <span
                  key={hex}
                  className="w-4 h-4 border border-black/40"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
        </header>
      )}

      {/* Vertical Ebenen-Navigator (Right Dock) & Bottom Control Bar */}
      {!hideControls && (
        <>
          {/* Right-Side Vertical Level Stack (E+2 -> E+1 -> E0 -> E-1 -> E-2 -> Querschnitt) */}
          {view === 'venue' && renderStyle !== 'all_levels_grid' && (
            <aside className="fixed right-3 top-12 z-20 flex flex-col gap-1.5 bg-[#1f232a]/92 backdrop-blur-md p-2 rounded border border-[#4b5262] shadow-xl">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
                <span>Ebenen-Wahl</span>
                <span>[1–6]</span>
              </div>
              {scenes.map((bp, idx) => {
                const isSelected = activeView === bp.id;
                return (
                  <button
                    key={bp.id}
                    onClick={() => setActiveView(bp.id as StationViewId)}
                    className={`group flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded text-left transition-colors border ${
                      isSelected
                        ? 'bg-slate-800 border-amber-400 text-white shadow-inner'
                        : 'bg-slate-900/60 border-slate-700/70 text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-5 rounded-xs shrink-0"
                        style={{ backgroundColor: bp.color }}
                      />
                      <div>
                        <div className="text-xs font-mono font-bold leading-tight">
                          {bp.shortCode}
                        </div>
                        <div className="text-[10px] text-slate-400 max-w-[145px] truncate">
                          {bp.subtitle.split('·')[0].trim()}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-300">
                      [{idx + 1}]
                    </span>
                  </button>
                );
              })}

              {/* E0 Variant Switcher when on E0 */}
              {activeView === 'E0' && renderStyle === 'reference_live' && (
                <button
                  onClick={() => setUseAltE0Variant((v) => !v)}
                  className="mt-1 px-2 py-1 rounded text-[10px] font-mono bg-amber-500/20 border border-amber-500/50 text-amber-200 hover:bg-amber-500/30 transition-colors text-center"
                >
                  E0-Referenz: {useAltE0Variant ? 'Variante B' : 'Variante A'} wechseln
                </button>
              )}
            </aside>
          )}

          {/* Bottom-Left Architectural Details Card for the Current Level */}
          {view === 'venue' && renderStyle !== 'all_levels_grid' && (
            <div className="fixed left-3 bottom-3 z-20 max-w-md bg-[#1f232a]/90 backdrop-blur-md border border-[#4b5262] rounded p-2.5 shadow-xl pointer-events-none">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-xs font-mono font-bold text-white">
                  {currentScene.shortCode}: {currentScene.subtitle}
                </span>
                {resolvedTier && (
                  <span
                    className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                      resolvedTier.fellBack
                        ? 'bg-slate-700/60 border-slate-500/50 text-slate-300'
                        : 'bg-emerald-600/30 border-emerald-400/50 text-emerald-200'
                    }`}
                    title={resolvedTier.fellBack ? `Fallback auf ${resolvedTier.plate.tier}` : 'Gewünschte Stufe gefunden'}
                  >
                    {resolvedTier.plate.tier}
                    {resolvedTier.fellBack ? ' ↓' : ' ✓'}
                  </span>
                )}
              </div>
              <ul className="grid grid-cols-1 gap-0.5 text-[11px] text-slate-300">
                {currentScene.highlights.map((h, i) => (
                  <li key={i} className="flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span className="truncate">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bottom-Right Simulation & Render Mode Bar */}
          <div className="fixed right-3 bottom-3 z-20 flex flex-wrap items-center gap-1.5 bg-[#1f232a]/92 backdrop-blur-md border border-[#4b5262] rounded p-1.5 shadow-xl">
            {/* City Map / Venue toggle */}
            <button
              onClick={() => setView((v) => (v === 'city' ? 'venue' : 'city'))}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-colors ${
                view === 'city'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Open-World-Stadtkarte (Bezirke & Orte)"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{view === 'city' ? 'Ort ansehen' : 'Stadtkarte'}</span>
            </button>

            <div className="h-4 w-px bg-slate-700 mx-0.5" />

            {/* Render Style Switcher */}
            <button
              onClick={() => setRenderStyle('reference_live')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-colors ${
                renderStyle === 'reference_live'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Original Referenz-Tilemap + Live-Simulation"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Referenz + Live</span>
            </button>

            <button
              onClick={() => setRenderStyle('procedural_iso')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-colors ${
                renderStyle === 'procedural_iso'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Prozedurale Isometric-Vektor-Architektur (Korrigierter Neubau)"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Vektor-Bau</span>
            </button>

            <button
              onClick={() => setRenderStyle('all_levels_grid')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-colors ${
                renderStyle === 'all_levels_grid'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Alle 6 Ebenen gleichzeitig im Raster [G]"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Alle 6 Ebenen</span>
            </button>

            {/* Plate grading / atmosphere quality */}
            <button
              onClick={() =>
                setRenderQuality((q) =>
                  q === 'raw' ? 'graded' : q === 'graded' ? 'cinematic' : 'raw'
                )
              }
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-colors ${
                renderQuality === 'cinematic'
                  ? 'bg-fuchsia-600/30 border border-fuchsia-400/50 text-fuchsia-200'
                  : renderQuality === 'graded'
                    ? 'bg-emerald-600/30 border border-emerald-400/50 text-emerald-200'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
              title="Grafik-Finish der Plates: roh, gegraded oder cineastisch"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>
                {renderQuality === 'cinematic'
                  ? 'Cineastisch'
                  : renderQuality === 'graded'
                    ? 'Gegraded'
                    : 'Roh'}
              </span>
            </button>

            <div className="h-4 w-px bg-slate-700 mx-0.5" />

            {/* Labels Toggle */}
            <button
              onClick={() => setShowLabels((v) => !v)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-colors ${
                showLabels
                  ? 'bg-sky-600/30 border border-sky-400/50 text-sky-200'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
              title="Zug- & Ziel-Labels ein/ausblenden [L]"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Labels</span>
            </button>

            {/* Simulation Speed Toggle */}
            <button
              onClick={() =>
                setSimSpeed((s) => (s === 0 ? 1 : s === 1 ? 2.5 : 0))
              }
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
              title="Simulationsgeschwindigkeit"
            >
              {simSpeed === 0 ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pause</span>
                </>
              ) : simSpeed === 1 ? (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>1x Live</span>
                </>
              ) : (
                <>
                  <FastForward className="w-3.5 h-3.5 text-sky-400" />
                  <span>2.5x</span>
                </>
              )}
            </button>

            {/* Hide UI for 100% pure render */}
            <button
              onClick={() => setHideControls(true)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              title="UI ausblenden [H]"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>[H]</span>
            </button>
          </div>
        </>
      )}

      {/* Minimal restore button when UI is hidden */}
      {hideControls && (
        <button
          onClick={() => setHideControls(false)}
          className="fixed bottom-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-900/75 hover:bg-slate-900 text-slate-200 text-xs font-mono border border-slate-700 shadow-lg"
        >
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span>Ebenen-Steuerung [H]</span>
        </button>
      )}
    </div>
  );
}
