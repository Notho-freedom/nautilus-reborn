

# Plan: Authentification Google OAuth + GitHub PAT amélioré

## Approche

Google OAuth via Lovable Cloud comme méthode principale d'authentification (bouton Profile). Pour GitHub, on garde le PAT comme option avancée (collapsed), avec le bouton Google OAuth en priorité dans le panel GitHub.

**Note technique** : GitHub OAuth n'est pas disponible sur Lovable Cloud. Seuls Google et Apple sont supportés. Le PAT reste la méthode standard pour accéder aux repos GitHub (c'est ce que VS Code et JetBrains utilisent).

---

## 1. Base de données : table `profiles`

Migration SQL :
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  github_token TEXT,
  github_username TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 2. Hook d'authentification : `src/hooks/useAuth.ts` (nouveau)

- Écoute `onAuthStateChange` + `getSession()` au montage
- Expose : `user`, `profile`, `isAuthenticated`, `isLoading`, `signInWithGoogle`, `signOut`
- `signInWithGoogle` utilise `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`
- Charge le profil depuis `profiles` quand l'utilisateur est connecté
- Sauvegarde/récupère le GitHub token depuis le profil

## 3. Bouton Profile dans NavigationBar

**`src/components/browser/NavigationBar.tsx`**
- Ajouter props : `user`, `onProfileClick`
- Si non connecté : icône User standard, clic → ouvre un Popover avec bouton "Sign in with Google"
- Si connecté : affiche l'avatar de l'utilisateur (petit cercle), clic → Popover avec nom, email, bouton "Sign out"

**`src/components/browser/BrowserShell.tsx`**
- Intégrer `useAuth` hook
- Passer `user` et `onProfileClick` à `NavigationBar`

## 4. GitHub Panel : Google Auth en priorité, PAT collapsed

**`src/components/browser/GitHubReposPanel.tsx`**
- Quand non connecté (pas de Supabase user) :
  - Grande icône GitHub centrée
  - Bouton "Sign in with Google" (primaire, gradient)
  - Section collapsible "Advanced: Personal Access Token" avec les champs username/token actuels
- Quand connecté via Google mais pas de GitHub token :
  - Message "Connect your GitHub" avec champs PAT
  - Le token est sauvegardé dans le profil Supabase
- Quand connecté avec token GitHub :
  - Liste des repos comme actuellement

## 5. Configure Social Auth

Utiliser l'outil Configure Social Login pour générer le module `src/integrations/lovable/` avec le support Google OAuth.

---

## Fichiers à créer
- `src/hooks/useAuth.ts`

## Fichiers à modifier
- `src/components/browser/NavigationBar.tsx` (props user/profile, Popover auth)
- `src/components/browser/BrowserShell.tsx` (intégrer useAuth, passer props)
- `src/components/browser/GitHubReposPanel.tsx` (Google auth prioritaire, PAT collapsed)
- `src/lib/githubRepos.ts` (optionnel: supporter token depuis profil Supabase)

## Outils à utiliser
- Configure Social Login (Google)
- Database migration (profiles table)

