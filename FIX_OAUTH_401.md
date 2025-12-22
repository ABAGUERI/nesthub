# 🔧 FIX ERREUR 401 - Google OAuth

## ❌ PROBLÈME

```
GET https://www.googleapis.com/oauth2/v2/userinfo 401 (Unauthorized)
Error: Failed to get user info
```

## ✅ CAUSE

Les **scopes OAuth manquants**. L'app demande l'autorisation pour Calendar et Tasks, mais pas pour lire l'email de l'utilisateur.

---

## 🛠️ SOLUTION (3 étapes)

### **ÉTAPE 1: Mettre à jour le code (DÉJÀ FAIT)**

Le fichier `src/features/google/google.service.ts` a été corrigé avec les bons scopes:

```typescript
// AVANT (❌ manque email)
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/tasks',
].join(' ');

// APRÈS (✅ avec email)
const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/tasks',
].join(' ');
```

---

### **ÉTAPE 2: Vérifier Google Cloud Console**

**1. Va sur:** https://console.cloud.google.com/apis/credentials/consent

**2. Scroll jusqu'à "Scopes"**

**3. Vérifier que ces scopes sont présents:**

```
✅ openid
✅ email
✅ https://www.googleapis.com/auth/calendar.readonly
✅ https://www.googleapis.com/auth/tasks
```

**Si ils ne sont PAS là:**

1. Clique **"EDIT APP"** en haut
2. Clique **"SAVE AND CONTINUE"** sur App information
3. **Sur la page "Scopes":**
   - Clique **"ADD OR REMOVE SCOPES"**
   - Coche:
     - ✅ `.../auth/userinfo.email`
     - ✅ `openid`
     - ✅ `.../auth/calendar.readonly`
     - ✅ `.../auth/tasks`
   - Clique **"UPDATE"**
   - Clique **"SAVE AND CONTINUE"**
4. Sur "Test users" → **"SAVE AND CONTINUE"**
5. Sur "Summary" → **"BACK TO DASHBOARD"**

---

### **ÉTAPE 3: Révoquer et réautoriser**

Parce que tu as déjà autorisé l'app avec les anciens scopes, il faut révoquer et réautoriser:

**1. Révoquer l'accès actuel:**
```
https://myaccount.google.com/permissions
→ Cherche "Hub planificateur" ou "Hub Familial"
→ Clique dessus
→ "Supprimer l'accès"
```

**2. Vider le cache navigateur:**
```
Ctrl+Shift+Delete
→ Cookies et données de site
→ Dernière heure
→ Effacer
```

**3. Redémarrer l'app:**
```bash
# Arrêter (Ctrl+C)
npm run dev
```

**4. Réessayer l'OAuth:**
```
http://localhost:3000/onboarding
→ Étape 2: Google
→ Connecter Google
→ Autoriser (avec les NOUVEAUX scopes)
```

---

## ✅ VÉRIFIER QUE ÇA MARCHE

### **Pendant l'autorisation, tu devrais voir:**

```
┌──────────────────────────────────────┐
│ Hub planificateur souhaite:          │
├──────────────────────────────────────┤
│ ✅ Connaître votre adresse e-mail   │  ← NOUVEAU!
│ ✅ Afficher vos calendriers          │
│ ✅ Gérer vos tâches                  │
│                                      │
│        [Annuler]    [Autoriser]      │
└──────────────────────────────────────┘
```

Si tu vois **"Connaître votre adresse e-mail"**, c'est bon! ✅

---

## 🐛 SI ÇA NE MARCHE TOUJOURS PAS

### **Vérifier les scopes dans l'URL OAuth**

Quand tu cliques "Connecter Google", regarde l'URL dans la barre d'adresse:

```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=...
  &scope=openid%20email%20https://www...calendar.readonly%20https://www...tasks
  ...
```

Le paramètre `scope` doit contenir: `openid`, `email`, `calendar.readonly`, `tasks`

**Si ce n'est PAS le cas:**
- Le fichier `google.service.ts` n'a pas été mis à jour
- Télécharge la dernière version depuis l'archive

---

### **Vérifier que le fichier a été mis à jour**

```bash
# Dans le dossier nesthub
cat src/features/google/google.service.ts | grep -A 5 "const SCOPES"
```

**Tu dois voir:**
```typescript
const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/tasks',
].join(' ');
```

---

### **Problème: Code OAuth déjà utilisé**

Si tu vois cette erreur:
```
Error: invalid_grant
```

**Solution:**
- Retourne sur `/onboarding`
- Clique "Connecter Google" à nouveau
- Réautorise

**Pourquoi?** Chaque code OAuth ne peut être utilisé qu'une seule fois. Si la page se refresh pendant le callback, le code est déjà consommé.

---

## 📋 CHECKLIST COMPLÈTE

Avant de réessayer:

- [ ] Fichier `google.service.ts` mis à jour avec scopes `openid` et `email`
- [ ] Scopes vérifiés dans Google Cloud Console
- [ ] Accès révoqué sur https://myaccount.google.com/permissions
- [ ] Cache navigateur vidé
- [ ] App redémarrée (`npm run dev`)
- [ ] Test en mode Incognito (recommandé)

---

## 🎯 APRÈS LE FIX

**Ce qui va se passer:**

1. ✅ OAuth flow démarre
2. ✅ Google demande autorisation (avec email maintenant)
3. ✅ User autorise
4. ✅ Callback récupère le code
5. ✅ Code échangé contre tokens
6. ✅ Email récupéré avec succès ✓
7. ✅ Tokens sauvegardés dans Supabase
8. ✅ Listes Google Tasks créées automatiquement
9. ✅ Calendriers affichés pour sélection
10. ✅ Onboarding complété!

---

## 💡 POURQUOI CE PROBLÈME?

**Scopes OAuth = Permissions demandées**

Quand on fait:
```typescript
GET https://www.googleapis.com/oauth2/v2/userinfo
```

Google vérifie: "Est-ce que l'app a demandé le scope `email`?"

**Sans le scope:**
```
❌ 401 Unauthorized
```

**Avec le scope:**
```
✅ 200 OK
{
  "email": "lhanout2points0@gmail.com",
  "verified_email": true
}
```

---

**Le fichier est déjà corrigé dans l'archive. Télécharge et teste!** 🚀
