# Plan : Corrections UX Notilus

## 1. Persistance des onglets (localStorage)

**Fichier** : `src/hooks/useBrowserState.ts`

- Sauvegarder `localTabs` et `localActiveTabId` dans `localStorage` (`notilus_tabs` / `notilus_active_tab`)
- Au montage, restaurer depuis localStorage au lieu de partir avec un seul onglet par défaut
- Écrire dans localStorage à chaque changement de `localTabs` et `localActiveTabId` (via `useEffect`)
- Ne persister que les données sérialisables (id, title, url, kind) — pas isLoading etc.

## 2. Onglets : bouton fermer n'occupe pas d'espace réservé

**Fichier** : `src/components/browser/TopChromeBar.tsx`

- Le bouton close doit être en `position: absolute` à droite de l'onglet, pas dans le flux
- Le titre (`<span>`) occupe tout l'espace disponible après l'icône
- Le close apparaît uniquement au hover (`opacity-0 group-hover:opacity-100`) avec un fond semi-transparent pour ne pas masquer le texte
- En mode `icon-only`, pas de close du tout (déjà le cas)

**Fichier** : `src/components/browser/TopChromeBar.tsx` (hover card)

- Supprimer le message "No tabs from this domain" — si `sameDomainTabs` est vide, ne pas afficher la section liste du tout (garder juste le titre + URL)

## 3. Barre d'adresse : icônes sans couleur sauf si actives

**Fichier** : `src/components/browser/NavigationBar.tsx`

- Le composant `UrlActionButton` : quand `active` est false, utiliser `text-muted-foreground` (déjà le cas)
- Quand `active` est true : utiliser `text-primary` (rose/secondaire) pour le favori rempli, `text-green-500` pour le ad-blocker actif
- Passer une prop `activeColor` ou conditionner directement dans les usages

## 4. Sidebar : retirer les bordures des boutons

**Fichier** : `src/components/browser/DevToolsSidebar.tsx`

- Retirer `border border-primary/50` du style actif des boutons sidebar
- Garder uniquement le fond `bg-primary/20` et `text-white` pour l'état actif
- Idem pour les boutons web services

## 5. Tooltips/Popovers au-dessus de tout

**Fichier** : `src/index.css`

- Ajouter des règles CSS pour forcer les portails Radix (tooltips, popovers, hover cards) à un z-index très élevé (z-[9999])
- Cibler `[data-radix-popper-content-wrapper]` avec `z-index: 9999 !important`

## 6. Panneaux latéraux en overlay + redimensionnables

**Fichier** : `src/components/browser/BrowserShell.tsx`

- Le `SidebarPanel` ne doit plus pousser le contenu : le placer en `position: absolute` (ou `fixed`) par-dessus la zone de contenu, aligné à gauche après la sidebar d'icônes
- Ajouter un handle de resize (bordure droite draggable)
- Persister la largeur dans localStorage (`notilus_panel_width`)

**Fichier** : `src/components/browser/SidebarPanel.tsx`

- Créer un composant wrapper réutilisable `SidebarPanelShell` avec :
  - Header avec titre, bouton fermer, bouton options (dropdown)
  - Zone de recherche optionnelle (prop `searchable`)
  - Zone de filtres optionnelle (prop `filters`)
  - Slot pour le contenu enfant
  - Handle de resize à droite
- Tous les panneaux existants (Bookmarks, History, Downloads, etc.) utiliseront ce shell au lieu de dupliquer leur propre header

## 7. Composant `SidebarPanelShell` réutilisable

**Nouveau fichier** : `src/components/browser/SidebarPanelShell.tsx`

```text
┌─────────────────────────────┐
│ [icon] TITRE      [⋮] [✕]  │  ← header fixe
├─────────────────────────────┤
│ 🔍 Recherche...             │  ← optionnel (searchable)
├─────────────────────────────┤
│ [Filtre1] [Filtre2] [All]   │  ← optionnel (filters)
├─────────────────────────────┤
│                             │
│   Contenu (children)        │
│                             │
└─────────────────────────────┤ ← handle resize
```

Props :

- `title: string`
- `icon?: LucideIcon`
- `searchable?: boolean` + `searchValue / onSearchChange`
- `filters?: { label: string; value: string }[]` + `activeFilter / onFilterChange`
- `onClose: () => void`
- `menuItems?: { label: string; onClick: () => void }[]` (bouton options ⋮)
- `children: ReactNode`

Chaque panneau sera refactoré pour utiliser `<SidebarPanelShell>` au lieu de son propre header.

## 8. Fix build errors

**Fichier** : `src/components/browser/TopChromeBar.tsx`

- Les 5 erreurs `WebkitAppRegion` : caster les styles en `React.CSSProperties` (comme fait dans TitleBar)

**Fichier** : `src/test/tabLayout.test.ts`

- Ligne 11 : remplacer `min` par `minWidth` et `max` par `maxWidth` dans les options

## 9. Clés Supabase dans .env

Le fichier `.env` est auto-généré et contient déjà `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY`. Aucune modification manuelle nécessaire — le fichier ne doit pas être édité.  
  
NB: ASSURE TOI BIEN QUE LES OVERLAYS PASSENT BIEN AU DESSUS DE WEBCONTENTVIEW (PRIORITE MAX), JE NE PARLE PAS DE IFRAME

---

## Fichiers à créer

- `src/components/browser/SidebarPanelShell.tsx`

## Fichiers à modifier

- `src/hooks/useBrowserState.ts` (persistance tabs)
- `src/components/browser/TopChromeBar.tsx` (close button layout, hover card, TS fix)
- `src/components/browser/NavigationBar.tsx` (couleurs actives)
- `src/components/browser/DevToolsSidebar.tsx` (retirer bordures)
- `src/components/browser/SidebarPanel.tsx` (overlay + resize)
- `src/components/browser/BrowserShell.tsx` (layout overlay)
- `src/components/browser/BookmarksPanel.tsx` (utiliser SidebarPanelShell)
- `src/components/browser/HistoryPanel.tsx` (utiliser SidebarPanelShell)
- `src/components/browser/DownloadsPanel.tsx` (utiliser SidebarPanelShell)
- `src/components/browser/WidgetsPanel.tsx` (utiliser SidebarPanelShell)
- `src/components/browser/ExtensionsPanel.tsx` (utiliser SidebarPanelShell)
- `src/components/browser/DocumentationPanel.tsx` (utiliser SidebarPanelShell)
- `src/components/browser/MosaicPanel.tsx` (utiliser SidebarPanelShell)
- `src/components/browser/SystemMonitor.tsx` (utiliser SidebarPanelShell)
- `src/components/browser/TerminalPanel.tsx` (utiliser SidebarPanelShell)
- `src/components/browser/LighthousePanel.tsx` (utiliser SidebarPanelShell)
- `src/components/browser/GitPanel.tsx` (utiliser SidebarPanelShell)
- `src/components/browser/ApiDocsPanel.tsx` (utiliser SidebarPanelShell)
- `src/components/browser/SettingsPanel.tsx` (utiliser SidebarPanelShell)
- `src/components/browser/StudioPanel.tsx` (utiliser SidebarPanelShell)
- `src/components/browser/UpdatesPanel.tsx` (utiliser SidebarPanelShell)
- `src/components/browser/GitHubReposPanel.tsx` (utiliser SidebarPanelShell)
- `src/index.css` (z-index tooltips)
- `src/test/tabLayout.test.ts` (fix TS error)