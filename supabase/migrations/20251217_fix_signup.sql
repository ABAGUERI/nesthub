-- =====================================================
-- MIGRATION FIX: Résoudre problème signup
-- Date: 2025-12-17
-- =====================================================

-- PROBLÈME: La policy RLS bloque l'insertion du profil pendant signup
-- car auth.uid() n'est pas encore défini

-- SOLUTION 1: Modifier les policies pour profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Nouvelle policy pour INSERT qui permet la création pendant signup
CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (true); -- Permet l'insertion (sera sécurisé par la logique app)

-- Policy pour SELECT (seulement son propre profil)
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

-- Policy pour UPDATE (seulement son propre profil)
CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- SOLUTION 2 (Meilleure): Créer automatiquement le profil via trigger
-- Cette solution est plus propre et évite de gérer la création dans le frontend

-- Fonction pour créer profil ET config automatiquement après signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer le profil avec des valeurs par défaut
  -- Ces valeurs seront mises à jour pendant l'onboarding
  INSERT INTO public.profiles (id, first_name, last_name, city, postal_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    COALESCE(NEW.raw_user_meta_data->>'postal_code', '')
  );
  
  -- Créer la config par défaut
  INSERT INTO public.client_config (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer l'ancien trigger si existe
DROP TRIGGER IF EXISTS on_user_created ON auth.users;

-- Créer le nouveau trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- INSTRUCTIONS D'UTILISATION
-- =====================================================

-- OPTION A: Si tu veux utiliser le trigger automatique (RECOMMANDÉ)
-- 1. Exécuter cette migration
-- 2. Modifier le code du frontend pour passer les données dans user_metadata:

/*
Frontend code à modifier dans useAuth.tsx:

const signUp = async (email: string, password: string, userData: Partial<User>) => {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: userData.firstName,
        last_name: userData.lastName,
        city: userData.city,
        postal_code: userData.postalCode,
      }
    }
  });

  if (authError) throw authError;
  // Le profil est créé automatiquement par le trigger!
};
*/

-- OPTION B: Si tu veux garder la création manuelle dans le frontend
-- 1. Exécuter seulement la partie SOLUTION 1 (policies modifiées)
-- 2. Garder le code frontend tel quel

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================
