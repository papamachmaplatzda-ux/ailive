import React, { useState, useRef, useEffect } from 'react';
import {
  createInitialTimetable,
  createInitialNpcs,
  formatStationTime,
  ScheduledTrain,
  NpcAgent,
} from './game/rules';
import {
  RealisticStationCanvas,
  CameraPreset,
  RenderStyleMode,
} from './components/RealisticStationCanvas';

export default function App() {
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('overview');
  const [renderStyle, setRenderStyle] = useState<RenderStyleMode>('procedural_realistic');
  const [lightingMode, setLightingMode] = useState<'warm_station' | 'daylight' | 'night'>(
    'warm_station'
  );
  const [timeScale, setTimeScale] = useState<number>(1);
  const [showLabels, setShowLabels] = useState<boolean>(false);
  const [uiCollapsed, setUiCollapsed] = useState<boolean>(false);
  const [, setClockTick] = useState<number>(0);

  const trainsRef = useRef<ScheduledTrain[]>(createInitialTimetable());
  const npcsRef = useRef<NpcAgent[]>(createInitialNpcs(trainsRef.current));
  const stationClockRef = useRef<number>(8 * 60 + 20);

  useEffect(() => {
    document.body.dataset.state = 'rendering';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyH') {
        setUiCollapsed((prev) => !prev);
      } else if (e.code === 'Digit1') {
        setCameraPreset('overview');
      } else if (e.code === 'Digit2') {
        setCameraPreset('concourse');
      } else if (e.code === 'Digit3') {
        setCameraPreset('deep_tracks');
      } else if (e.code === 'Digit4') {
        setCameraPreset('upper_tracks');
      } else if (e.code === 'KeyL') {
        setShowLabels((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden select-none bg-zinc-900">
      {/* Full-Viewport Realistic Isometric Berlin Hbf Renderer */}
      <RealisticStationCanvas
        cameraPreset={cameraPreset}
        renderStyle={renderStyle}
        timeScale={timeScale}
        lightingMode={lightingMode}
        showLabels={showLabels}
        trainsRef={trainsRef}
        npcsRef={npcsRef}
        stationClockRef={stationClockRef}
        onTickClock={() => setClockTick((t) => (t + 1) % 100000)}
      />

      {/* Minimal, Toggleable Architectural Render Control Strip (Top-Left / Top-Right) */}
      <div className="fixed top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {!uiCollapsed ? (
          <div
            className="flex flex-wrap items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-700/80 text-zinc-100 shadow-lg pointer-events-auto"
            style={{ backgroundColor: 'rgba(24, 24, 27, 0.88)' }}
          >
            <span className="text-xs font-bold tracking-wide text-amber-300 whitespace-nowrap mr-1">
              BERLIN HBF · ARCHITEKTUR-RENDERER
            </span>

            <span className="text-zinc-600" aria-hidden="true">
              |
            </span>

            {/* Render Mode Selector */}
            <div className="flex items-center gap-1 bg-zinc-950/90 p-0.5 rounded-md border border-zinc-800">
              <button
                type="button"
                onClick={() => setRenderStyle('procedural_realistic')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors whitespace-nowrap ${
                  renderStyle === 'procedural_realistic'
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                3D-Isometrie (Live)
              </button>
              <button
                type="button"
                onClick={() => setRenderStyle('hybrid_illustrated')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors whitespace-nowrap ${
                  renderStyle === 'hybrid_illustrated'
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                Hybrid-Illustration
              </button>
              <button
                type="button"
                onClick={() => setRenderStyle('reference_art')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors whitespace-nowrap ${
                  renderStyle === 'reference_art'
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                Original-Grafik
              </button>
            </div>

            <span className="text-zinc-600" aria-hidden="true">
              |
            </span>

            {/* Camera Viewpoint Presets */}
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'overview', label: 'Gesamt [1]' },
                  { id: 'concourse', label: 'Haupthalle & Läden [2]' },
                  { id: 'deep_tracks', label: 'ICE-Bahnsteige [3]' },
                  { id: 'upper_tracks', label: 'Stadtbahn [4]' },
                ] as const
              ).map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => setCameraPreset(cam.id)}
                  className={`px-2 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors whitespace-nowrap ${
                    cameraPreset === cam.id
                      ? 'bg-zinc-700 text-white'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70'
                  }`}
                >
                  {cam.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div />
        )}

        {/* Right Compact Controls: Clock, Labels, Speed, Collapse UI */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700/80 text-zinc-200 shadow-lg pointer-events-auto"
          style={{ backgroundColor: 'rgba(24, 24, 27, 0.88)' }}
        >
          <span className="text-xs font-mono font-bold tabular-nums text-amber-300 whitespace-nowrap">
            {formatStationTime(stationClockRef.current)} Uhr
          </span>

          {!uiCollapsed && (
            <>
              <button
                type="button"
                onClick={() => setShowLabels((prev) => !prev)}
                className={`px-2 py-1 rounded text-[11px] font-mono cursor-pointer transition-colors whitespace-nowrap ${
                  showLabels
                    ? 'bg-zinc-700 text-white'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Beschriftung [L]
              </button>

              <button
                type="button"
                onClick={() =>
                  setLightingMode((m) =>
                    m === 'warm_station'
                      ? 'daylight'
                      : m === 'daylight'
                      ? 'night'
                      : 'warm_station'
                  )
                }
                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] font-mono cursor-pointer whitespace-nowrap"
              >
                Licht:{' '}
                {lightingMode === 'warm_station'
                  ? 'Warm'
                  : lightingMode === 'daylight'
                  ? 'Tag'
                  : 'Nacht'}
              </button>

              <button
                type="button"
                onClick={() =>
                  setTimeScale((s) => (s === 0 ? 1 : s === 1 ? 2.5 : 0))
                }
                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] font-mono font-bold text-amber-300 cursor-pointer whitespace-nowrap"
              >
                {timeScale === 0 ? 'Pause' : `${timeScale}x`}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setUiCollapsed((prev) => !prev)}
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] font-mono text-zinc-300 cursor-pointer whitespace-nowrap"
          >
            {uiCollapsed ? 'Steuerung zeigen [H]' : 'Nur Grafik [H]'}
          </button>
        </div>
      </div>
    </main>
  );
}
