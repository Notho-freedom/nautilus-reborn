

# Plan: Système de regroupement d'onglets par domaine + Corrections build

## Portée de cette itération

Ce plan couvre **deux objectifs** :
1. Le système de **tab grouping par domaine** avec couleurs et animations expand/collapse
2. La **correction des erreurs de build** existantes

La demande "terminer intégralement l'application" est trop large pour un seul passage. On traitera le tab grouping d'abord, puis on itérera sur les finitions dans les messages suivants.

---

## 1. Corrections build

### `src/components/browser/BrowserImportDialog.tsx` (ligne 2)
- L'import `../../shared/browser-contract` ne résout pas dans le contexte Vite web. Créer un fichier `src/types/browser-contract.ts` qui ré-exporte le type `ImportDataset` (ou le définir directement), et mettre à jour l'import.

### Fichiers `electron/` (TS errors)
- Ces fichiers sont pour Electron et ne devraient pas être compilés par Vite. Le `tsconfig.app.json` devrait les exclure. On vérifiera et ajoutera `"exclude": ["electron/**"]` si nécessaire. Alternativement, on corrige les types (`null` → `undefined`, `any` types) directement.

---

## 2. Système de Tab Grouping par Domaine

### Concept
```text
Avant (tabs individuels):
[github.com/repo1] [github.com/repo2] [youtube.com/a] [youtube.com/b] [docs.google.com]

Après (groupés, collapsed):
[■ github.com (2)] [■ youtube.com (2)] [docs.google.com]
       ↓ clic
[github.com/repo1] [github.com/repo2]  ← expanded, reste groupé visuellement
       ↓ clic sur un onglet spécifique  
[■ github.com (2)] ← re-collapsed, onglet sélectionné actif
```

### Architecture

#### `src/lib/tabGrouping.ts` — Nouveau fichier
- `groupTabsByDomain(tabs: BrowserTab[]): TabGroup[]`
  - Utilise `extractDomainGroup()` existant de `urlDisplay.ts`
  - Retourne `{ domain: string, color: string, tabs: BrowserTab[] }[]`
  - Les domaines uniques (1 seul onglet) ne forment pas de groupe
- `getDomainColor(domain: string): string` — Palette de 8 couleurs HSL assignées par hash du domaine. Couleurs: bleu, vert, orange, violet, rose, cyan, jaune, rouge.
- Types: `TabGroup { domain, color, tabs, isExpanded }`

#### `src/components/browser/TopChromeBar.tsx` — Modifier
- Remplacer le rendu linéaire des `regularTabs` par un rendu groupé
- State: `expandedGroup: string | null` (domaine du groupe ouvert)
- Logique de rendu:
  - Si un domaine a 2+ onglets → afficher un **chip groupé** (couleur de fond, icône, "domain (n)")
  - Clic sur chip groupé → `setExpandedGroup(domain)` → les onglets du groupe s'affichent avec animation slide/fade
  - Clic sur un onglet dans le groupe expanded → `onSelectTab(id)` + `setExpandedGroup(null)` → re-collapse
  - Le groupe contenant l'onglet actif montre un indicateur (bordure plus vive)
  - Domaines avec 1 seul onglet → rendu normal (inchangé)

#### Animations
- **Expand**: les onglets du groupe apparaissent avec `animate-scale-in` (scale 0.95→1 + fade)
- **Collapse**: `animate-scale-out` avant de revenir au chip
- **Chip groupé**: léger `hover:scale-105` + transition de couleur
- **Indicateur de couleur**: barre de 2px en bas du chip avec la couleur du groupe (style gradient actuel remplacé par couleur domaine)

### Rendu visuel du chip groupé
```text
┌──────────────────────┐
│ ● favicon  github.com (3)  │  ← fond teinté de la couleur du domaine (opacity 15%)
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔│  ← barre de couleur si contient l'onglet actif
└──────────────────────┘
```

### Rendu expanded
```text
┌─ github.com ─────────────────────────────────────┐
│ [repo1 ×] [repo2 ×] [issues ×]                   │  ← bordure gauche colorée
└──────────────────────────────────────────────────┘
```

### Fichiers modifiés/créés

| Fichier | Action |
|---------|--------|
| `src/lib/tabGrouping.ts` | Créer — logique de groupement + couleurs |
| `src/components/browser/TopChromeBar.tsx` | Modifier — rendu groupé avec expand/collapse |
| `src/lib/tabLayout.ts` | Modifier — adapter `computeTabWidth` pour prendre en compte les groupes |
| `src/components/browser/BrowserImportDialog.tsx` | Fix — corriger l'import du type |
| `src/types/browser-contract.ts` | Créer — types ré-exportés pour le contexte web |

### Détails d'implémentation

**Palette de couleurs par domaine** (8 couleurs):
```typescript
const DOMAIN_COLORS = [
  'hsl(210, 80%, 60%)',  // blue
  'hsl(150, 70%, 50%)',  // green
  'hsl(30, 90%, 55%)',   // orange
  'hsl(270, 70%, 60%)',  // purple
  'hsl(340, 75%, 55%)',  // pink
  'hsl(185, 70%, 50%)',  // cyan
  'hsl(45, 90%, 55%)',   // yellow
  'hsl(0, 70%, 55%)',    // red
];
```

**State dans TopChromeBar**:
```typescript
const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
const groups = useMemo(() => groupTabsByDomain(regularTabs), [regularTabs]);
```

**Auto-expand**: quand l'onglet actif est dans un groupe, ce groupe a un indicateur visuel (bordure colorée) mais reste collapsed. Clic sur le chip → expand.

**Auto-collapse**: sélectionner un onglet dans un groupe expanded → collapse le groupe. Cliquer ailleurs → collapse aussi.

