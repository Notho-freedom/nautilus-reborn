

# Plan: Refonte design commerciale de Notilus Browser

## Diagnostic

Le design actuel souffre de plusieurs problèmes qui le rendent amateur :
- **Densité visuelle plate** : tout est au meme niveau, pas de hiérarchie visuelle claire
- **Surfaces monotones** : bg-background partout, pas de profondeur ni de layering
- **Typographie trop petite/uniforme** : tout en text-xs/text-[10px], pas de contraste
- **Couleurs ternes** : le rose accent (#FF2D55) est sous-exploité, tout est gris
- **Manque de polish** : pas de micro-interactions, pas de hover states sophistiqués, pas de transitions fluides
- **SpeedDial basique** : le logo pixélisé qui pulse, l'horloge géante, les cartes glass plates
- **Tab bar et nav bar trop fines** : h-9/h-10 donne un look compressé
- **StatusBar invisible** : h-6 avec du texte en 10px
- **Sidebar icons sans distinction** : tous les icons identiques, pas de groupement visuel
- **Panels latéraux plats** : SidebarPanelShell sans élévation ni séparation visuelle

## Approche de redesign

S'inspirer de **Arc Browser**, **Vivaldi**, **Figma**, **Linear** et **Raycast** : interfaces premium, layering subtil, animations fluides, typographie soignée.

## 1. Refonte du systeme de couleurs et surfaces (index.css)

**Nouvelles variables CSS** :
- Ajouter `--notilus-surface-elevated` : surface surélevée avec ombre subtile
- Ajouter `--notilus-surface-overlay` : pour les panels flottants
- Réviser `--border` : passer de blanc 12% a blanc 8% pour plus de subtilité
- Ajouter `--notilus-accent-glow` : halo de couleur autour des éléments actifs
- Ajouter des shadows tokenisées : `--shadow-sm`, `--shadow-md`, `--shadow-panel`

**Nouvelles utility classes** :
- `.surface-elevated` : bg + box-shadow + border subtil
- `.surface-panel` : pour les panels latéraux avec ombre portée
- `.surface-hover` : état hover avec léger éclaircissement
- Réviser `.glass` : rendre le blur plus fort (24px), opacité plus élevée
- Ajouter `.glass-panel` : version spéciale pour les grands panels

## 2. Refonte TopChromeBar (TopChromeBar.tsx)

- Passer de `h-9` a `h-10` avec padding ajusté
- Fond : `bg-notilus-surface-1` au lieu de `bg-background` pour créer une séparation
- Tabs : coins plus arrondis (`rounded-lg`), fond actif plus distinct avec subtle shadow
- Tab active : fond `bg-card` avec `shadow-sm` + bordure accent plus visible (3px au lieu de 2px)
- Tabs inactives : hover state avec transition de fond plus visible
- Group chips : fond gradient subtil au lieu de fond plat
- Boutons Add/Search : style pill avec fond muted
- Logo : version compacte avec opacity dynamique au hover

## 3. Refonte NavigationBar (NavigationBar.tsx)

- Passer de `h-10` a `h-11`
- Barre d'URL : fond `bg-notilus-surface-1` permanent (pas transparent), bordure visible en idle
- Barre d'URL focus : glow subtil autour (`ring-2 ring-primary/20`), fond éclairci
- Boutons nav (back/forward/reload/home) : style unifié avec `bg-notilus-surface-1` groupé (button group)
- Séparer visuellement les boutons nav des URL actions
- Profile avatar : anneau coloré quand connecté
- Icones d'action dans la barre : taille 14 au lieu de 13, espacement accru
- Section droite : fond groupé `bg-notilus-surface-1 rounded-lg` pour Extensions/Downloads/AI/Profile

## 4. Refonte DevToolsSidebar (DevToolsSidebar.tsx)

- Largeur : passer de `w-11` a `w-12`
- Icones : taille 16 au lieu de 15
- Active state : fond `bg-primary/15` + indicator bar de 3px a gauche (au lieu de juste bg)
- Hover state : scale(1.05) subtil + fond
- Séparateurs : style dot (3 points) au lieu de ligne plate
- Section "Web" : label mieux stylisé avec badge count
- Collapse button : icone plus visible, fond permanent

## 5. Refonte SidebarPanelShell (SidebarPanelShell.tsx)

- Largeur du panel : min 320px
- Fond : `surface-panel` class avec ombre portée a droite
- Header : plus grand (p-4), titre plus visible (text-sm au lieu de text-xs)
- Recherche : hauteur 9 au lieu de 8, coins plus arrondis
- Filters : style pill plus prononcé avec fond visible
- Animation d'ouverture : slide-in-left plus fluide avec ease-out

## 6. Refonte SpeedDial (SpeedDial.tsx)

C'est le composant le plus visible et le plus critique.

- **Logo** : réduire a `w-24 h-24`, arreter l'animation glow-breathe permanente (trop amateur), remplacer par un hover-only glow
- **Horloge** : réduire la taille de `text-6xl` a `text-5xl`, poids `font-light` (pas extralight), tracking réduit
- **Greeting** : supprimer "Developer" — juste le greeting
- **Barre de recherche** : design pill plus marqué, fond toujours visible, icone de moteur de recherche, hauteur plus grande
- **Favoris** : grid plus serrée, icones dans des cercles (pas des carrés), hover scale subtil
- **Cards du bas** (Recent/Quote/Quick Actions) : refonte complète
  - Fond : `bg-notilus-surface-1` avec bordure subtile au lieu de `.glass`
  - Headers de section : style plus clean, pas d'uppercase tracking-wider partout
  - Quick Actions : style bouton plus prononcé avec icones colorées
  - Quote : style plus minimal, pas de icone Quote énorme
- **Animation** : les éléments apparaissent en cascade avec des delays, mais l'animation est plus subtile (translateY(4px) au lieu de 10px)

## 7. Refonte StatusBar (StatusBar.tsx)

- Hauteur : passer de `h-6` a `h-7`
- Fond : `bg-notilus-surface-1` pour séparation visuelle
- Texte : `text-[11px]` au lieu de `text-[10px]`
- Boutons : hover plus visible
- Indicateurs (CPU/RAM/Network) : micro-barres de progression colorées au lieu de texte brut
- Zoom controls : slider visuel compact au lieu de boutons +/-

## 8. Refonte AIAssistant (AIAssistant.tsx)

- Header : fond gradient subtil
- Messages : bulles avec coins arrondis différents pour user/assistant
- Input : style plus premium avec fond distinct
- Quick actions : style chips arrondis au lieu de boutons rectangulaires

## 9. Corrections build (en parallele)

| Fichier | Fix |
|---------|-----|
| `electron/main/tab-manager.ts:742` | Remplacer `view.webContents.destroy()` par `view.webContents.close()` |
| `src/lib/webSurfaceManager.ts:487` | Cast `webview` avec `setAttribute('src', url)` au lieu de `.src =` |
| `src/test/useBrowserState.desktop.test.tsx:26` | Ajouter les mocks manquants : `moveTab`, `setTabRenderMode`, `setViewportBounds` |
| `electron/main/index.ts:41` | Cast le type ou utiliser `.includes()` au lieu de `===` pour la comparaison |

## 10. Animations et transitions globales (index.css + tailwind.config.ts)

- Ajouter keyframes : `fade-in` (opacity only), `slide-up-sm` (4px), `scale-in` pour panels
- Transition par défaut sur tous les éléments interactifs : `transition-all duration-150`
- Hover states universels : tous les boutons ont un hover défini
- Focus-visible : ring primary subtil sur tous les éléments focusables
- Réduire `reduced-motion` a juste désactiver les animations, pas les transitions

## Fichiers modifiés

| Fichier | Scope |
|---------|-------|
| `src/index.css` | Variables CSS, surfaces, shadows, animations |
| `tailwind.config.ts` | Tokens shadows, animations, spacing |
| `src/components/browser/TopChromeBar.tsx` | Layout, couleurs, hover states |
| `src/components/browser/NavigationBar.tsx` | Layout, URL bar, button groups |
| `src/components/browser/DevToolsSidebar.tsx` | Sizing, active indicators |
| `src/components/browser/SidebarPanelShell.tsx` | Panel elevation, header, animation |
| `src/components/browser/SpeedDial.tsx` | Redesign complet du home |
| `src/components/browser/StatusBar.tsx` | Layout, micro-visualizations |
| `src/components/browser/AIAssistant.tsx` | Chat UI polish |
| `src/components/browser/BrowserShell.tsx` | Layout spacing adjustments |
| `electron/main/tab-manager.ts` | Fix build error |
| `electron/main/index.ts` | Fix build error |
| `src/lib/webSurfaceManager.ts` | Fix build error |
| `src/test/useBrowserState.desktop.test.tsx` | Fix missing mocks |

