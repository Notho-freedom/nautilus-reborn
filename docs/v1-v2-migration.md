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
  - V2: intégré en localStorage (`src/lib/history.ts`) + UI branchée (`src/components/browser/HistoryPanel.tsx`)
- Panneau GitHub:
  - V1: `lib/services/github/github_repos_service.dart` (API GitHub réelle + auth)
  - V2: `src/components/browser/GitHubReposPanel.tsx` encore en mock

## Priorité d’intégration (itérations)

1. GitHub réel (auth + récupération repos + tri/filtre)
2. Bookmarks persistants
3. Downloads persistants
4. Settings persistants
5. Services devtools connectés à de vraies données de session

## Règle de travail

Les commits doivent être faits depuis `nautilus-reborn` uniquement.
