

# Plan: Affinage UI commercial — bordures, icônes fines, panels et page settings

## Scope
Quatre axes d'affinage avant la prochaine grande étape :
1. **Quick fixes ciblés** (NavigationBar, StatusBar, SpeedDial)
2. **Système d'icônes fines** global
3. **Refonte de tous les panels latéraux** (design, structure, bordures)
4. **Refonte du panel Settings** en multi-pages (une vue par onglet)

---

## 1. Quick fixes ciblés

### NavigationBar (deuxième barre / barre d'adresse)
- **Retirer les conteneurs avec fond/bordure** autour des groupes de boutons (gauche `bg-notilus-surface-1 rounded-lg p-0.5` et droite `bg-notilus-surface-1 rounded-lg p-0.5`). Les boutons restent visibles individuellement, fond transparent comme Settings/Profile à l'extrême droite.
- **Barre d'URL au repos** : retirer la bordure (`border-border` → `border-transparent`), fond plus subtil.
- **Au focus** : garder uniquement la bordure du conteneur URL (`border-primary/40 + ring`), mais **retirer toute bordure/outline** sur l'`<input>` (déjà `outline-none`, vérifier qu'aucun `focus-visible:ring` global ne s'applique via `:focus-visible` dans `index.css`).
- **Fix global focus-visible** : dans `index.css`, le sélecteur `:focus-visible { box-shadow: 0 0 0 2px ... }` s'applique à tous les éléments y compris les `<input>`. Le restreindre à `button:focus-visible, a:focus-visible, [role="button"]:focus-visible` pour ne pas dupliquer la bordure sur les inputs.

### StatusBar (bottom bar)
- **Bloc réseau** : actuellement combine `<Wifi/>` + `<NetworkSignal>` (les barres). Garder uniquement l'icône Wifi/WifiOff + le label, **supprimer le composant `NetworkSignal`** (les 4 barres redondantes).

### SpeedDial (Home)
- **Barre de recherche** : même traitement que NavigationBar — retirer la bordure du conteneur au repos (laisser uniquement fond + ombre subtile), retirer toute bordure/ring sur l'`<input>`. Au focus, garder uniquement le ring/border du conteneur.

---

## 2. Icônes fines (global)

Lucide n'a pas de variante "outline thin" séparée mais accepte `strokeWidth`. Par défaut c'est `2`. Pour un look fin et premium :
- Définir un `strokeWidth={1.5}` par défaut sur **toutes les icônes Lucide** des composants browser.
- Approche : remplacer manuellement dans les composants principaux (NavigationBar, TopChromeBar, StatusBar, SidebarPanelShell, DevToolsSidebar, SettingsPanel, tous les panels listés ci-dessous) en ajoutant `strokeWidth={1.5}` aux icônes Lucide.
- Ne pas toucher aux icônes décoratives qui dépendent du `fill` (Star, Pin actifs).

---

## 3. Refonte des panels latéraux

### SidebarPanelShell (composant racine)
- **Bordure droite** : conserver subtile (`border-border/50`). Retirer toute autre bordure interne redondante.
- **Header** : garder propre, retirer la `border-b border-border` de séparation, utiliser plutôt un padding plus généreux pour la hiérarchie.
- **Filters bar** : retirer `border-b border-border`. Séparation par espace seulement.
- **Footer** : retirer `border-t border-border`.
- **Search input** : retirer `border border-border`, fond `bg-notilus-surface-2` suffit. Au focus, retirer `border-primary/40` du conteneur, garder juste le `ring-2 ring-primary/15` subtil.

### Panels concernés (mêmes principes appliqués)
**Pour chacun** : retirer les bordures verticales/horizontales en désordre, harmoniser l'espacement, alléger les "cartes" en favorisant des séparations par espace ou hover background plutôt que `border`.

| Panel | Refactor principal |
|-------|--------------------|
| `BookmarksPanel.tsx` | Items en lignes hover, retirer borders entre items |
| `HistoryPanel.tsx` | Accordion sans borders, items en lignes propres groupées par date |
| `DownloadsPanel.tsx` | Cards sans border, fond hover |
| `ExtensionsPanel.tsx` | Liste alignée, retirer cards encadrées |
| `WorkspacesPanel.tsx` | Items en grille sans border |
| `WebServicePanel.tsx` | Hover row simple |
| `GitHubReposPanel.tsx` + `GitHubRepoView.tsx` + `GitHubFileViewer.tsx` | Lister sans borders, fines séparations |
| `GitPanel.tsx` | Sections espacées sans encadrés |
| `TerminalPanel.tsx` | Header simple, contenu xterm prend tout l'espace |
| `StudioPanel.tsx` | Form épuré, retirer borders cards |
| `FrontendLabPanel.tsx` / `BackendLabPanel.tsx` | Tabs propres, contenu sans encadrés |
| `LighthousePanel.tsx` | Métriques en colonnes sans borders |
| `DocumentationPanel.tsx` / `ApiDocsPanel.tsx` / `UpdatesPanel.tsx` / `FlouPanel.tsx` / `MosaicPanel.tsx` / `WidgetsPanel.tsx` | Refonte épurée selon même charte |

