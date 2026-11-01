# Hinweise für Agenten

## Starten (Sandbox)
- `docker compose -f docker-compose.base44.yml up -d --build` — ein Dienst `web`
  (node:22), Vite-Dev-Server aus dem gemounteten Quellcode auf Host-Port 3000.
- `node_modules` liegt in einem Named Volume; die Installation läuft bei jedem
  Containerstart aus dem gemounteten Checkout (`npm install`, kein Lockfile im Repo).
- Es gibt **kein** `package-lock.json`. Die direkte devDependency `esbuild` muss zur
  Vite-Peerversion passen (`vite@8` → `esbuild ^0.27/^0.28`), sonst bricht
  `npm install` mit ERESOLVE ab. Version in `package.json` angleichen statt
  `--legacy-peer-deps` zu verwenden.

## Prüfen
- Typecheck im Container: `docker compose -f docker-compose.base44.yml exec -T web sh -ec 'cd /app && npx tsc --noEmit'`.
- Bekannter Altfehler (nicht durch die Engine-Änderungen verursacht):
  `src/components/StationOverlays.tsx` importiert den Typ `CommuterQuest`, den
  `src/game/stationData.ts` nicht exportiert. Die Komponente wird von `App.tsx`
  nicht verwendet, der Fehler ist nur im Typecheck sichtbar.

## Architektur: City Engine
- `src/world/berlinCity.ts` → Distrikte → Orte (Venues) → Szenen. Neue Orte =
  Datensatz anlegen, kein Renderer-Umbau. Lookups über `src/world/registry.ts`.
- `src/engine/` ist szenenunabhängig: `assets.ts` (Tier-Auswahl + Plate-Baking),
  `render/plate.ts` (Platte + Tageslicht + Rahmen), `render/primitives.ts`
  (Iso-Grid, Boxen, Zylinder, Fahrzeuge, Fußgänger), `atmosphere.ts` (Tageszeit).
- Bildschirme greifen nur über die Registry zu; `RealisticStationCanvas` bekommt
  `venue` + `renderQuality` + `assetTier` und rendert jede Szene aus den Daten.
- Neue Grafikstufen: weitere `PlateDef` mit höherem `tier` an die Szene hängen —
  `resolvePlate` nimmt automatisch die beste vorhandene Stufe.
