# Nautilus Reborn - Version 2 (Web)

![Nautilus Reborn Screenshot](screenshots/homepage.png)

Version 2 of Notilus, a modern web-based operating system interface and browser replacement. Currently in active development.

## Workspace Organization

The `C:\Users\bobim\NOTILUS` workspace contains 3 separate repositories:

- `Notilus-Browser` -> V1 Flutter (stable, functional reference)
- `nautilus-reborn` -> V2 Web (this repository, main development area)
- `notilus-loading` -> application presentation page

## Local Development (V2)

Prerequisites:

- Node.js 20+
- npm 10+

Commands:

```sh
cd C:\Users\bobim\NOTILUS\nautilus-reborn
npm install
npm run dev:web
```

Quick validation:

```sh
npm run build:web
npm run test
```

## Desktop Electron Mode (V2)

The desktop application uses Electron with `WebContentsView`.

Commands:

```sh
# Launch React + Electron in dev mode
npm run dev:desktop

# Build desktop (main + preload + renderer)
npm run build:desktop
```

In desktop mode:

- External pages: rendered via native Chromium (`WebContentsView`)
- Internal pages (`notilus://*`): rendered in React UI
- The preload bridge exposes `window.notilusDesktop` (typed IPC)
- Downloads: captured natively via Electron session (`will-download`) and visible in the Downloads panel
- Git panel: connected to the real local repo (status/commits/commit)
- Sidebar web services: configurable in Settings, opening in panel + tab transfer
- Studio panel: resize presets, capture, live CSS/JS, recorder export (Playwright/Cypress)

## Recommended Git Workflow

Always commit from `nautilus-reborn`:

```sh
cd C:\Users\bobim\NOTILUS\nautilus-reborn
git checkout -b feat/<feature-name>
git add .
git commit -m "feat: <description>"
git push -u origin feat/<feature-name>
```

The parent folder `NOTILUS` is not a Git repository, which is normal.

## V1 to V2 Integration

To migrate a Flutter feature (V1) to web (V2), use this mapping:

- V1 `lib/screens` -> V2 `src/pages` / `src/components/browser`
- V1 `lib/widgets` -> V2 `src/components/ui` / `src/components/browser`
- V1 `lib/services` -> V2 `src/hooks` + `src/lib` + future API services
- V1 `backend/` FastAPI -> Remote API or dedicated local service on V2 side

V1 serves as the business reference; UI/technical implementations must be adapted to the V2 stack (React + Vite + TypeScript + Tailwind + shadcn).

## V2 Tech Stack

- Vite
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- Vitest
- Electron
- WebContentsView

## Screenshots
![Homepage](screenshots/homepage.png)