

# Plan: Bottom Bar enrichie, panneaux connectés aux données réelles, corrections UX

Ce plan couvre la refonte de la barre inférieure (StatusBar), la connexion des données réelles aux panneaux, les corrections UX multiples (messages vides centrés, bordures DevTools, DevTools overlay, sidebar allégée), et l'ajout de "laboratoires" développeur.

---

## 1. Fix build errors (priorité)

**`src/components/browser/DesktopWebviewLayer.tsx`** (ligne 83) :
- Ajouter un type assertion : `new Map<string, HTMLElement>()` au lieu de `Map<string, ElectronWebviewElement>` — le type global n'est pas résolu dans le contexte TS. Caster via `as unknown as ElectronWebviewElement` là où nécessaire.
- Ligne 255 : `allowpopups` doit être `allowpopups={"true"}` (string, pas boolean) — vérifier la JSX.

**`src/test/setup.ts`** (ligne 30) :
- `HTMLElement.prototype as unknown as Record<string, unknown>`

**`electron/main/index.ts`** (lignes 166, 172) :
- Ajouter `mainWindow!` (non-null assertion) ou garder le guard `if (mainWindow && !mainWindow.isDestroyed())`

---

## 2. StatusBar complètement refaite — style VS Code

**`src/components/browser/StatusBar.tsx`** — Refonte intégrale

Structure en deux zones gauche/droite comme VS Code :

```text
┌─────────────────────────────────────────────────────────────────┐
│ 🔒 HTTPS │ CPU 23% │ RAM 45% │ [Wifi▲] │ Git main │ 5 tabs │ Frontend Lab │ Backend Lab │ DevTools │ ⚙ │ 100% [+][-] │
└─────────────────────────────────────────────────────────────────┘
```

### Éléments avec overlays au survol :

**Gauche :**
- **Sécurité** : icône cadenas + "HTTPS" ou "HTTP". Overlay : détails certificat (émetteur, validité, protocole TLS)
- **CPU** : pourcentage réel via `stats.cpu`. Overlay : graphique mini sparkline des 10 dernières valeurs, nombre de processus
- **RAM** : pourcentage réel via `stats.ram`. Overlay : RAM utilisée / totale, top consumers
- **Réseau** : icône signal dynamique (4 barres basées sur `stats.networkDown`). Overlay : IP, latence estimée, débit up/down, type connexion
- **Git** : branche actuelle (si dispo). Overlay : branche, derniers commits, fichiers modifiés

**Droite :**
- **Frontend Lab** : ouvre un panneau d'outils frontend (responsive tester, color picker, CSS inspector)
- **Backend Lab** : ouvre un panneau d'outils backend (API tester, request builder, env vars)  
- **DevTools Notilus** : bouton pour ouvrir le DevTools interne (pas le natif)
- **Nombre d'onglets**
- **Zoom** : connecté fonctionnellement — envoyer le zoom au webview via Electron bridge ou CSS transform
- **Notifications** : icône cloche
- **Engrenage** : ouvre Settings

### Overlays :
- Chaque élément interactif de la StatusBar aura un `HoverCard` (Radix) avec contenu détaillé
- Le HoverCard s'ouvre vers le haut (`side="top"`)
- Z-index élevé garanti par les règles CSS déjà en place

### Connexion données réelles :
- `useSystemMonitor` : le hook fournit déjà CPU/RAM/réseau simulés — on les connecte directement
- Le zoom sera transmis via une callback `onZoomChange` que `BrowserShell` passera au `StatusBar`

**Props enrichies :**
```typescript
interface StatusBarProps {
  stats: SystemStats;
  tabCount: number;
  activeTabUrl: string;
  gitBranch?: string;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onOpenPanel: (panel: string) => void;
  onToggleNotilusDevTools: () => void;
}
```

---

## 3. Nouveaux panneaux "Labs"

### `src/components/browser/FrontendLabPanel.tsx` — Nouveau
- Color Picker (input color natif + prévisualisation)
- CSS Unit Converter (px ↔ rem ↔ em ↔ %)
- Box Shadow Generator (sliders, preview live, code copié)
- Gradient Generator
- Responsive breakpoints checker
- Font Preview (tester des Google Fonts)
- Accessibility contrast checker

### `src/components/browser/BackendLabPanel.tsx` — Nouveau
- API Request Builder (méthode, URL, headers, body, exécution, réponse)
- JSON Formatter / Validator
- Base64 Encoder/Decoder
- JWT Decoder
- Regex Tester
- Timestamp Converter
- UUID Generator

---

## 4. Panneau GitHub : écran de connexion centré

**`src/components/browser/GitHubReposPanel.tsx`** — Modifier
- Quand `!connection.token && !connection.username` : afficher au centre une grande icône GitHub, un titre "Connectez votre compte GitHub", un paragraphe descriptif, et le formulaire de connexion
- Utiliser le vrai logo `/logo_n_no_bg.png` ou `/notilus-logo.png`

---

## 5. Messages d'état vide centrés

