# Migration V1 Flutter -> V2 Web

Ce document sert de base opérationnelle pour intégrer les fonctionnalités V1 (`Notilus-Browser`) dans V2 (`nautilus-reborn`).

## Références

- V1 (Flutter): `../Notilus-Browser/lib`
- V2 (Web): `./src`

## Mapping de base

- V1 `lib/screens/*` -> V2 `src/pages/*` + orchestration `src/components/browser/BrowserShell.tsx`
- V1 `lib/widgets/browser/*` -> V2 `src/components/browser/*`
- V1 `lib/widgets/dev_tools/*` -> V2 `src/components/browser/devtools/*`
- V1 `lib/services/*` -> V2 `src/lib/*` + `src/hooks/*` (+ services API côté backend quand nécessaire)

## État d’intégration actuel

- Historique navigation:
  - V1: `lib/services/history_service.dart` (persistant)
  - V2: intégré en localStorage (`src/lib/history.ts`) + UI branchée (`src/components/browser/HistoryPanel.tsx`) + ouverture d’URL depuis le panneau
- Panneau GitHub:
  - V1: `lib/services/github/github_repos_service.dart` (API GitHub réelle + auth)
  - V2: intégré via API GitHub réelle (`src/lib/githubRepos.ts`) + persistance connexion locale + panneau branché (`src/components/browser/GitHubReposPanel.tsx`)
- Bookmarks:
  - V1: `lib/services/bookmark_service.dart` (CRUD persistant)
  - V2: intégré (`src/lib/bookmarks.ts`) + panneau branché (`src/components/browser/BookmarksPanel.tsx`) + étoile navigation + `Ctrl+D`
- Settings:
  - V1: `lib/services/settings_service.dart` (store central)
  - V2: store persistant (`src/lib/settings.ts`) + application du thème accent CSS + panneau branché (`src/components/browser/SettingsPanel.tsx`)
- Downloads:
  - V1: `lib/services/download_service.dart` (état/gestion)
  - V2: gestion desktop réelle via Electron (`electron/main/download-manager.ts`) + IPC + panneau branché (`src/components/browser/DownloadsPanel.tsx`)
- Git:
  - V1: intégrations git dans les widgets/services
  - V2: état réel du repo via IPC Electron (`electron/main/git-manager.ts`) + panneau branché (`src/components/browser/GitPanel.tsx`)
- Extensions:
  - V1: gestion d’extensions côté app
  - V2: catalogue persistant + toggles réels (`src/lib/extensions.ts`, `src/components/browser/ExtensionsPanel.tsx`)
- Updates:
  - V1: `lib/services/update_service.dart`
  - V2: vérification GitHub Releases + fallback local (`src/lib/updates.ts`, `src/components/browser/UpdatesPanel.tsx`)
- Studio:
  - V1: services `studio/*` (responsive, screenshot, live edit, recorder, mockup compare)
  - V2: lot desktop connecté (`src/lib/studio.ts`, `electron/main/studio-manager.ts`, `src/components/browser/StudioPanel.tsx`)
    - Resize window par preset
    - Capture viewport/full page
    - Injection CSS/JS live
    - Recorder d'interactions + export Playwright/Cypress

## Priorité d’intégration (itérations)

1. DevTools internes branchés à des données runtime réelles (console/network/elements custom)
2. Studio: enrichir le mode mockup compare (overlay/diff réel d'images)
3. Parité avancée IA/TTS/Cloudinary depuis V1
4. Auth GitHub sécurisée (token backend/proxy au lieu localStorage brut)
5. Couverture tests unitaires élargie sur toute la stack desktop

## Règle de travail

Les commits doivent être faits depuis `nautilus-reborn` uniquement.

## Checklist Sprint 1 - Parité DevTools / Backend Lab (V1 -> V2)

### DevTools Nautilus

- [x] Ordre des tabs strict V1: `Elements`, `Console`, `Network`, `Resources`, `Performance`, `Application`, `Backend Lab`
- [x] Header DevTools: clear all, settings, inspect mode, responsive mode, detach/dock, close
- [x] Raccourcis: `F12`, `Ctrl+Shift+I`, `Ctrl+Shift+C/J/E/R/P/A/B`
- [x] Resize vertical du panel docké
- [x] Mode inspect avec panneau latéral (box model + computed styles)
- [x] Presets responsive (desktop/tablet/mobile + reset)
- [x] Mini panel flottant (Console/Network), draggable, collapse/expand
- [x] Transition detach: panel principal -> mini panel
- [x] Données runtime réelles (console/network/elements/resources/perf/application), aucun mock

### Backend Lab

- [x] Sidecar backend local desktop (`127.0.0.1:8000`) avec start/stop/restart + healthcheck
- [x] Intégration IPC backend sidecar (`backend-lab:*`) + events d’état
- [x] Panel Backend Lab tabbed strict V1:
  - [x] `Overview`
  - [x] `Servers`
  - [x] `Routes`
  - [x] `Tests API`
  - [x] `Security`
  - [x] `Performance`
  - [x] `Capture`
  - [x] `Console`
- [x] Endpoints branchés: scan serveurs, discovery routes, quick test/tests, security scan, load test, captures replay/clear, analytics, console logs + websocket
- [x] États loading/empty/error alignés V1

### Recherche (hotfix transversal)

- [ ] Jamais de navigation automatique pendant la saisie (global + GitHub)
- [ ] Navigation uniquement sur action explicite (`Enter` / clic résultat / clic bouton)

## Checklist Mosaic V1 -> V2 (Clone strict)

- [x] Modèles Mosaic V1 portés en TS (`MosaicTile`, `MosaicWorkspace`, `SplitDirection`, `DropZone`, types de tiles complets)
- [x] Service Mosaic V1 porté côté V2 (`src/lib/mosaic.ts`) avec:
  - [x] activation / visibilité
  - [x] workspaces (create/delete/switch + persistance)
  - [x] presets V1 (9 presets)
  - [x] opérations tiles (set content/tab, split, close, swap, resize, move, maximize, lock/minimize)
  - [x] état UI (hover/focus/drag-over)
- [x] `MosaicPanel` migré vers logique V1 (workspaces + presets + activation)
- [x] `BrowserShell` branché sur état Mosaic global (plus de layout 1/2/3 statique)
- [x] `DesktopWebviewLayer` migré en rendu récursif par arbre de tiles (split tree)
- [x] Assignation des tabs web aux feuilles Mosaic (priorité onglet actif)
- [x] Contrôles tile inline dans la vue Mosaic desktop (type, split H/V, close)
- [x] Tests V2 mis à jour pour nouveau contrat Mosaic (`ContentArea`, `DesktopWebviewLayer`)

### Limites restantes (à finir pour parité intégrale UI V1)

- [x] Drag & drop visuel inter-tiles (zones de drop gauche/droite/haut/bas/centre)
- [x] Redimensionneurs visuels entre tiles en UI
- [ ] Embedding complet de toutes les vues non-web V1 dans les tiles (certaines restent en placeholder)
