# 🏠 Hub Familial 2.0 - SaaS Multi-tenant

## 📋 Description

Hub Familial 2.0 est une plateforme SaaS multi-tenant qui transforme des tablettes en centres de contrôle familiaux personnalisables. Chaque client peut configurer son hub selon ses besoins spécifiques via une interface web intuitive.

## ✨ Fonctionnalités

### Modules configurables par client:
- ✅ **Calendrier & Tâches** (Google Calendar/Tasks)
- ✅ **Météo** (localisée selon la ville du client)
- ✅ **Galerie Photos** (Google Drive slideshow)
- ⚙️ **Récompenses Enfants** (système de points/niveaux)
- ⚙️ **Temps d'écran** (gestion par enfant)
- ⚙️ **Ticker Boursier** (symboles personnalisables)
- ⚙️ **Véhicule Connecté** (Tesla, BYD, générique)

### Système de récompenses multiniveaux:
- Points, argent, ou hybride
- 4 niveaux par défaut (Novice, Apprenti, Expert, Champion)
- Badges automatiques (Bronze, Argent, Or, Diamant)
- Tâches configurables par client
- Conversion automatique points → $

## 🏗️ Architecture

### Stack Technique
```
Frontend:  React 18 + TypeScript + Vite
Backend:   Supabase (Auth + Database + Storage)
Routing:   React Router v6
Styling:   CSS Modules (modulaire)
Deploy:    Netlify
```

### Structure du Projet
```
nesthub/
├── src/
│   ├── features/              # Fonctionnalités par domaine
│   │   ├── auth/              # Authentification
│   │   │   ├── components/    # SignupForm, LoginForm
│   │   │   └── hooks/         # useAuth (✅ implémenté)
│   │   ├── onboarding/        # Wizard 7 étapes (À IMPLÉMENTER)
│   │   ├── dashboard/         # Hub principal (À IMPLÉMENTER)
│   │   ├── config/            # Page configuration (À IMPLÉMENTER)
│   │   └── google/            # OAuth Google (À IMPLÉMENTER)
│   │
│   ├── shared/
│   │   ├── components/        # Composants réutilisables
│   │   │   ├── Button.tsx     # ✅ Complet
│   │   │   ├── Input.tsx      # ✅ Complet
│   │   │   └── Card.tsx       # ✅ Complet
│   │   ├── hooks/
│   │   │   ├── useAuth.tsx         # ✅ Complet
│   │   │   └── useClientConfig.tsx # ✅ Complet
│   │   ├── types/
│   │   │   └── index.ts       # ✅ Types globaux
│   │   └── utils/
│   │       └── supabase.ts    # ✅ Client Supabase
│   │
│   ├── styles/
│   │   └── global.css         # ✅ Styles globaux
│   │
│   ├── App.tsx                # ✅ Routes principales
│   └── main.tsx               # ✅ Point d'entrée
│
├── supabase/
│   └── migrations/
│       └── 20251217_initial_schema.sql  # ✅ Schema complet
│
├── public/                    # Fichiers statiques
├── index.html                 # ✅ HTML de base
├── package.json               # ✅ Dépendances
├── tsconfig.json              # ✅ Config TypeScript
├── vite.config.ts             # ✅ Config Vite
└── .env.example               # ✅ Variables d'environnement
```

## 🚀 Installation

### 1. Prérequis
- Node.js 18+
- Compte Supabase
- Compte Google Cloud (pour OAuth)

### 2. Cloner le projet
```bash
cd /home/claude
git init nesthub
cd nesthub
# Copier tous les fichiers générés
```

### 3. Installer les dépendances
```bash
npm install
```

### 4. Configurer Supabase

#### A. Créer le projet Supabase
1. Aller sur https://supabase.com
2. Créer un nouveau projet
3. Récupérer `URL` et `anon key` dans Settings → API

#### B. Exécuter les migrations
1. Aller dans SQL Editor dans Supabase
2. Copier tout le contenu de `supabase/migrations/20251217_initial_schema.sql`
3. Exécuter le script

