

# Plan : Refonte « Opera GX pour développeurs » — finition HD complète

## Vision
Sortir de l'effet « jouet » en s'inspirant profondément d'**Opera GX** : densité contrôlée, surfaces continues sans frontières visibles, dégradés sombres profonds, lueurs accentuées sur les éléments actifs uniquement, icônes ultra-fines (stroke 1.25–1.5), typographie hiérarchisée, et animations subtiles partout. Aucune bordure « apparente » — uniquement des transitions de surface.

## Principes pixel-près
1. **Bordures supprimées partout par défaut** — séparation par dégradé de surface (`bg-notilus-surface-1` vs `bg-notilus-surface-2`) ou par espacement, jamais par trait.
2. **Bordures conservées uniquement** sur la frontière entre régions majeures (top chrome ↔ contenu, sidebar ↔ panel) avec opacité ~25 % (`border-border/30`).
3. **Icônes Lucide** : `strokeWidth={1.25}` pour les icônes ≥ 14 px, `strokeWidth={1.5}` pour < 14 px. Aucun `strokeWidth=2`.
4. **Active state** : fond teinté primaire (`bg-primary/10`) + barre indicatrice 2 px primaire + leger glow (`shadow-[0_0_12px_-2px_hsl(var(--primary)/0.4)]`). Jamais de bordure.
5. **Hover** : transition douce de fond (`bg-notilus-surface-2/60`) + `transition-all duration-200`.
6. **Surfaces gradient** : remplacer les blocs plats par `gradient-surface` (linear top→bottom subtil) sur les chrome bars et panels, à la Opera GX.
7. **Typographie** : titres section en `text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-medium`. Contenu principal en `text-xs` ou `text-sm`. Toujours `font-body` (Rajdhani) ou `font-display` (Orbitron) pour les chiffres/titres.

---

## 1. Système global (`src/index.css` + `tailwind.config.ts`)

- **Variables CSS** :
  - `--border` passe à `240 10% 14%` (un peu plus visible mais avec usage strict via `/30` ou `/40`).
  - Ajouter `--surface-gradient-top: 240 22% 7%` et `--surface-gradient-bottom: 240 20% 5%` (pour gradient-surface plus profond).
  - Ajouter `--accent-glow-soft: 0 0 24px -6px hsl(var(--primary) / 0.35)`.
  - `--shadow-inset` : `inset 0 1px 0 0 hsl(0 0% 100% / 0.03)` — ligne lumineuse en haut des surfaces (effet Opera GX).
- **Utilitaires nouveaux** :
  - `.surface-chrome` : `gradient-surface` + `box-shadow: var(--shadow-inset)` — pour TopChromeBar, NavigationBar, StatusBar, sidebar.
  - `.surface-panel-gx` : `bg-notilus-surface-1` + `shadow-panel` + `border-r border-border/25` (frontière unique panel/contenu).
  - `.glow-active` : utilisée sur boutons actifs.
  - `.hairline` : `border-border/25` pour les rares séparations indispensables.
- **Animations affinées** :
  - `transition-all duration-200 ease-out` par défaut sur boutons.
  - Nouvelle keyframe `glow-pulse-soft` pour active states subtils.

## 2. TopChromeBar (header niveau 1)

- Fond : `surface-chrome` au lieu de `bg-notilus-surface-1` plat.
- **Bordure inférieure supprimée** — séparation par contraste de surface uniquement avec NavigationBar.
- Onglets actifs : retirer `bg-card`, mettre `bg-notilus-surface-2` + `glow-active` (soft) + barre 2 px en bas.
- Onglets inactifs : juste hover de fond, pas de bordure.
- Onglet privé : retirer `border-dashed`, remplacer par fond `bg-muted/40` + icône masque.
- Icônes (`Plus`, `Search`, `X`, `Pin`) : `strokeWidth={1.25}`, taille 14.
- Group chips : conserver gradient mais retirer toute bordure ; pour le state actif, ajouter le glow soft.
- Logo : `w-[22px]` + `opacity-70 hover:opacity-100`.

## 3. NavigationBar (header niveau 2)

- Fond : `surface-chrome` + suppression de `border-b border-border` (déjà presque fait, on remplace par contraste de surface).
- Hauteur `h-11` conservée.
- URL bar :
  - Idle : `bg-notilus-surface-2/60`, **aucune bordure visible** (`border-transparent`), juste un soft hover background.
  - Focus : `bg-notilus-surface-2` + `ring-1 ring-primary/30` + `shadow-[0_0_18px_-6px_hsl(var(--primary)/0.4)]`. Pas de border conteneur.
  - Input : `outline-none` strict, aucun ring, géré par parent.
- Icônes URL bar (`Lock`, `Star`, `Pin`, `Camera`, `Shield`, etc.) : `strokeWidth={1.25}`, taille 13–14.
- Boutons nav (back/forward/reload/home) : `strokeWidth={1.25}`, hover `bg-notilus-surface-2/60`.
- Avatar profile : ring `ring-primary/40` quand connecté, sinon `ring-border/30`.

## 4. StatusBar (bottom bar)