**Tous les panneaux** (BookmarksPanel, HistoryPanel, DownloadsPanel, etc.) :
- Les messages "No bookmarks yet", "No history", etc. doivent être `flex items-center justify-center h-full` — centrés verticalement et horizontalement dans le panneau
- Ajouter une icône large (48px) au-dessus du message

---

## 6. DevTools Notilus en overlay au-dessus de la page

**`src/components/browser/BrowserShell.tsx`** :
- Le `DevToolsPanel` doit passer en `position: absolute` en bas, au-dessus du contenu (z-40)
- Supprimer le layout flex qui pousse le contenu
- Le fond du contenu ne doit plus bouger pendant le resize

**`src/components/browser/DevToolsPanel.tsx`** :
- Retirer les bordures inférieures "grosses/blanches" — simplifier à `border-t border-border` uniquement pour la barre d'onglets
- Position absolute, bottom: 0, width: 100%

---

## 7. Accès DevTools Notilus depuis la bottom bar

**`src/components/browser/BrowserShell.tsx`** :
- Le bouton "DevTools Notilus" dans la StatusBar ouvrira toujours le DevTools interne (construit par nous), indépendamment du mode desktop ou de la page active
- Le F12 / bouton sidebar continuent d'ouvrir le DevTools natif quand on est sur une page externe
- Ajouter un state `notilusDevToolsOpen` séparé de `devToolsOpen`

---

## 8. Sidebar allégée — déplacer certains items vers la bottom bar

**`src/components/browser/DevToolsSidebar.tsx`** :
- Retirer de la sidebar : `updates`, `docs`, `api-docs`
- Ces fonctionnalités seront accessibles via la bottom bar (petit bouton info/docs)

---

## 9. Widgets Panel — données réelles

**`src/components/browser/WidgetsPanel.tsx`** :
- Connecter les stats système réelles (passer `stats` en prop)
- Connecter le nombre d'onglets réel (passer `tabCount` en prop)
- Météo : utiliser `navigator.geolocation` + API météo gratuite (wttr.in) ou garder placeholder avec note

---

## 10. Settings Panel — UI nettoyée

**`src/components/browser/SettingsPanel.tsx`** :
- Organiser avec des cartes (`glass rounded-xl p-4`) au lieu de sections plates
- Espacement plus aéré (`space-y-6` au lieu de `space-y-4`)
- Chaque section dans une carte avec bordure et titre bien distinct
- Section "About" avec le vrai logo image (`/logo_n_no_bg.png`)

---

## 11. Documentation Panel — meilleure structure + vrai logo

**`src/components/browser/DocumentationPanel.tsx`** :
- Remplacer le faux logo "N" gradient par `<img src="/logo_n_no_bg.png" />`
- Organiser en sections repliables (Accordion) : Getting Started, Shortcuts, Features, Architecture, API Reference
- Meilleure hiérarchie visuelle

---

## 12. Terminal — connexion système

**`src/components/browser/TerminalPanel.tsx`** :
- En mode desktop, connecter au vrai shell système via l'Electron bridge (si disponible)
- En mode web, garder le terminal simulé actuel

---

## 13. Zoom fonctionnel

**`src/hooks/useBrowserState.ts`** :
- Ajouter state `zoom` (default 100) + `setZoom` callback
- En mode desktop, appliquer via `webContents.setZoomFactor()` (nécessite ajout IPC)
- En mode web, appliquer via `document.body.style.zoom`

---

## Fichiers à créer
- `src/components/browser/FrontendLabPanel.tsx`
- `src/components/browser/BackendLabPanel.tsx`

## Fichiers à modifier
- `src/components/browser/StatusBar.tsx` (refonte complète)
- `src/components/browser/BrowserShell.tsx` (DevTools overlay, zoom, labs, Notilus DevTools séparé)
- `src/components/browser/DevToolsPanel.tsx` (overlay, bordures)
- `src/components/browser/DevToolsSidebar.tsx` (retirer items, ajouter labs)
- `src/components/browser/SidebarPanel.tsx` (ajouter labs)
- `src/components/browser/GitHubReposPanel.tsx` (écran connexion centré)
- `src/components/browser/BookmarksPanel.tsx` (message vide centré)
- `src/components/browser/HistoryPanel.tsx` (message vide centré)
- `src/components/browser/DownloadsPanel.tsx` (message vide centré)
- `src/components/browser/WidgetsPanel.tsx` (données réelles)
- `src/components/browser/SettingsPanel.tsx` (UI nettoyée, vrai logo)
- `src/components/browser/DocumentationPanel.tsx` (vrai logo, meilleure structure)
- `src/hooks/useBrowserState.ts` (zoom state, notilusDevToolsOpen)
- `src/hooks/useSystemMonitor.ts` (garder tel quel, déjà connecté)
- `src/components/browser/DesktopWebviewLayer.tsx` (fix TS)
- `src/test/setup.ts` (fix TS)
- `electron/main/index.ts` (fix TS)

