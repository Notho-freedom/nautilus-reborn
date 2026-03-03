

# Plan : Notilus Browser — UI complète avec toutes les fonctionnalités

L'objectif est d'enrichir massivement l'interface actuelle en ajoutant toutes les sections de la sidebar documentées, les panneaux manquants, les DevTools en bas, le système de favoris/historique/téléchargements, les services web intégrés, les raccourcis clavier, et des améliorations visuelles. Le logo existant (le "N" avec gradient rose) sera réutilisé partout.

---

## 1. Sidebar complète avec toutes les sections

**Fichier** : `DevToolsSidebar.tsx` — Ajouter toutes les icônes documentées :
- Accueil, Favoris, Historique, Téléchargements, Widgets, AI, Paramètres, Terminal, DevTools (F12), Mosaïque, Documentation, Studio, Lighthouse, GitHub
- **Séparateur** puis **Services Web** en bas : YouTube Music, YouTube, ChatGPT, DeepSeek, WhatsApp, Telegram (ces liens ouvrent l'URL dans un onglet)

**Fichier** : `SidebarPanel.tsx` — Router vers les nouveaux panneaux

---

## 2. Nouveaux panneaux de sidebar

### `BookmarksPanel.tsx`
- Liste de favoris avec recherche, tags, icônes de sites
- Bouton "Ajouter aux favoris" (Ctrl+D)
- Données mockées

### `HistoryPanel.tsx`
- Liste chronologique des pages visitées (mockées)
- Recherche, filtres par date
- Bouton effacer l'historique

### `DownloadsPanel.tsx`
- Liste de téléchargements simulés avec barres de progression
- États : en cours, terminé, échoué
- Actions : pause, reprendre, annuler, ouvrir dossier

### `WidgetsPanel.tsx`
- Horloge, météo placeholder, citations dev, historique récent, quick actions

### `ExtensionsPanel.tsx`
- Liste d'extensions mockées avec toggle activer/désactiver
- Icônes et descriptions

### `DocumentationPanel.tsx`
- Documentation intégrée de Notilus (raccourcis, fonctionnalités)

### `MosaicPanel.tsx`
- Sélecteur de layouts prédéfinis (colonnes, grille, sidebar, dev, productivité, focus)
- Preview visuel des layouts

---

## 3. DevTools en bas (comme Chrome)

### `DevToolsPanel.tsx` — Panneau en bas du shell
- **6 onglets** : Console, Network, Elements, Performance, Application, Sources
- Redimensionnable (drag de la bordure supérieure)
- Boutons : Clear, Dock position, Close
- Toggle via F12 ou bouton sidebar

### Sous-composants :
- `DevConsole.tsx` : Logs colorés par niveau (log/info/warn/error/debug), filtres, recherche, input JS simulé
- `DevNetwork.tsx` : Tableau de requêtes mockées (method, URL, status, duration, size), filtres par méthode/status
- `DevElements.tsx` : Arbre DOM simulé avec indentation, styles CSS à droite
- `DevPerformance.tsx` : Métriques FCP/LCP/TTI/TBT/CLS avec jauges
- `DevApplication.tsx` : Onglets LocalStorage/SessionStorage/Cookies avec données mockées
- `DevSources.tsx` : Liste des scripts/stylesheets chargés

---

## 4. Paramètres complets

### `SettingsPanel.tsx` — Refonte complète
- **Apparence** : Sélecteur de thème (Dark-Red, Dark-Blue, Cyberpunk, Matrix, Dracula), couleur d'accent, transparence, intensité du flou
- **Page d'accueil** : Style de page d'accueil (8 styles), widgets à afficher, message de bienvenue
- **Onglets** : Restauration au démarrage, comportement nouvel onglet
- **Terminal** : Choix du terminal, taille de police
- **DevTools** : Position (bas/droite), hauteur
- **Confidentialité** : Ad blocker toggle, tracker protection, sauvegarde historique, cookies
- **AI Assistant** : Modèle, configuration
- **Général** : Moteur de recherche, page d'accueil
- **À propos** : Version, crédits avec logo Notilus

---

## 5. Speed Dial amélioré

### `SpeedDial.tsx` — Refonte
- Logo Notilus animé (réutiliser le "N" gradient existant)
- Horloge + date stylisée
- Message de bienvenue personnalisé
- Barre de recherche avec glassmorphism
- Grille de favoris avec favicons réels (via Google Favicon Service)
- Section "Historique récent" (3-4 derniers sites)
- Citation dev inspirante rotative
- Quick actions (nouveau terminal, nouvel onglet privé, ouvrir DevTools)

---

## 6. Navigation améliorée

### `NavigationBar.tsx` — Améliorations
- Indicateur de chargement animé
- Bouton favoris (étoile) dans la barre d'adresse
- Indicateur HTTPS/sécurité amélioré (cadenas vert)
- Compteur ad-blocker (nombre de pubs bloquées)

### `TabBar.tsx` — Améliorations
- Favicon par onglet (via Google Favicon Service URL)
- Indicateur de chargement (spinner)
- Menu contextuel (clic droit) : Dupliquer, Épingler, Fermer les autres
- Onglet privé avec icône cadenas
- Indicateur visuel de couleur pour onglet actif plus prononcé

---

## 7. Raccourcis clavier

### `useKeyboardShortcuts.ts` — Nouveau hook
- `Ctrl+T` : Nouvel onglet
- `Ctrl+W` : Fermer l'onglet
- `Ctrl+Tab` / `Ctrl+Shift+Tab` : Onglet suivant/précédent
- `Ctrl+L` : Focus barre d'adresse
- `Ctrl+D` : Ajouter aux favoris
- `F12` / `Ctrl+Shift+I` : Toggle DevTools
- `Ctrl+Shift+M` : Toggle Mosaïque
- `Ctrl+,` : Paramètres
- `Ctrl+H` : Historique
- `Ctrl+J` : Téléchargements
- `F5` / `Ctrl+R` : Recharger

---

## 8. BrowserShell + State mis à jour

### `useBrowserState.ts` — Enrichir
- Ajouter état DevTools (ouvert/fermé, hauteur, onglet actif)
- Ajouter historique de navigation (mock data)
- Ajouter favoris (mock data)
- Ajouter téléchargements (mock data)
- Ajouter compteur ad-blocker

### `BrowserShell.tsx` — Layout mis à jour
- Intégrer le `DevToolsPanel` en bas (entre content area et status bar)
- Intégrer le hook keyboard shortcuts
- Passer les données nécessaires aux nouveaux panneaux

---

## 9. StatusBar enrichie

- Indicateur sécurité HTTPS
- Compteur pubs bloquées
- Indicateur mode privé
- Bouton zoom +/-

---

## 10. Services Web dans la sidebar

Les services (YouTube, ChatGPT, WhatsApp, etc.) sont des boutons dans la sidebar qui ouvrent simplement l'URL correspondante dans un nouvel onglet via `navigateTo`.

---

## Fichiers à créer (~15 nouveaux)
- `src/components/browser/BookmarksPanel.tsx`
- `src/components/browser/HistoryPanel.tsx`
- `src/components/browser/DownloadsPanel.tsx`
- `src/components/browser/WidgetsPanel.tsx`
- `src/components/browser/ExtensionsPanel.tsx`
- `src/components/browser/DocumentationPanel.tsx`
- `src/components/browser/MosaicPanel.tsx`
- `src/components/browser/DevToolsPanel.tsx`
- `src/components/browser/devtools/DevConsole.tsx`
- `src/components/browser/devtools/DevNetwork.tsx`
- `src/components/browser/devtools/DevElements.tsx`
- `src/components/browser/devtools/DevPerformance.tsx`
- `src/components/browser/devtools/DevApplication.tsx`
- `src/components/browser/devtools/DevSources.tsx`
- `src/hooks/useKeyboardShortcuts.ts`

## Fichiers à modifier (~8)
- `src/components/browser/DevToolsSidebar.tsx`
- `src/components/browser/SidebarPanel.tsx`
- `src/components/browser/BrowserShell.tsx`
- `src/components/browser/SpeedDial.tsx`
- `src/components/browser/NavigationBar.tsx`
- `src/components/browser/TabBar.tsx`
- `src/components/browser/StatusBar.tsx`
- `src/components/browser/SettingsPanel.tsx`
- `src/hooks/useBrowserState.ts`
- `src/index.css` (animations supplémentaires)