- Fond `surface-chrome`, `border-t border-border/25` (la seule frontière conservée).
- Icônes système (`Cpu`, `MemoryStick`, `Wifi`, `Lock`, `GitBranch`, etc.) : `strokeWidth={1.25}`, taille 11.
- MicroBar : déjà bien — augmenter contraste des seuils couleur.
- Zoom slider : conserver mais affiner le thumb à 2 px de hauteur, knob 8 px.
- Séparateur vertical : remplacer `bg-border` par `bg-border/30`.
- Boutons Labs / Tools / DevTools / History : icônes 11 px stroke 1.25, hover plus prononcé.

## 5. DevToolsSidebar (vertical icon bar)

- Largeur `w-12`, fond `surface-chrome`, bordure droite `border-r border-border/25` (frontière de région).
- Icônes 16 px en `strokeWidth={1.25}`.
- Active : `bg-primary/12` + barre 2 px gauche `bg-primary` + soft glow `shadow-[inset_2px_0_8px_-4px_hsl(var(--primary)/0.5)]`.
- Hover : `bg-notilus-surface-2/60`, retirer `scale-105` (trop kiddie).
- Séparateurs (3 dots) : remplacer par un trait fin `h-px w-5 bg-border/30 mx-auto my-2` (plus pro, moins « bubble »).
- Label « Web » : retirer le pill `bg-notilus-surface-1`, remplacer par texte simple `text-[8px] uppercase tracking-[0.2em] text-muted-foreground/40`.

## 6. SidebarPanelShell (conteneur de tous les panels)

- Classe racine : `surface-panel-gx` (gradient + frontière droite uniquement).
- Header : retirer toute bordure interne, padding `px-4 pt-4 pb-3` conservé.
- Titre : `text-[11px] uppercase tracking-[0.2em] text-primary/85 font-medium` (retirer le `font-semibold` agressif).
- Boutons header (`MoreVertical`, `X`) : 7×7, stroke 1.25.
- Search input bloc : `bg-notilus-surface-2/70`, focus `ring-1 ring-primary/25`, **aucune bordure**.
- Filters : pill `px-2.5 py-1 rounded-full text-[10px]`, active `bg-primary/15 text-primary`, hover `bg-notilus-surface-2/60`. Retirer arrondi rectangulaire.
- Footer : retirer toute bordure top, juste padding.

## 7. Refonte de TOUS les panels (15 fichiers)

Pour chacun (`BookmarksPanel`, `HistoryPanel`, `DownloadsPanel`, `ExtensionsPanel`, `WorkspacesPanel`, `WebServicePanel`, `GitHubReposPanel`, `GitHubRepoView`, `GitHubFileViewer`, `GitPanel`, `TerminalPanel`, `StudioPanel`, `FrontendLabPanel`, `BackendLabPanel`, `LighthousePanel`, `DocumentationPanel`, `ApiDocsPanel`, `UpdatesPanel`, `FlouPanel`, `MosaicPanel`) :

- **Supprimer toutes les classes `border-b border-border/50`, `border border-border/30`, `border-t border-border`, etc.** dans les items, cartes, sections internes.
- Remplacer la séparation entre items par : `hover:bg-notilus-surface-2/50 transition-colors` + un éventuel `divide-y divide-border/15` minimal sur les listes denses (Extensions, Bookmarks).
- Cartes/sections : remplacer `border + bg-card/40` par `bg-notilus-surface-2/40 rounded-lg p-3`.
- Toggle switches (Extensions) : `bg-primary` actif, `bg-notilus-surface-2` inactif, knob `bg-foreground` avec ombre douce.
- Toutes icônes Lucide : `strokeWidth={1.25}`.
- Icônes décoratives par catégorie : ajouter `text-primary/80` sur les icônes d'item actif.

## 8. Settings Panel

- Section nav left : `bg-notilus-surface-1`, item actif `bg-primary/10` + barre `border-l-2 border-primary` (déjà fait), retirer toute autre bordure.
- Page droite : retirer toutes les bordures de cartes, remplacer par `bg-notilus-surface-2/40 rounded-xl p-4`.
- SelectRow / inputs : `bg-notilus-surface-2`, focus `ring-1 ring-primary/25`, **aucune border**.
- Color grid (accent) : cellules 28×28 rounded-full, active = `ring-2 ring-primary` + `glow-active`.

## 9. DevToolsPanel (bottom dock)

- Fond : `surface-chrome` au lieu de `bg-card/95`.
- Bordure top `border-border/25` uniquement (frontière de région).
- Tab bar interne : retirer `border-b border-border/35`, remplacer par contraste de fond (tab bar `bg-notilus-surface-2/40`, contenu `bg-notilus-surface-1`).
- Tabs : pill `rounded-md px-2.5 h-7 text-[10px] uppercase tracking-[0.15em]`, active `bg-primary/15 text-primary` + barre 2 px en bas.
- Badges (Err / Warn / Req) : retirer fond marqué, mettre `text-red-400/80 text-[9px] tabular-nums` simple, espacés.
- Icônes (`Eye`, `EyeOff`, `Laptop`, `Tablet`, `Smartphone`, `Eraser`, `Settings`, `ArrowDownToLine`, `X`) : 11–12 px stroke 1.25.
- Resizer drag handle : `h-[2px]` + hover primary subtil.

