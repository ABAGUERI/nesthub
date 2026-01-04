# ✅ CHECKLIST D'INSTALLATION - Écran Cuisine

## 🎯 Objectif
Intégrer le code complet de l'écran Cuisine dans ton projet NestHub existant.

---

## 📦 Étape 1 : Migration Supabase (5 min)

### Action
Exécute la migration SQL pour créer la table `weekly_menu`.

### Commandes

**Option A : Via Supabase CLI (recommandé)**
```bash
cd supabase/migrations
# Copie le fichier SQL
cp /chemin/vers/20251229_weekly_menu_storage.sql .
# Applique la migration
supabase db push
```

**Option B : Via Dashboard Supabase**
1. Va sur https://supabase.com/dashboard
2. Ouvre ton projet
3. SQL Editor → New Query
4. Colle le contenu de `migrations/20251229_weekly_menu_storage.sql`
5. Click "Run"

### Validation
```sql
-- Vérifie que la table existe
SELECT * FROM weekly_menu LIMIT 1;

-- Vérifie RLS
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename = 'weekly_menu';
```

✅ **Checkpoint** : Table `weekly_menu` créée avec RLS activé

---

## 📁 Étape 2 : Copier les fichiers (10 min)

### 2.1 Types TypeScript

```bash
cp src/shared/types/kitchen.types.ts <ton-projet>/src/shared/types/
```

### 2.2 Services

```bash
mkdir -p <ton-projet>/src/features/kitchen/services
cp src/features/kitchen/services/menu.service.ts <ton-projet>/src/features/kitchen/services/
cp src/features/kitchen/services/rotation.service.ts <ton-projet>/src/features/kitchen/services/
```

### 2.3 Composants Kitchen

```bash
mkdir -p <ton-projet>/src/features/kitchen/components
cp src/features/kitchen/components/MenuPanel.tsx <ton-projet>/src/features/kitchen/components/
cp src/features/kitchen/components/GroceryPanel.tsx <ton-projet>/src/features/kitchen/components/
cp src/features/kitchen/components/RotationPanel.tsx <ton-projet>/src/features/kitchen/components/

cp src/features/kitchen/KitchenPage.tsx <ton-projet>/src/features/kitchen/
cp src/features/kitchen/KitchenPage.css <ton-projet>/src/features/kitchen/
```

### 2.4 FamilyTab Config

```bash
cp src/features/config/components/tabs/FamilyTab.tsx <ton-projet>/src/features/config/components/tabs/
cp src/features/config/components/tabs/FamilyTab.css <ton-projet>/src/features/config/components/tabs/
```

✅ **Checkpoint** : Tous les fichiers copiés, pas d'erreur TypeScript

---

## 🔧 Étape 3 : Mettre à jour les imports (5 min)

### 3.1 ConfigPage.tsx

Remplace l'import de `ChildrenTab` par `FamilyTab` :

```typescript
// ❌ ANCIEN
import { ChildrenTab } from './components/tabs/ChildrenTab';

// ✅ NOUVEAU
import { FamilyTab } from './components/tabs/FamilyTab';
import './components/tabs/FamilyTab.css';
```

Dans le render, remplace :
```typescript
// ❌ ANCIEN
<ChildrenTab />

// ✅ NOUVEAU
<FamilyTab />
```

### 3.2 App.tsx

Vérifie que la route `/kitchen` existe :

```typescript
import { KitchenPage } from '@/features/kitchen/KitchenPage';

// Dans <Routes>
<Route
  path="/kitchen"
  element={
    <ProtectedRoute>
      <KitchenPage />
    </ProtectedRoute>
  }
/>
```

✅ **Checkpoint** : Pas d'erreurs d'imports TypeScript

---

## 🧪 Étape 4 : Tests fonctionnels (10 min)

### 4.1 Test Navigation

1. Lance le dev server : `npm run dev`
2. Connecte-toi à l'app
3. Navigue vers `/kitchen`
4. **Attendu** : Page Cuisine s'affiche sans erreur

### 4.2 Test Menu

