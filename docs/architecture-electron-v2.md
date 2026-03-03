# Architecture Electron V2 (React + WebContentsView)

## Vue d'ensemble

- UI Shell: React (`src/components/browser/*`)
- Runtime desktop: Electron (`electron/main/*`, `electron/preload/*`)
- Rendu web externe: `WebContentsView` (1 onglet = 1 vue Chromium)
- Pages internes: `notilus://*` rendues dans React

## Flux principal

1. React demande une action navigateur via `window.notilusDesktop`.
2. Preload relaie via IPC (`browser:*`).
3. Main process (`TabManager`) applique l'action sur les onglets/views.
4. Main pousse l'état courant vers React via `browser:state-changed`.
5. React met à jour l'UI depuis ce snapshot.

## Contrat IPC

Les types et canaux sont centralisés dans `shared/browser-contract.ts`.

- Requêtes: get/create/close/activate/navigate/back/forward/reload/devtools/viewport-bounds
- Event push: `browser:state-changed`

## Layout du rendu externe

- React réserve un `div` viewport dans `ContentArea`.
- `BrowserShell` mesure cette zone (ResizeObserver + bounds) et envoie `ViewportBounds`.
- Main applique ces bounds sur la `WebContentsView` active.

## Sécurité

- Renderer React: `contextIsolation: true`, `nodeIntegration: false`.
- External tabs (`WebContentsView`): `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`.
- Aucun accès direct `ipcRenderer` dans React: passage obligatoire par preload.

## Notes d'évolution

- Sessions: actuellement partagées (`defaultSession`).
- `NetworkLayer` est un scaffold d'interception.
- Packaging installateur Windows reste hors de ce lot.

