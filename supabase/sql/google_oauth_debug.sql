-- Vérifier existence de la fonction upsert_google_connection
SELECT
  p.oid::regprocedure AS function_signature,
  p.proname,
  n.nspname AS schema_name,
  p.proowner::regrole AS owner,
  p.proacl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'upsert_google_connection';

-- Vérifier les droits d'exécution (role courant)
SELECT
  has_function_privilege(current_user, p.oid, 'EXECUTE') AS can_execute,
  p.oid::regprocedure AS function_signature
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'upsert_google_connection';

-- Vérifier la dernière connexion Google pour un user
-- Remplacer :user_id par l'UUID de l'utilisateur
SELECT
  id,
  user_id,
  gmail_address,
  expires_at,
  scope,
  updated_at,
  created_at
FROM public.google_connections
WHERE user_id = :user_id
ORDER BY updated_at DESC
LIMIT 1;
