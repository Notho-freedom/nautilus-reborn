

# Plan: Vue Repo intégrée dans le panel GitHub

## Objectif
Quand l'utilisateur clique sur un repo dans le panel GitHub, au lieu d'ouvrir github.com, on affiche une **vue repo in-app** qui liste le contenu du dépôt (dossiers/fichiers). On peut ensuite naviguer dans les dossiers, voir les fichiers, et avoir des actions contextuelles.

## Architecture

```text
GitHubReposPanel
  ├── Vue "repos list" (existante)
  └── Vue "repo detail" (nouvelle)
       ├── Breadcrumb navigation (owner/repo > src > components)
       ├── File/folder tree list
       │    ├── Dossier → clic = naviguer dedans
       │    └── Fichier → clic = ouvrir viewer avec actions
       └── Actions sur fichier:
            ├── Voir le contenu (code viewer inline)
            ├── Ouvrir dans un onglet (éditeur style VS Code)
            ├── Ouvrir sur GitHub (lien externe)
            └── Télécharger le fichier
```

## Fichiers à créer / modifier

### 1. `src/lib/githubRepos.ts` — Nouvelles fonctions API
- `fetchRepoContents(owner, repo, path, token)` → appelle `GET /repos/{owner}/{repo}/contents/{path}`
- `fetchFileContent(owner, repo, path, token)` → récupère le contenu raw d'un fichier
- Types: `GitHubContentItem` (name, path, type: 'file'|'dir', size, download_url, sha)

### 2. `src/components/browser/GitHubRepoView.tsx` — Nouveau composant
- Vue détaillée d'un repo sélectionné
- Header: nom du repo, description, stats (stars/forks/language), bouton "Open on GitHub"
- Breadcrumb: navigation dans l'arborescence (root > src > components > ...)
- Liste: icones dossier/fichier, nom, taille, dernier commit message
- Clic dossier → push dans le path, re-fetch contents
- Clic fichier → ouvre le file viewer

### 3. `src/components/browser/GitHubFileViewer.tsx` — Nouveau composant
- Affiche le contenu d'un fichier avec syntax highlighting basique (via `<pre><code>`)
- Barre d'actions en haut:
  - "Open in Tab" → ouvre un nouvel onglet du navigateur avec le contenu (éditeur Monaco-like ou simple viewer)
  - "Open on GitHub" → lien externe
  - "Download" → télécharge via download_url
  - "Copy raw" → copie le contenu brut
- Retour au listing via breadcrumb

### 4. `src/components/browser/GitHubReposPanel.tsx` — Modifier
- Ajouter un state `selectedRepo: GitHubRepo | null` et `currentPath: string[]`
- Quand `selectedRepo` est set → afficher `GitHubRepoView` au lieu de la liste
- Bouton retour pour revenir à la liste des repos
- L'option "Open on GitHub" reste accessible via le menu contextuel / bouton secondaire

### 5. `src/components/browser/BrowserShell.tsx` — Modifier
- Passer `onCreateTab` au panel GitHub pour permettre l'ouverture de fichiers dans un nouvel onglet

## Détail technique

### API GitHub Contents
```
GET /repos/{owner}/{repo}/contents/{path}
→ Array<{ name, path, type, size, download_url, sha, html_url }>
```

### Navigation interne
- State machine dans GitHubReposPanel: `list` → `repo` → `file`
- Breadcrumb cliquable pour remonter dans l'arborescence
- Le token PAT est passé pour accéder aux repos privés

### Ouverture en onglet
- Crée un nouvel onglet avec URL `notilus://github-file?repo={fullName}&path={filePath}`
- ContentArea reconnaît ce schéma et affiche le GitHubFileViewer en plein écran
- Alternative simple: ouvrir le raw URL dans un onglet iframe

### Design
- Suit le design system existant (notilus-surface-1, font-body, text-[10px]/text-xs)
- Icones lucide: `Folder`, `File`, `FileCode`, `Download`, `ExternalLink`, `Copy`, `ChevronRight`