## 10. Sous-onglets DevTools (`devtools/*`)

Pour `DevConsole`, `DevElements`, `DevNetwork`, `DevSources`, `DevPerformance`, `DevApplication` :

- Toolbars internes : retirer `border-b`, séparation par contraste de surface.
- Filters/level chips : pill `rounded-full px-2 h-5 text-[9px]`, retirer fond `bg-muted/...` agressif.
- Lignes de console / network : retirer borders entre lignes, juste hover `bg-notilus-surface-2/40`.
- Headers de tableau (Network, Application) : `bg-notilus-surface-2/30 text-[9px] uppercase tracking-[0.15em] text-muted-foreground/60`, **aucune bordure**.
- Icônes (`Search`, `Trash2`, `ChevronRight`, `RefreshCw`, `FileCode`, etc.) : `strokeWidth={1.25}`.

## 11. SpeedDial (Home)

- Logo `w-16 h-16` (réduire encore), drop-shadow uniquement au hover.
- Horloge : `text-5xl font-display font-light tracking-[0.18em]` conservée.
- Search bar : `h-12 rounded-2xl bg-notilus-surface-2/60` idle, focus `bg-notilus-surface-2 ring-1 ring-primary/25 shadow-[0_0_24px_-6px_hsl(var(--primary)/0.4)]`. Aucune border. Input strictement `outline-none`.
- Favorites : icône dans cercle `bg-notilus-surface-2/50` (au lieu de `bg-notilus-surface-2`), hover scale 1.08, retirer ombre lourde.
- Recent / Quote / Quick actions : retirer `bg-notilus-surface-1/70 rounded-xl` agressif, mettre `bg-notilus-surface-1/40` + retirer toute bordure.

## 12. AIAssistant (panneau chat)

- Header : gradient subtil `gradient-surface`, retirer borders.
- Messages user : `bg-primary/15 text-foreground rounded-2xl rounded-br-sm`.
- Messages assistant : `bg-notilus-surface-2/60 rounded-2xl rounded-bl-sm`.
- Input : pill `bg-notilus-surface-2`, focus ring primary 25.
- Quick actions : chips `rounded-full bg-notilus-surface-2/60`.

## 13. Animations & micro-interactions

- Tous boutons : `transition-all duration-200 ease-out`.
- Active state : `glow-pulse-soft` (lueur qui respire très doucement, 4s, opacité 0.3→0.5).
- Panel slide-in : `animate-slide-in-left` ralenti à 350 ms `ease-sharp` (déjà OK).
- Tab switch : ajouter une légère transition d'opacité 150 ms sur le contenu.
- Hover scale : retirer `hover:scale-105`/`scale-110` partout (jouet) sauf favorites SpeedDial à 1.08 (subtil).

## 14. Fichiers modifiés

| Catégorie | Fichiers |
|-----------|----------|
| Design system | `src/index.css`, `tailwind.config.ts` |
| Chrome | `TopChromeBar.tsx`, `NavigationBar.tsx`, `StatusBar.tsx`, `DevToolsSidebar.tsx` |
| Shell | `SidebarPanelShell.tsx`, `BrowserShell.tsx` (ajustement bordures) |
| Home & AI | `SpeedDial.tsx`, `AIAssistant.tsx` |
| Panels (20) | `BookmarksPanel`, `HistoryPanel`, `DownloadsPanel`, `ExtensionsPanel`, `WorkspacesPanel`, `WebServicePanel`, `GitHubReposPanel`, `GitHubRepoView`, `GitHubFileViewer`, `GitPanel`, `TerminalPanel`, `StudioPanel`, `FrontendLabPanel`, `BackendLabPanel`, `LighthousePanel`, `DocumentationPanel`, `ApiDocsPanel`, `UpdatesPanel`, `FlouPanel`, `MosaicPanel`, `SettingsPanel` |
| DevTools dock | `DevToolsPanel.tsx`, `NotilusMiniDevToolsPanel.tsx`, `devtools/DevConsole.tsx`, `devtools/DevElements.tsx`, `devtools/DevNetwork.tsx`, `devtools/DevSources.tsx`, `devtools/DevPerformance.tsx`, `devtools/DevApplication.tsx` |

## 15. Garde-fous tests
- Tests existants vérifiant des classes spécifiques (`sidebarPanel.test.tsx`, `speedDial.searchStyle.test.tsx`, `devToolsSidebar.styles.test.tsx`, `devToolsPanel.parity.test.tsx`) seront mis à jour pour refléter la nouvelle direction (suppression bordures, nouvelle classe `surface-chrome`).

## Résultat attendu
Une interface **continue, profonde, lumineuse aux bons endroits** — comme Opera GX mais orientée dev. Aucune bordure parasite, des surfaces qui se distinguent par dégradé subtil, des icônes filiformes (stroke 1.25), des active states qui pulsent doucement, et zéro effet « projet d'étudiant ».

