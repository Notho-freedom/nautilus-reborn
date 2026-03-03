

# Notilus Browser — Interface Web Complète

## Charte graphique
- **Thème** : Dark mode (fond #0a0a0f à #111), accents rose/rouge (#FF1744, #FF3366)
- **Typographie** : Police monospace/tech pour les titres, sans-serif pour le corps
- **Style** : Effets glassmorphism, bordures subtiles, dégradés sombres, lueurs roses

## Architecture de l'interface

### 1. Shell principal du navigateur
Layout global : barre de titre en haut, barre d'onglets, barre d'adresse, zone de contenu centrale, sidebar rétractable à gauche, panneau AI à droite.

### 2. Barre d'onglets
- Onglets multiples avec favicon, titre, bouton fermer
- Bouton "+" pour nouvel onglet
- Drag pour réorganiser (visuel uniquement)
- Onglet actif mis en surbrillance rose

### 3. Barre de navigation
- Boutons retour/avant/recharger/accueil
- Barre d'adresse avec icône de sécurité (cadenas)
- Zone d'affichage URL type `notilus://speed-dial`
- Boutons d'action à droite : extensions, téléchargements, profil

### 4. Sidebar Dev Tools (rétractable)
Icônes verticales avec labels au survol :
- **System Monitor** : Mini widget CPU/RAM/GPU/Battery/Network
- **Terminal** : Zone type terminal intégrée (simulée)
- **VS Code** : Lien rapide / placeholder
- **API Docs** : Accès documentation REST
- **Git** : Status du contrôle de version
- **Lighthouse** : Lancer un audit
- **Settings** : Accéder aux paramètres

### 5. Speed Dial (page d'accueil)
- Grille de sites favoris avec icônes et noms
- Barre de recherche rapide
- Widgets système (heure, météo placeholder)
- Raccourcis personnalisables
- Logo Notilus au centre

### 6. Moniteur système
- Widgets temps réel simulés avec barres de progression animées
- CPU, RAM, GPU température, réseau, batterie, compteur d'onglets
- Affichage dans la sidebar et/ou dans la barre de statut en bas

### 7. Panneau AI Assistant
- Panel coulissant à droite
- Interface de chat avec bulles de messages
- Sélection de modèle IA (Groq models)
- Boutons : résumer la page, analyser le code, poser une question
- Historique de conversation

### 8. Page Lighthouse
- Tableau de bord des scores (Performance, Accessibilité, SEO, Best Practices)
- Jauges circulaires animées avec scores
- Liste de recommandations "Quick Wins"
- Historique des audits

### 9. Page de paramètres
- Thèmes et personnalisation (sombre/clair, wallpapers)
- Vie privée (bloqueur de pubs toggle, protection trackers)
- AI Assistant config (choix du modèle, clé API)
- Général (page d'accueil, moteur de recherche)
- À propos

### 10. Zone de contenu principal
- iframe pour charger de vraies URLs
- Fallback sur le Speed Dial quand pas d'URL

### 11. Barre de statut (bas)
- Indicateurs système miniatures (CPU %, RAM %)
- Statut réseau
- Compteur d'onglets
- Zoom

## Pages / Routes
- `/` → Shell du navigateur avec Speed Dial par défaut
- Navigation interne via state React (onglets, panels), pas de routes multiples

## Fonctionnalités clés
- Gestion d'état des onglets (ouvrir, fermer, changer)
- Sidebar rétractable avec animation
- Panel AI rétractable
- Thème sombre natif avec accents roses
- Animations fluides (transitions, hover effects)
- Responsive pour les grandes résolutions (1280px+)
- Données simulées pour moniteur système (valeurs animées)

