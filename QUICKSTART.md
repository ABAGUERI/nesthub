# 🚀 Quick Start - Hub Familial 2.0

## Démarrage Rapide (5 minutes)

### 1. Copier le projet
```bash
cd /home/claude/nesthub
npm install
```

### 2. Configurer Supabase (2 min)
1. Créer compte sur https://supabase.com
2. Créer un nouveau projet
3. Aller dans SQL Editor
4. Copier/coller tout `supabase/migrations/20251217_initial_schema.sql`
5. Exécuter ▶️

### 3. Variables d'environnement (1 min)
```bash
cp .env.example .env
```

Éditer `.env`:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Récupérer ces valeurs dans Supabase → Settings → API

### 4. Lancer l'app
```bash
npm run dev
```

Ouvrir http://localhost:3000

### 5. Tester
1. Créer un compte sur `/signup`
2. Se connecter sur `/login`

---

## Configuration Google OAuth (Optionnel - pour plus tard)

### Créer OAuth Credentials
1. https://console.cloud.google.com
2. APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Redirect URI: `http://localhost:3000/auth/callback`

### Activer APIs
- Google Calendar API
- Google Tasks API
- Google Drive API

### Ajouter au .env
```env
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
```

---

## 🎯 Prochaines Étapes

### À Implémenter (par ordre de priorité)

**1. Page Email Verification** (30 min)
- Créer `src/features/auth/components/EmailVerification.tsx`
- Gérer le clic sur lien de vérification
- Rediriger vers onboarding après vérification

**2. Onboarding Wizard** (4-6 heures)
- Créer les 6 étapes du wizard
- Intégrer Google OAuth
- Sauvegarder config dans `client_config`

**3. Dashboard de Base** (2-3 heures)
- Créer layout adaptatif
- Implémenter 2-3 widgets simples pour commencer

**4. Page Configuration** (3-4 heures)
- Créer les 7 tabs
- Formulaires pour modifier la config

---

## 📂 Structure Projet

```
✅ FAIT:
- Auth (signup, login)
- Composants UI de base
- Hooks (useAuth, useClientConfig)
- Schema Supabase complet
- Routes de base

❌ À FAIRE:
- Onboarding
- Dashboard
- Widgets
- Config page
- Google OAuth
- Services (rewards, screen time, etc.)
```

---

## 🆘 Problèmes Courants

### Error: "Missing Supabase env variables"
→ Vérifier que `.env` existe et contient les bonnes valeurs

### Auth ne fonctionne pas
→ Vérifier que la migration SQL a bien été exécutée dans Supabase

### Port 3000 déjà utilisé
```bash
npm run dev -- --port 3001
```

---

## 📖 Documentation Complète

Voir `README.md` pour la documentation complète et détaillée.

---

**Bon développement! 🎉**
