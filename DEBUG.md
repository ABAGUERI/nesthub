# OAuth Google – Diagnostic par logs (1 run)

## Objectif
Identifier la cause exacte des erreurs `invalid_grant` et des boucles `/auth/callback -> /onboarding` en **un seul run** à l’aide de logs corrélés via `requestId` (rid).

## Pré-requis
- Disposer d'un utilisateur testé (uuid)
- Avoir accès aux logs front (console navigateur) et edge (Supabase logs)

---

## Étapes de test (DEV)
1. Ouvrir la console navigateur.
2. Sur l’onboarding, cliquer **Connecter Google**.
3. Observer le log `[GoogleOAuth] init` (rid + redirectUri).
4. Aller au callback `/auth/callback`.
5. Observer les logs `[OAuthCallback:<rid>]` (start, cleanup, success/failed).
6. Dans les logs edge, retrouver `google-oauth-exchange request` avec le même rid.
7. Vérifier la création/maj dans `google_connections` via `supabase/sql/google_oauth_debug.sql`.

## Étapes de test (PROD)
1. Ouvrir une session privée.
2. Rejouer le flow complet (connecter Google, callback).
3. Capturer les logs front (console) et edge (Supabase logs) pour le même rid.

---

## Exemples de logs attendus
### Front
```
[GoogleOAuth] init { rid: "...", redirectUri: "...", origin: "...", timestamp: "..." }
[OAuthCallback:...] exchange start { rid: "...", redirectUri: "...", codeLength: 123, currentUrl: "...", timestamp: "..." }
[OAuthCallback:...] exchange success
[OAuthCallback:...] cleanup { rid: "...", before: "...", after: "/auth/callback" }
```

### Edge
```
google-oauth-exchange request { rid: "...", redirectUri: "...", codeLength: 123, userId: "...", timestamp: "..." }
# En cas d’erreur token
google-oauth-exchange token error { rid: "...", status: 400, error: "invalid_grant", description: "...", redirectUri: "..." }
# En cas de succès upsert
google-oauth-exchange upsert ok { rid: "...", userId: "...", timestamp: "..." }
```

---

## Comment conclure
- **redirect_uri mismatch** : le `redirectUri` côté front et edge ne matchent pas le paramétrage Google → `invalid_grant`.
- **code reuse** : même `code` traité deux fois → `invalid_grant` (vérifier dedupe + logs). 
- **RPC manquante** : `upsert_google_connection` absente ou non exécutable → logs `upsert error` + SQL.
- **session manquante** : 401 côté edge → `Authorization header missing` ou `auth.getUser()` fail.

---

## SQL de vérification
Utiliser `supabase/sql/google_oauth_debug.sql` pour :
- Vérifier existence et droits d’exécution de `upsert_google_connection`.
- Vérifier la création/maj de `google_connections`.
