

# Plan: GitHub Auth uniquement (pas Google)

## Problème
- Build error: `@lovable.dev/cloud-auth-js` introuvable
- Le code actuel utilise Google OAuth via `lovable.auth.signInWithOAuth` — ce n'est pas ce que tu veux
- Tu veux uniquement l'auth GitHub pour l'instant

## Approche
GitHub OAuth n'est pas disponible comme provider social sur cette plateforme. L'authentification GitHub se fait via **Personal Access Token (PAT)** — c'est la méthode standard utilisée par VS Code, JetBrains, etc.

### Changements

**`src/hooks/useAuth.ts`**
- Supprimer l'import de `lovable` et `signInWithGoogle`
- Le hook gère uniquement : profil local (localStorage), GitHub credentials (token + username)
- Pas de Supabase auth pour l'instant — on stocke le PAT en localStorage comme avant, avec option de persister dans le profil Supabase plus tard

**`src/components/browser/NavigationBar.tsx`**
- Le bouton Profile : quand non connecté à GitHub → popover avec message "Connect GitHub" et lien vers le panel GitHub
- Quand connecté (PAT sauvegardé) → affiche le username GitHub, bouton disconnect

**`src/components/browser/GitHubReposPanel.tsx`**
- Garder tel quel : PAT en priorité visible (pas collapsed), c'est la seule méthode d'auth
- Retirer les références à Google sign-in

**`src/components/browser/BrowserShell.tsx`**
- Adapter les props passés à NavigationBar (retirer onSignIn Google)

## Fichiers à modifier
- `src/hooks/useAuth.ts` — simplifier, retirer lovable/Google
- `src/components/browser/NavigationBar.tsx` — popover GitHub au lieu de Google
- `src/components/browser/GitHubReposPanel.tsx` — retirer bouton Google, PAT visible
- `src/components/browser/BrowserShell.tsx` — adapter props auth