1. Clique sur un jour de la semaine
2. Ajoute 2-3 repas
3. Enregistre
4. Rafraîchis la page
5. **Attendu** : Les repas sont toujours là (persistance Supabase)

### 4.3 Test Épicerie

1. Dans la section Épicerie, ajoute "Lait"
2. Coche l'item
3. **Attendu** : Sync avec Google Tasks visible

### 4.4 Test Rotation

1. Va dans Paramètres → Famille
2. Ajoute 2 membres (ex: Papa, Maman)
3. Configure rotation : Cuisine → Papa, Vaisselle → Maman
4. Sauvegarde
5. Retourne à `/kitchen`
6. **Attendu** : Rotation affichée correctement

### 4.5 Test Tactile (Nest Hub)

1. Ouvre sur Nest Hub ou Chrome Device Mode (1024×600)
2. Essaie de scroller dans chaque carte
3. **Attendu** : Scroll fluide au doigt, pas de scroll global

✅ **Checkpoint** : Tous les tests passent

---

## 🔍 Étape 5 : Vérifications RLS (5 min)

### Test isolation multi-tenant

**Setup** :
1. Crée un deuxième compte utilisateur
2. Ajoute un menu sur compte 1
3. Connecte-toi avec compte 2

**Validation** :
```sql
-- Via Supabase SQL Editor (connecté comme user 2)
SELECT * FROM weekly_menu;
```

**Attendu** : Seul le menu de user 2 visible (ou vide si nouveau)

✅ **Checkpoint** : RLS fonctionne, isolation complète

---

## 🎨 Étape 6 : Ajustements visuels (optionnel, 10 min)

### Hauteurs Nest Hub

Si les cartes ne s'affichent pas idéalement sur ton Nest Hub :

```css
/* KitchenPage.css ligne 48 */
.kitchen-grid {
  grid-template-rows: minmax(220px, 0.6fr) minmax(0, 1fr);
  /* Ajuste ces valeurs selon ton écran */
}
```

### Rôles par défaut

Personnalise les rôles de rotation :

```typescript
/* FamilyTab.tsx ligne 30 */
const DEFAULT_ROLES = [
  'Cuisine',
  'Vaisselle',
  'Poubelles',
  // Ajoute tes rôles ici
];
```

✅ **Checkpoint** : UI ajustée à tes besoins

---

## 🚀 Étape 7 : Déploiement (5 min)

### Build production

```bash
npm run build
```

**Attendu** : Build sans erreurs, taille bundle < 500KB

### Deploy Netlify

```bash
netlify deploy --prod
```

**Validation** :
1. Ouvre le site en production
2. Teste les fonctionnalités critiques :
   - Menu : ajout/sauvegarde
   - Épicerie : sync Google
   - Rotation : affichage

✅ **Checkpoint** : App déployée et fonctionnelle en prod

---

## 📊 Résumé temps total

| Étape | Temps estimé |
|-------|--------------|
| 1. Migration Supabase | 5 min |
| 2. Copier fichiers | 10 min |
| 3. Imports | 5 min |
| 4. Tests | 10 min |
| 5. RLS | 5 min |
| 6. Ajustements | 10 min |
| 7. Déploiement | 5 min |
| **TOTAL** | **50 min** |

---

## 🐛 Dépannage rapide

### Erreur : "Table does not exist"
→ Exécute la migration SQL (Étape 1)

### Erreur : Import not found
→ Vérifie les chemins d'imports (Étape 3)

### Menu ne se sauvegarde pas
→ Vérifie console : erreur RLS ? User connecté ?

### Rotation vide
→ Configure d'abord dans Paramètres → Famille

### Scroll ne fonctionne pas
→ Teste sur appareil réel (pas émulateur)

---

## 🎉 Félicitations !

Si tu arrives ici avec tous les ✅, ton écran Cuisine est **100% fonctionnel** ! 🚀

**Prochaines étapes** :
- Tester avec ta vraie famille sur Nest Hub
- Ajuster les rôles selon vos besoins
- Configurer la rotation automatique hebdomadaire

**Support** : Consulte `README.md` pour documentation complète.
