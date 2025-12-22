# 📝 TODO - Hub Familial 2.0

## 🔴 PRIORITÉ HAUTE (Essentiel pour MVP)

### 1. Email Verification Page
**Temps estimé: 30 min**

Fichier: `src/features/auth/components/EmailVerification.tsx`

```tsx
// Objectif:
// - Afficher message "Vérifiez votre email"
// - Gérer le callback de vérification (quand user clique sur lien)
// - Rediriger vers /onboarding après vérification
```

### 2. Onboarding Wizard
**Temps estimé: 4-6 heures**

**2.1 Infrastructure de base**
- `src/features/onboarding/components/OnboardingLayout.tsx`
  - Layout avec navigation entre étapes
  - Indicateur de progression (1/6, 2/6, etc.)
  - Boutons Précédent/Suivant

**2.2 Étapes individuelles**
- `FamilyStep.tsx` - "Avez-vous des enfants?" → Ajouter prénoms
- `GoogleAuthStep.tsx` - Bouton "Connecter Google" → OAuth flow
- `CalendarStep.tsx` - Liste des calendriers → Sélectionner 1
- `TasksStep.tsx` - Créer liste épicerie + 2 listes custom
- `ModulesStep.tsx` - Checkboxes pour activer modules
- `CompleteStep.tsx` - Confirmation + redirection dashboard

**2.3 Hook de gestion**
- `src/features/onboarding/hooks/useOnboarding.ts`
  - State pour chaque étape
  - Navigation entre étapes
  - Sauvegarde finale dans DB

### 3. Google OAuth Flow
**Temps estimé: 3-4 heures**

**3.1 Service Google**
Fichier: `src/features/google/google.service.ts`

```typescript
// Fonctions à implémenter:
- initiateGoogleOAuth() → Rediriger vers Google
- handleOAuthCallback(code) → Échanger code contre tokens
- refreshAccessToken(refreshToken) → Refresh avant expiration
- getCalendars(accessToken) → Fetch calendriers
- getTasks(accessToken, listId) → Fetch tâches
- createTaskList(accessToken, name) → Créer liste
```

**3.2 Callback Route**
- `src/features/google/components/OAuthCallback.tsx`
  - Récupérer code depuis URL
  - Échanger contre tokens
  - Sauvegarder dans `google_connections`
  - Rediriger vers onboarding

### 4. Dashboard de Base
**Temps estimé: 2-3 heures**

**4.1 Layout**
- `src/features/dashboard/components/Dashboard.tsx`
  - Récupérer config client
  - Afficher modules activés uniquement
  - Grid adaptatif selon nombre de modules

**4.2 Widgets simples pour commencer**
- `WeatherWidget.tsx` - Afficher météo basique
- `CalendarWidget.tsx` - Afficher événements du jour
- `TasksWidget.tsx` - Afficher tâches Google

---

## 🟡 PRIORITÉ MOYENNE (Important mais pas bloquant)

### 5. Widgets Avancés
**Temps estimé: 6-8 heures**

- `ChildWidget.tsx` - Afficher progrès enfant (points, niveau, badges)
- `StockTickerWidget.tsx` - Ticker boursier avec API Yahoo Finance
- `VehicleWidget.tsx` - Contrôle véhicule (Tesla/BYD/Generic)
- `PhotoGalleryWidget.tsx` - Slideshow photos Google Drive

### 6. Page Configuration
**Temps estimé: 4-5 heures**

**6.1 Layout**
- `src/features/config/components/ConfigLayout.tsx`
  - Navigation par tabs
  - Sauvegarde automatique

**6.2 Tabs individuels**
- `ModulesTab.tsx` - Toggle modules on/off
- `RewardsTab.tsx` - Config système points/niveaux
- `ScreenTimeTab.tsx` - Config temps d'écran par enfant
- `FinanceTab.tsx` - Gérer symboles boursiers
- `GoogleTab.tsx` - Modifier calendrier/tâches
- `VehicleTab.tsx` - Config véhicule connecté
- `PhotosTab.tsx` - Config galerie photos

### 7. Rewards System Logic
**Temps estimé: 3-4 heures**

Fichier: `src/features/dashboard/services/rewards.service.ts`

```typescript
// Fonctions:
- completeTask(childId, taskId) → Ajouter points + vérifier level up
- checkLevelUp(points, levels) → Déterminer nouveau niveau
- initializeDefaultLevels(userId) → Copier presets pour nouveau client
- addPoints(childId, points) → Ajouter points
- addMoney(childId, amount) → Ajouter argent
```

### 8. Screen Time System
**Temps estimé: 2-3 heures**

Fichier: `src/features/dashboard/services/screentime.service.ts`

```typescript
// Mode semi-auto:
- startSession(childId) → Démarrer timer
- endSession(sessionId) → Arrêter + calculer vies
- getTodayUsage(childId) → Usage du jour

// Mode manuel:
- decrementLives(childId, lives) → Retirer vies
- resetDaily() → Reset à minuit
```

---

## 🟢 PRIORITÉ BASSE (Nice to have)

### 9. Animations
**Temps estimé: 2-3 heures**

- Animation level up (célébration + badge)
- Transitions entre pages
- Loading states élégants

### 10. Composants UI Additionnels
**Temps estimé: 2 heures**

- `Modal.tsx` - Modale réutilisable
- `Tabs.tsx` - Navigation par tabs
- `Switch.tsx` - Toggle on/off
- `Select.tsx` - Dropdown
- `Toast.tsx` - Notifications

### 11. Services Externes
**Temps estimé: 4-5 heures**

**11.1 Weather Service**
```typescript
// OpenWeatherMap API
- getCurrentWeather(city)
- getWeatherIcon(condition)
```

**11.2 Stock Service**
```typescript
// Yahoo Finance API
- getStockPrices(symbols[])
- subscribeToUpdates()
```

**11.3 Vehicle Service**
```typescript
// Tesla/BYD APIs
- preheatVehicle()
- getBatteryLevel()
- getTemperature()
```

### 12. Optimisations
**Temps estimé: 2-3 heures**

- Caching des données Google (éviter trop d'appels API)
- Lazy loading des composants
- Optimisation des requêtes Supabase
- Error boundaries

---

## 🔵 FUTUR (Post-MVP)

### Admin Dashboard
- Voir tous les clients
- Statistiques d'usage
- Gestion abonnements

### Multi-langue
- i18n (Français/Anglais)

### Mobile App
- App compagnon pour parents
- Notifications push

### Intégrations Additionnelles
- Ring/Nest doorbell
- Strava fitness
- Alertes municipales

---

## 📊 Statistiques

**Total estimé pour MVP: 20-30 heures**

Répartition:
- Onboarding: 4-6h
- Google OAuth: 3-4h
- Dashboard: 2-3h
- Widgets: 6-8h
- Config Page: 4-5h
- Services: 5-7h

---

## ✅ Checklist Rapide

### Avant de commencer:
- [ ] Supabase configuré
- [ ] Migration SQL exécutée
- [ ] Variables .env remplies
- [ ] `npm install` fait
- [ ] App démarre en local

### MVP Minimum:
- [ ] Signup/Login fonctionnels
- [ ] Onboarding complet
- [ ] Google OAuth working
- [ ] Dashboard avec 3 widgets minimum
- [ ] Config page basique

### MVP Complet:
- [ ] Tous les widgets
- [ ] Système de récompenses
- [ ] Temps d'écran
- [ ] Page config complète
- [ ] Déploiement Netlify

---

**Bon courage! 💪**