### DevTools bottom (`DevToolsPanel.tsx`, `NotilusMiniDevToolsPanel.tsx` + `devtools/*`)
- **Icônes fines** (`strokeWidth={1.5}`)
- **Tabs** : style propre sans borders en désordre, séparateurs subtils ou aucun
- Onglets internes (Console/Elements/Network/Sources/Performance/Application) : passes en revue pour bordures/cartes redondantes

---

## 4. Refonte du panel Settings (multi-pages)

### Problème actuel
- Single-page scroll avec toutes les sections empilées
- Cards `border border-border/30 bg-card/40` partout → effet "désordonné"

### Nouvelle structure
**Layout** : nav latérale gauche (gardée) + **vue unique** à droite qui change selon l'onglet sélectionné (pas de scroll-into-view).

```text
┌──────────┬──────────────────────────────────┐
│ Appearance│  ┌─ Page: Appearance ──────────┐│
│ Home Page │  │  Dark Mode      [switch]    ││
│ Tabs      │  │                             ││
│ Terminal  │  │  Accent Color               ││
│ Privacy   │  │  [grid de couleurs]         ││
│ ...       │  └─────────────────────────────┘│
└──────────┴──────────────────────────────────┘
```

### Changements
- Remplacer `scrollToSection` par un simple `setActiveSection` qui conditionne le rendu : `{activeSection === 'appearance' && <AppearanceSection/>}`.
- **Extraire chaque section** dans son propre sous-composant local : `AppearanceSection`, `HomePageSection`, `TabsSection`, `TerminalSection`, `PrivacySection`, `WebServicesSection`, `AISection`, `GeneralSection`, `NotificationsSection`, `AboutSection`.
- **Section wrapper** (`Section`) : retirer `border border-border/30 bg-card/40`. Juste un titre + contenu, espacement vertical généreux.
- **Nav gauche** : garder l'indicateur `border-r-2 border-primary` à gauche pour l'item actif (subtil, fin).
- **SelectRow** : retirer `border border-border/50`, utiliser `bg-muted/30` seul + `focus:ring-1 ring-primary/30`.
- **Cartes "About"** (`bg-muted/30 p-4 border border-border/30`) : retirer la border, juste fond.
- Augmenter la largeur de la nav à `w-[140px]` pour respiration et label complet.

---

## 5. Fichier-clé : `src/index.css`

Affiner le focus global :
```css
/* Avant : tous les éléments */
:focus-visible { box-shadow: 0 0 0 2px hsl(var(--primary)/0.3); }

/* Après : uniquement boutons et liens */
button:focus-visible, a:focus-visible, [role="button"]:focus-visible {
  box-shadow: 0 0 0 2px hsl(var(--primary)/0.3);
  border-radius: var(--radius);
}
input:focus-visible, textarea:focus-visible, select:focus-visible {
  outline: none; /* le conteneur gère la focus state */
}
```

Affiner les bordures globales : `--border` à blanc 6-7% au lieu de 14% pour des séparations vraiment fines et discrètes.

---

## Fichiers modifiés

| Catégorie | Fichiers |
|-----------|----------|
| Quick fixes | `NavigationBar.tsx`, `StatusBar.tsx`, `SpeedDial.tsx`, `index.css` |
| Shell | `SidebarPanelShell.tsx` |
| Panels (left/bottom) | `BookmarksPanel.tsx`, `HistoryPanel.tsx`, `DownloadsPanel.tsx`, `ExtensionsPanel.tsx`, `WorkspacesPanel.tsx`, `WebServicePanel.tsx`, `GitHubReposPanel.tsx`, `GitHubRepoView.tsx`, `GitHubFileViewer.tsx`, `GitPanel.tsx`, `TerminalPanel.tsx`, `StudioPanel.tsx`, `FrontendLabPanel.tsx`, `BackendLabPanel.tsx`, `LighthousePanel.tsx`, `DocumentationPanel.tsx`, `ApiDocsPanel.tsx`, `UpdatesPanel.tsx`, `FlouPanel.tsx`, `MosaicPanel.tsx`, `WidgetsPanel.tsx` |
| DevTools | `DevToolsPanel.tsx`, `NotilusMiniDevToolsPanel.tsx`, `devtools/DevConsole.tsx`, `devtools/DevElements.tsx`, `devtools/DevNetwork.tsx`, `devtools/DevSources.tsx`, `devtools/DevPerformance.tsx`, `devtools/DevApplication.tsx` |
| Settings refonte | `SettingsPanel.tsx` (refactor en multi-pages) |
| Icônes fines | passes `strokeWidth={1.5}` sur tous les fichiers ci-dessus |

## Notes
- Préserver la fonctionnalité existante (états, callbacks, tests).
- Les tests `sidebarPanel.test.tsx`, `topChromeBar.tabs.test.tsx`, `navigationBar.actions.test.tsx`, `speedDial.searchStyle.test.tsx` doivent rester verts. Si les attentes sur classes CSS spécifiques cassent, mettre à jour les tests pour refléter la nouvelle direction.

