

# Plan: Corrections UX, build fixes, Settings redesign, sidebar web icons en bas

## 1. Fix tous les build errors (priorité absolue)

### `src/lib/electronBridge.ts` (lignes 21-27)
- Les types Terminal* sont importés depuis `browser-contract` mais ne sont pas ré-exportés — changer l'import pour les prendre depuis `../../shared/terminal-contract` directement.

### `src/components/browser/BackendLabPanel.tsx` (ligne 44)
- Le type `{ size?: number }` est incompatible avec LucideIcon. Changer le type icon dans `TABS` en `React.ComponentType<any>` ou `LucideIcon`.

### `src/components/browser/LighthousePanel.tsx` (ligne 91)
- `raw` est typé `| null` mais affecté à un `unknown`. Ajouter un cast `as typeof raw` après le `.catch(() => null)`.

### `src/components/browser/NavigationBar.tsx` (ligne 244) et `SpeedDial.tsx` (ligne 238)
- `event.isComposing` n'existe pas sur `React.KeyboardEvent`. Utiliser `(event.nativeEvent as KeyboardEvent).isComposing` ou `event.nativeEvent.isComposing`.

### `src/components/browser/devtools/DevConsole.tsx` (ligne 44)
- `fractionalSecondDigits` n'existe pas dans le type `DateTimeFormatOptions`. Caster les options en `Intl.DateTimeFormatOptions & { fractionalSecondDigits?: number }`.

### `src/test/sidebarPanel.test.tsx` (lignes 6-15)
- L'objet `stats` manque les propriétés réseau. Ajouter les champs manquants : `networkOnline`, `networkLatency`, `networkJitter`, `networkPacketLoss`, `networkInterface`, `networkQuality`, `updatedAt`.

### `src/test/useBrowserState.desktop.test.tsx` (lignes 26-170)
- Le mock `bridge` manque les méthodes `getBackendLabState`, `startBackendLab`, `stopBackendLab`, `restartBackendLab`, `onBackendLabStateChanged`, `getSystemMetrics`, `onSystemMetricsChanged`, `studioSetWebviewViewport`, `studioGetWebviewViewport`, `onStudioWebviewViewportChanged`, `openTerminalSession`, `sendTerminalInput`, `resizeTerminalSession`, `closeTerminalSession`, `onTerminalData`, `onTerminalExit`. Ajouter ces mocks.

### `electron/main/backend-sidecar-manager.ts` (ligne 297)
- `replaceAll` nécessite ES2021. Remplacer par `.split(x).join(y)` ou ajouter `es2021` au `lib` dans `tsconfig.node.json`.

## 2. Sidebar : icônes web en bas

**`src/components/browser/DevToolsSidebar.tsx`**
- Déplacer la section web services après le `<div className="flex-1" />` (le spacer), juste avant le bouton collapse. Ainsi les web services viennent du bas vers le haut.

## 3. Bottom bar : pas d'ouverture de panels latéraux

**`src/components/browser/StatusBar.tsx`** et **`BrowserShell.tsx`**
- Les éléments de la bottom bar qui ouvrent des choses (Labs, Tools) doivent ouvrir des overlays de type DevTools (en bas, au-dessus du contenu), pas des panels latéraux.
- Ajouter des callbacks `onOpenBottomOverlay` pour Frontend Lab, Backend Lab, Lighthouse, etc.
- Dans `BrowserShell`, créer un state `bottomOverlayPanel` qui rend le panneau correspondant en overlay absolu en bas (comme le DevTools Notilus), pas via le système de sidebar.

## 4. Settings : redesign complet

**`src/components/browser/SettingsPanel.tsx`**
- Refonte complète avec un design moderne inspiré de navigateurs comme Arc/Vivaldi :
  - Navigation par sections dans la sidebar gauche du panel (liste verticale de sections)
  - Contenu à droite qui scroll, chaque section bien séparée
  - Cards avec effets glass, icônes pour chaque section
  - Espacement généreux, typographie hiérarchisée
  - Section "Home Page" enrichie : ajout du réglage d'intervalle de changement de wallpaper, possibilité de changer le wallpaper manuellement
  - Section "About" avec le vrai logo `/logo_n_no_bg.png`
- Ajouter dans settings.ts un nouveau champ `wallpaperInterval` (durée en secondes, default 30)

## 5. SpeedDial : search bar standard sur wallpaper + rotation wallpaper

**`src/components/browser/SpeedDial.tsx`**
- Sur le style "modern" (avec wallpaper), la search bar doit avoir un fond opaque par défaut (`bg-notilus-surface-1 border-border`) au lieu de transparent.
- Ajouter la rotation automatique des wallpapers basée sur le `wallpaperInterval` des settings.
- Déplacer la météo et widgets utiles (date, quote) directement sur la page d'accueil (pas dans un panel séparé).

**`src/lib/settings.ts`**
- Ajouter `wallpaperInterval: number` (default 30) dans `BrowserSettings`.

## 6. Widget Panel → supprimé de la sidebar

**`src/components/browser/DevToolsSidebar.tsx`**
- Retirer `widgets` de `SIDEBAR_ITEMS`. Les infos utiles (météo, horloge, quotes) sont déjà sur la page d'accueil.

---

## Fichiers à modifier
- `src/lib/electronBridge.ts` (fix terminal imports)
- `src/components/browser/BackendLabPanel.tsx` (fix icon type)
- `src/components/browser/LighthousePanel.tsx` (fix type cast)
- `src/components/browser/NavigationBar.tsx` (fix isComposing)
- `src/components/browser/SpeedDial.tsx` (fix isComposing, search bar opaque, wallpaper rotation)
- `src/components/browser/devtools/DevConsole.tsx` (fix fractionalSecondDigits)
- `src/test/sidebarPanel.test.tsx` (add missing stats fields)
- `src/test/useBrowserState.desktop.test.tsx` (add missing bridge mocks)
- `electron/main/backend-sidecar-manager.ts` (fix replaceAll)
- `src/components/browser/DevToolsSidebar.tsx` (web icons en bas, retirer widgets)
- `src/components/browser/StatusBar.tsx` (bottom overlays au lieu de panels)
- `src/components/browser/BrowserShell.tsx` (bottom overlay system)
- `src/components/browser/SidebarPanel.tsx` (retirer widgets du panel map)
- `src/components/browser/SettingsPanel.tsx` (redesign complet)
- `src/lib/settings.ts` (ajouter wallpaperInterval)

