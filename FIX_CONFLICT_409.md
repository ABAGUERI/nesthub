# 🔧 FIX ERREUR 409 - Duplicate Key Conflict

## ✅ BONNE NOUVELLE

**Google OAuth fonctionne maintenant!** 🎉

L'erreur actuelle est juste un conflit en base de données.

---

## ❌ L'ERREUR

```
409 Conflict
duplicate key value violates unique constraint "google_connections_user_id_key"
```

**Cause:** Il y a déjà une connexion Google pour ton user dans la DB (d'une tentative précédente).

---

## 🛠️ SOLUTION RAPIDE (Choose 1)

### **OPTION 1: Nettoyer la DB (LE PLUS RAPIDE)**

**1. Va dans Supabase:**
```
https://supabase.com/dashboard/project/bqtrfjlbncujkargpvfv/editor
```

**2. SQL Editor → New Query**

**3. Copie-colle:**
```sql
-- Supprimer l'ancienne connexion Google
DELETE FROM google_connections 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email = 'lhanout2points0@gmail.com'
);
```

**Remplace l'email si besoin!**

**4. Run ▶️**

**5. Retourne sur l'app et réessaye:**
```
http://localhost:3000/onboarding
→ Étape 2: Google
→ Connecter Google
```

**Cette fois ça devrait marcher!** ✅

---

### **OPTION 2: Corriger le Code (PERMANENT)**

**Le fichier `google.service.ts` a été corrigé avec un vrai upsert.**

**1. Remplace ton fichier local par la version corrigée:**
```bash
# Télécharge la nouvelle archive
# Ou remplace juste google.service.ts
```

**2. Le code corrigé:**
```typescript
// AVANT (❌ pas de onConflict)
const { error } = await supabase
  .from('google_connections')
  .upsert({
    user_id: userId,
    ...
  });

// APRÈS (✅ avec onConflict)
const { error } = await supabase
  .from('google_connections')
  .upsert(
    {
      user_id: userId,
      ...
    },
    {
      onConflict: 'user_id', // ← FIX
    }
  );
```

**3. Redémarre l'app:**
```bash
npm run dev
```

**4. Réessaye l'OAuth**

---

## ✅ VÉRIFIER QUE ÇA A MARCHÉ

### **Après avoir fait OPTION 1 OU OPTION 2:**

**1. Réessaye l'OAuth:**
```
http://localhost:3000/onboarding
→ Connecter Google
→ Autoriser
```

**2. Tu devrais voir:**
```
✅ Compte Google connecté avec succès!

[Liste de tes calendriers]
☑️ Ahmed (principal)
☑️ Calendrier 1
☑️ Calendrier 2
...

[Terminer ✓]
```

**3. Vérifier dans Supabase:**
```sql
SELECT * FROM google_connections;
```

Tu dois voir UNE ligne avec:
- ✅ `user_id` = ton ID
- ✅ `gmail_address` = ton email
- ✅ `access_token` et `refresh_token` présents
- ✅ `token_expires_at` dans le futur

---

## 🎯 APRÈS LE FIX

**Ce qui va se passer:**

1. ✅ Google connecté (déjà fait!)
2. ✅ Tokens sauvegardés en DB
3. ✅ Création automatique des 4 listes Google Tasks:
   - 📝 Épicerie
   - 🐝 Tâches [Prénom Enfant 1]
   - 🐞 Tâches [Prénom Enfant 2]
   - 👨‍👩‍👧 Familiale
4. ✅ Affichage des calendriers
5. ✅ Sélection des calendriers à afficher
6. ✅ Clic sur "Terminer"
7. ✅ Onboarding complété!
8. ✅ Redirection → `/dashboard`

---

## 💡 POURQUOI CETTE ERREUR?

**La table `google_connections` a une contrainte UNIQUE sur `user_id`:**

```sql
CREATE TABLE google_connections (
  user_id UUID UNIQUE, -- ← Un seul user_id possible
  ...
);
```

**Lors de la première tentative OAuth (qui a échoué), une ligne a été créée.**

**Lors de la deuxième tentative, Supabase a essayé d'insérer une NOUVELLE ligne avec le même `user_id`** → Conflit!

**Le fix `onConflict: 'user_id'` dit:**
- Si `user_id` existe déjà → **UPDATE** la ligne
- Sinon → **INSERT** nouvelle ligne

C'est un vrai **UPSERT** (UPDATE or INSERT)

---

## 📋 COMMANDES SQL UTILES

### **Voir ta connexion Google:**
```sql
SELECT * FROM google_connections 
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'lhanout2points0@gmail.com'
);
```

### **Supprimer ta connexion Google:**
```sql
DELETE FROM google_connections 
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'lhanout2points0@gmail.com'
);
```

### **Voir toutes les connexions:**
```sql
SELECT 
  gc.gmail_address,
  gc.token_expires_at,
  u.email as user_email
FROM google_connections gc
JOIN auth.users u ON u.id = gc.user_id;
```

---

**Fais OPTION 1 (nettoyer DB) maintenant et réessaye!** 🚀

C'est la dernière étape avant que l'onboarding soit 100% fonctionnel!
