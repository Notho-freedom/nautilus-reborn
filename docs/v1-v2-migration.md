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

## Priorité d’intégration (itérations)

1. DevTools internes branchés à des données runtime réelles (console/network/elements custom)
2. Services Git/Extensions/Updates/Studio encore majoritairement mock
3. Parité avancée IA/TTS/Cloudinary depuis V1
4. Auth GitHub sécurisée (token backend/proxy au lieu localStorage brut)
5. Couverture tests unitaires sur tous les nouveaux stores/services

## Règle de travail

Les commits doivent être faits depuis `nautilus-reborn` uniquement.
