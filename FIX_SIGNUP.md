# 🔧 FIX ERREUR 500 AU SIGNUP

## ❌ Problème
```
Failed to load resource: the server responded with a status of 500
```

## ✅ Solution (2 options)

---

## OPTION 1: Fix Automatique avec Trigger (RECOMMANDÉ)

### Étape 1: Exécuter la nouvelle migration
1. Aller dans **Supabase** → **SQL Editor**
2. Copier tout le contenu de `supabase/migrations/20251217_fix_signup.sql`
3. Cliquer sur **Run** ▶️

### Étape 2: Tester
1. Rafraîchir l'app (Ctrl+F5)
2. Essayer de créer un compte
3. ✅ Ça devrait fonctionner!

**Comment ça marche:**
- Le trigger `handle_new_user()` crée automatiquement le profil et la config
- Les données sont passées via `user_metadata`
- Plus besoin d'insertion manuelle

---

## OPTION 2: Fix Rapide sans Migration

### Si tu ne veux pas exécuter de migration, fais ça dans Supabase:

1. **SQL Editor** → Nouveau query
2. Copie-colle:

```sql
-- Modifier la policy pour permettre l'insertion pendant signup
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (true);
```

3. **Run** ▶️
4. Tester le signup

**Note:** Cette option est moins propre mais fonctionne immédiatement

---

## 🔍 Vérifier que ça marche

### Après le fix, teste:
```
1. Aller sur http://localhost:3000/signup
2. Remplir le formulaire
3. Cliquer "Créer mon compte"
```

**Si ça marche:**
- ✅ Pas d'erreur 500
- ✅ Message "Vérifiez votre email"
- ✅ Email de confirmation envoyé

### Vérifier dans Supabase:
1. **Table Editor** → `auth.users`
   - ✅ Ton user existe
   
2. **Table Editor** → `profiles`
   - ✅ Ton profil existe avec tes données
   
3. **Table Editor** → `client_config`
   - ✅ Ta config par défaut existe

---

## 🐛 Debugging

### Si ça ne marche toujours pas:

#### 1. Vérifier que la migration initiale a été exécutée
```sql
-- Dans SQL Editor, vérifier que les tables existent:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

Tu dois voir: profiles, children, client_config, etc.

**Si les tables n'existent pas:**
→ Exécuter `supabase/migrations/20251217_initial_schema.sql` d'abord!

#### 2. Vérifier les logs Supabase
1. **Logs** → **Postgres Logs**
2. Chercher l'erreur récente
3. Elle dira exactement ce qui bloque

#### 3. Vérifier la console navigateur
1. F12 → **Console**
2. Chercher le message d'erreur complet
3. Copier l'erreur et me la donner

---

## 📋 Checklist Complète

- [ ] Migration initiale exécutée (`20251217_initial_schema.sql`)
- [ ] Migration fix exécutée (`20251217_fix_signup.sql`)
- [ ] Variables .env configurées
- [ ] App rafraîchie (Ctrl+F5)
- [ ] Testé avec un nouvel email

---

## 🆘 Si rien ne fonctionne

Envoie-moi:
1. Screenshot de l'erreur dans la console (F12)
2. Screenshot des logs Supabase
3. Résultat de cette query dans Supabase:

```sql
SELECT tablename 
FROM pg_catalog.pg_tables 
WHERE schemaname = 'public';
```

---

## ✅ Après le Fix

Une fois que signup fonctionne:
1. ✅ Tu peux créer des comptes
2. ✅ Les profils sont créés automatiquement
3. ✅ La config par défaut est créée
4. ⏭️ Passer à l'implémentation de l'onboarding (TODO.md)

---

**Note:** J'ai déjà modifié le code de `useAuth.tsx` pour utiliser la nouvelle approche avec trigger. Tu n'as qu'à exécuter la migration SQL!