#### C. Configurer l'authentification email
1. Settings → Authentication
2. Email Templates → Customize templates si nécessaire
3. Activer "Enable email confirmations"

### 5. Configurer Google OAuth

#### A. Google Cloud Console
1. Aller sur https://console.cloud.google.com
2. Créer un nouveau projet (ou utiliser un existant)
3. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
4. Type: Web application
5. Authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (dev)
   - `https://nesthub.netlify.app/auth/callback` (prod)
6. Récupérer `Client ID` et `Client Secret`

#### B. Activer les APIs nécessaires
Dans Google Cloud Console → APIs & Services → Library, activer:
- Google Calendar API
- Google Tasks API
- Google Drive API (pour photos)

### 6. Variables d'environnement
```bash
cp .env.example .env
```

Éditer `.env` avec tes vraies valeurs:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GOOGLE_CLIENT_ID=123456789-xxxxx.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxx
VITE_GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
VITE_OPENWEATHER_API_KEY=xxxxxxxxxx
```

### 7. Démarrer l'app
```bash
npm run dev
```

L'app sera disponible sur http://localhost:3000

## 📊 Base de Données

### Tables principales

#### `profiles`
Extension du système auth de Supabase. Contient les infos du client.

#### `client_config`
Configuration personnalisée par client (modules activés, paramètres).

#### `children`
Enfants du client (prénom, icône bee/ladybug).

#### `child_progress`
Progression de chaque enfant (points, niveau, argent, badges).

#### `reward_levels`
Paliers de niveaux configurables par client.

#### `available_tasks`
Tâches disponibles configurables par client.

#### `completed_tasks`
Historique des tâches complétées.

#### `screen_time_config`
Configuration temps d'écran par enfant.

#### `screen_time_sessions`
Historique des sessions de temps d'écran.

#### `google_connections`
Tokens OAuth et connexion Google par utilisateur.

#### `task_lists`
Listes de tâches Google personnalisées.

### Row Level Security (RLS)
Toutes les tables ont RLS activé. Chaque user voit uniquement ses propres données.

## 🎯 Flux Utilisateur

### 1. Inscription (`/signup`)
✅ **IMPLÉMENTÉ**
- Formulaire: nom, prénom, email, ville, code postal, mot de passe
- Création du profil dans Supabase
- Envoi email de vérification
- Redirection vers `/verify-email`

### 2. Vérification Email (`/verify-email`)
⚠️ **PARTIELLEMENT IMPLÉMENTÉ**
- Page basique créée
- À ajouter: logique de vérification et redirection vers onboarding

### 3. Connexion (`/login`)
✅ **IMPLÉMENTÉ**
- Formulaire email + password
- Redirection vers `/dashboard` si déjà onboarding complété
- Sinon redirection vers `/onboarding`

### 4. Onboarding (`/onboarding/*`)
❌ **À IMPLÉMENTER**

**Étapes:**
1. **Famille** - "Avez-vous des enfants?" → Si oui, saisir prénoms (max 2)
2. **Google** - Connexion OAuth Google
3. **Calendrier** - Choisir calendrier principal parmi ceux disponibles
4. **Tâches** - Nommer liste d'épicerie + créer 2 listes custom
5. **Modules** - Activer les modules souhaités
6. **Complet** - Marquer onboarding comme terminé → Redirection `/dashboard`

**Composants à créer:**
```tsx
src/features/onboarding/
├── components/
│   ├── OnboardingLayout.tsx      # Layout avec steps indicator
│   ├── StepIndicator.tsx         # Barre de progression 1/6, 2/6...
│   ├── FamilyStep.tsx            # Étape famille
│   ├── GoogleAuthStep.tsx        # Connexion Google OAuth
│   ├── CalendarStep.tsx          # Choix calendrier
│   ├── TasksStep.tsx             # Config listes tâches
│   └── ModulesStep.tsx           # Activation modules
└── hooks/
    └── useOnboarding.ts          # State management onboarding
```

### 5. Dashboard (`/dashboard`)
❌ **À IMPLÉMENTER**

Le dashboard s'adapte selon la config du client (modules activés).

**Composants à créer:**
```tsx
src/features/dashboard/
├── components/
│   ├── Dashboard.tsx             # Container principal
│   └── DashboardLayout.tsx       # Grid adaptatif
└── widgets/
    ├── WeatherWidget.tsx         # Météo
    ├── CalendarWidget.tsx        # Agenda Google
    ├── TasksWidget.tsx           # Tâches Google
    ├── ChildWidget.tsx           # Widget enfant avec progrès
    ├── StockTickerWidget.tsx     # Ticker boursier
    ├── VehicleWidget.tsx         # Contrôle véhicule
    └── PhotoGalleryWidget.tsx    # Slideshow photos
```

**Logic d'adaptation:**
```tsx
// Dans Dashboard.tsx
const { config } = useClientConfig();

return (
  <DashboardLayout columns={getActiveModulesCount(config)}>
    {config.moduleWeather && <WeatherWidget />}
    {config.moduleCalendar && <CalendarWidget />}
    {config.moduleTasks && <TasksWidget />}
    {config.moduleChildrenRewards && <ChildrenWidgets />}
    {config.moduleStocks && <StockTickerWidget />}
    {config.moduleVehicle && <VehicleWidget />}
    {config.modulePhotos && <PhotoGalleryWidget />}
  </DashboardLayout>
);
```

### 6. Configuration (`/config`)
❌ **À IMPLÉMENTER**

Page de configuration avec 7 tabs:
1. **Modules** - Activer/désactiver modules
2. **Récompenses** - Config système points/niveaux
3. **Temps d'écran** - Config par enfant
4. **Finance** - Gérer ticker boursier
5. **Google** - Modifier calendrier/tâches
6. **Véhicule** - Config véhicule connecté
7. **Photos** - Config galerie

**Composants à créer:**
```tsx
src/features/config/
├── components/
│   ├── ConfigLayout.tsx          # Layout avec tabs
│   └── TabNavigation.tsx         # Navigation entre tabs
└── tabs/
    ├── ModulesTab.tsx            # Toggle modules on/off
    ├── RewardsTab.tsx            # Config points/niveaux
    ├── ScreenTimeTab.tsx         # Config temps d'écran
    ├── FinanceTab.tsx            # Gérer stocks
    ├── GoogleTab.tsx             # Modifier intégration Google
    ├── VehicleTab.tsx            # Config véhicule
    └── PhotosTab.tsx             # Config galerie
```

## 🔧 Services à Implémenter

### 1. Google OAuth Service
```tsx
// src/features/google/google.service.ts
export const initiateGoogleOAuth = () => {
  // Rediriger vers Google OAuth
}

export const handleOAuthCallback = (code: string) => {
  // Échanger code contre tokens
  // Sauvegarder dans google_connections
}

export const refreshAccessToken = (refreshToken: string) => {
  // Refresh le token expiré
}

export const getCalendars = (accessToken: string) => {
  // Fetch calendriers Google
}

export const getTasks = (accessToken: string, taskListId: string) => {
  // Fetch tâches Google
}

export const createTaskList = (accessToken: string, name: string) => {
  // Créer nouvelle liste de tâches
}
```

### 2. Rewards Service
```tsx
// src/features/dashboard/services/rewards.service.ts
export const completeTask = async (childId: string, taskId: string) => {
  // 1. Récupérer la tâche et les points
  // 2. Ajouter points au child_progress
  // 3. Vérifier passage de niveau
  // 4. Si niveau up:
  //    - Ajouter badge
  //    - Ajouter récompense $
  //    - Déclencher animation
  // 5. Enregistrer dans completed_tasks
}

export const checkLevelUp = (currentPoints: number, levels: RewardLevel[]) => {
  // Vérifier si changement de niveau
}

export const initializeDefaultLevels = async (userId: string) => {
  // Copier les niveaux par défaut pour un nouveau client
}
```

### 3. Screen Time Service
```tsx
// src/features/dashboard/services/screentime.service.ts
export const startScreenTimeSession = async (childId: string) => {
  // Démarrer une session (mode semi-auto)
}

export const endScreenTimeSession = async (sessionId: string) => {
  // Terminer session et calculer vies utilisées
}

export const getTodayUsage = async (childId: string) => {
  // Récupérer usage du jour
}

export const decrementLives = async (childId: string, lives: number) => {
  // Retirer des vies (mode manuel)
}
```

## 🎨 Design System

### Couleurs
```css
Background: #0f172a (dark blue)
Surface: rgba(255, 255, 255, 0.03)
Border: rgba(255, 255, 255, 0.08)
Text Primary: #e2e8f0
Text Secondary: #94a3b8
Accent: #10b981 (green)
Error: #ef4444 (red)
```

### Badges
```
Bronze:  #cd7f32 🥉
Silver:  #c0c0c0 🥈
Gold:    #ffd700 🥇
Diamond: #b9f2ff 💎
```

### Composants déjà créés
- `<Button>` - Variants: primary, secondary, danger, success
- `<Input>` - Avec label, error, icons
- `<Card>` - Avec title, subtitle, icon

## 📱 Déploiement Netlify

### 1. Préparer le build
```bash
npm run build
```

### 2. Configurer Netlify
1. Connecter le repo Git
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Environment variables: Copier depuis `.env`

### 3. Redirections (créer `public/_redirects`)
```
/*    /index.html   200
```

## 🔐 Sécurité

### Row Level Security (RLS)
✅ Activé sur toutes les tables
✅ Policies créées pour isolation par user

### Tokens Google
- Stockés chiffrés dans Supabase
- Refresh automatique avant expiration
- Jamais exposés au client

### Variables d'environnement
❌ NE JAMAIS commit les `.env` dans Git
✅ Utiliser `.env.example` comme template

## ✅ Checklist Implémentation

### Fait ✅
- [x] Structure du projet
- [x] Configuration TypeScript/Vite
- [x] Schema Supabase complet
- [x] Composants UI de base (Button, Input, Card)
- [x] Hook useAuth
- [x] Hook useClientConfig
- [x] SignupForm
- [x] LoginForm
- [x] Routes de base
- [x] RLS et policies

### À Faire ❌
- [ ] Onboarding wizard (7 étapes)
- [ ] Google OAuth flow complet
- [ ] Dashboard adaptatif
- [ ] Tous les widgets (Weather, Calendar, Tasks, etc.)
- [ ] Page Configuration (7 tabs)
- [ ] Rewards service (logique niveaux)
- [ ] Screen Time service
- [ ] Stock Ticker service
- [ ] Vehicle service
- [ ] Photo Gallery service
- [ ] Animations (level up, etc.)
- [ ] Tests

## 💡 Notes de Développement

### Convention de nommage
- Composants: `PascalCase.tsx`
- Hooks: `useCamelCase.tsx`
- Services: `camelCase.service.ts`
- Types: `PascalCase` (interfaces)
- CSS: `kebab-case.css`

### Structure des composants
```tsx
// Imports
import React from 'react';
import './Component.css';

// Types/Interfaces
interface ComponentProps {
  // ...
}

// Composant
export const Component: React.FC<ComponentProps> = ({ props }) => {
  // State
  // Hooks
  // Handlers
  // Render
  return (
    <div className="component">
      {/* JSX */}
    </div>
  );
};
```

### Gestion d'état
- Auth: Context API (`useAuth`)
- Config: Context API (`useClientConfig`)
- Local: `useState` dans composants
- Async: Directement avec Supabase (pas besoin Redux)

## 📞 Support

Pour toute question:
1. Consulter la doc Supabase: https://supabase.com/docs
2. Consulter la doc Google APIs: https://developers.google.com
3. Voir les exemples de code dans les composants créés

## 🚀 Prochaines Étapes

1. **Implémenter l'onboarding** - Priorité #1
2. **Créer le dashboard de base** - Priorité #2
3. **Ajouter Google OAuth** - Priorité #3
4. **Implémenter les widgets un par un**
5. **Créer la page Configuration**
6. **Tests et debugging**
7. **Déploiement production**

---

**Bon développement! 🎉**
