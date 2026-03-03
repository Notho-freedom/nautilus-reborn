# Nautilus Reborn - Version 2 (Web)

Version web de Notilus, en cours de développement actif.

## Organisation du workspace

Le workspace `C:\Users\bobim\NOTILUS` contient 3 dépôts séparés:

- `Notilus-Browser` -> V1 Flutter (stable, référence fonctionnelle)
- `nautilus-reborn` -> V2 Web (ce dépôt, zone de développement principale)
- `notilus-loading` -> page de présentation de l'application

## Démarrage local (V2)

Prérequis:

- Node.js 20+
- npm 10+

Commandes:

```sh
cd C:\Users\bobim\NOTILUS\nautilus-reborn
npm install
npm run dev:web
```

Validation rapide:

```sh
npm run build:web
npm run test
```

## Mode Desktop Electron (V2)

L'application desktop utilise Electron + `WebContentsView`.

Commandes:

```sh
# Lancer React + Electron en dev
npm run dev:desktop

# Build desktop (main + preload + renderer)
npm run build:desktop
```

En mode desktop:

- Pages externes: rendues via Chromium natif (`WebContentsView`)
- Pages internes (`notilus://*`): rendues dans l'UI React
- Le bridge preload expose `window.notilusDesktop` (IPC typé)
- Téléchargements: capturés nativement via Electron session (`will-download`) et visibles dans le panneau Downloads
- Git panel: connecté au vrai repo local (status/commits/commit)
- Sidebar web services: configurable dans Settings, ouverture en panel + transfert en tab

## Workflow Git recommandé

Toujours faire les commits depuis `nautilus-reborn`:

```sh
cd C:\Users\bobim\NOTILUS\nautilus-reborn
git checkout -b feat/<nom-fonctionnalite>
git add .
git commit -m "feat: <description>"
git push -u origin feat/<nom-fonctionnalite>
```

Le dossier parent `NOTILUS` n'est pas un dépôt Git, ce qui est normal.

## Intégration V1 -> V2

Pour migrer une fonctionnalité Flutter (V1) vers le web (V2), utiliser ce mapping:

- V1 `lib/screens` -> V2 `src/pages` / `src/components/browser`
- V1 `lib/widgets` -> V2 `src/components/ui` / `src/components/browser`
- V1 `lib/services` -> V2 `src/hooks` + `src/lib` + futurs services API
- V1 `backend/` FastAPI -> API distante ou service local dédié côté V2

La V1 sert de référence métier; les implémentations UI/techniques doivent être adaptées au stack V2 (React + Vite + TypeScript + Tailwind + shadcn).

## Stack technique V2

- Vite
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- Vitest
- Electron
- WebContentsView
