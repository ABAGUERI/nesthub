# Supabase Edge Functions (Google)

## Déploiement

```bash
supabase functions deploy google-calendar-events
supabase functions deploy google-oauth-exchange
supabase functions deploy google-tasks-list
```

## Variables d'environnement requises

Configurez ces variables dans Supabase (Project Settings > Edge Functions > Secrets) :

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## OAuth Google (code → tokens)

La fonction `google-oauth-exchange` effectue l’échange OAuth côté serveur et
enregistre la connexion Google via `upsert_google_connection`.
