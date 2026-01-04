# 🚀 INSTALLATION COMPLÈTE - NestHub Kitchen v2

## 📦 Contenu du package

Ce .zip contient TOUT le code nécessaire pour l'écran Cuisine moderne avec refresh automatique Google OAuth.

```
nesthub-complete/
├── migrations/
│   └── 20251229_weekly_menu_storage.sql   # Migration Supabase
├── src/
│   ├── features/
│   │   ├── kitchen/
│   │   │   ├── components/
│   │   │   │   ├── MenuPanel.tsx
│   │   │   │   ├── GroceryPanel.tsx
│   │   │   │   └── RotationPanel.tsx
│   │   │   ├── services/
│   │   │   │   ├── menu.service.ts
│   │   │   │   ├── rotation.service.ts
│   │   │   │   └── google.service.ts      # ⭐ AVEC REFRESH AUTO
│   │   │   ├── KitchenPage.tsx
│   │   │   └── KitchenPage.css
│   │   └── config/
│   │       └── components/tabs/
│   │           ├── FamilyTab.tsx
│   │           └── FamilyTab.css
│   └── shared/
│       ├── types/
│       │   └── kitchen.types.ts
│       └── utils/
│           └── emoji.ts
└── INSTALLATION.md                         # Ce fichier
```

---

## ⚡ INSTALLATION RAPIDE (10 minutes)

### 1️⃣ Migration Supabase (2 min)

```bash
# Via Supabase CLI
cd supabase/migrations
cp /chemin/vers/migrations/20251229_weekly_menu_storage.sql .
supabase db push

# OU via Dashboard Supabase
# SQL Editor → Coller le SQL → Run
```

### 2️⃣ Copier les fichiers (5 min)

```bash
# Types
cp src/shared/types/kitchen.types.ts <ton-projet>/src/shared/types/

# Services Kitchen
cp -r src/features/kitchen/services/* <ton-projet>/src/features/kitchen/services/

# Composants Kitchen
cp -r src/features/kitchen/components/* <ton-projet>/src/features/kitchen/components/
cp src/features/kitchen/KitchenPage.tsx <ton-projet>/src/features/kitchen/
cp src/features/kitchen/KitchenPage.css <ton-projet>/src/features/kitchen/

# Config
cp src/features/config/components/tabs/FamilyTab.tsx <ton-projet>/src/features/config/components/tabs/
cp src/features/config/components/tabs/FamilyTab.css <ton-projet>/src/features/config/components/tabs/

# Utils
cp src/shared/utils/emoji.ts <ton-projet>/src/shared/utils/ # Si n'existe pas déjà
```

### 3️⃣ Variables d'environnement (.env)

Assure-toi que tu as :

```env
VITE_GOOGLE_CLIENT_ID=ton-client-id
VITE_GOOGLE_CLIENT_SECRET=ton-client-secret
VITE_SUPABASE_URL=ton-url
VITE_SUPABASE_ANON_KEY=ta-key
```

### 4️⃣ Tester (3 min)

```bash
npm run dev
```

1. Va sur `/kitchen`
2. Teste le menu (ajoute des repas)
3. Teste l'épicerie (devrait fonctionner sans erreur 401 maintenant !)
4. Vérifie la rotation

---

## 🔧 CE QUI A ÉTÉ CORRIGÉ

### ✅ Refresh automatique Google OAuth

Le nouveau `google.service.ts` inclut :

```typescript
const refreshTokenIfNeeded = async (userId: string): Promise<string> => {
  // Vérifie si le token expire dans < 5 minutes
  // Si oui, refresh automatiquement
  // Sauvegarde le nouveau token dans Supabase
  // Retourne le token valide
};
```

**Avantages :**
- ✅ Plus d'erreur 401 "unauthorized"
- ✅ Refresh transparent pour l'utilisateur
- ✅ Tokens toujours valides

### ✅ Design moderne épuré

- Menu en colonne (1 jour à la fois)
- Layout 50/50 moderne
- Typographie agrandie
- Espace blanc généreux

---

## 🐛 TROUBLESHOOTING

### Erreur: "Table weekly_menu does not exist"
→ Exécute la migration SQL (Étape 1)

### Erreur 401 persiste sur épicerie
→ Vérifie que `google.service.ts` a bien été remplacé
→ Reconnecte Google dans Paramètres une fois

### Menu ne change pas de jour
→ Vérifie console browser (F12)
→ Assure-toi que MenuPanel.tsx a été remplacé

### CSS ne charge pas
→ Vérifie que KitchenPage.css existe
→ Vérifie l'import dans KitchenPage.tsx

---

## 📝 NOTES IMPORTANTES

### ConfigPage.tsx
Le fichier `ConfigPage.tsx` dans ton projet doit déjà importer `FamilyTab`.
Si ce n'est pas le cas, mets-le à jour :

```typescript
import { FamilyTab } from './components/tabs/FamilyTab';
import './components/tabs/FamilyTab.css';
```

### google.service.ts localisation
Le nouveau `google.service.ts` est dans `src/features/kitchen/services/`.
Si ton projet l'a ailleurs (ex: `src/shared/services/`), adapte le chemin.

### Imports
Tous les imports utilisent `@/` alias. Assure-toi que ton `tsconfig.json` a :

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## ✅ CHECKLIST POST-INSTALLATION

- [ ] Migration SQL exécutée
- [ ] Tous les fichiers copiés
- [ ] Variables .env configurées
- [ ] `npm run dev` sans erreurs
- [ ] `/kitchen` accessible
- [ ] Menu fonctionne (ajout/modification)
- [ ] Épicerie sync sans erreur 401
- [ ] Rotation s'affiche

---

## 🎉 SUCCÈS !

Si tous les checks ✅ sont cochés, ton NestHub Kitchen v2 est prêt !

**Prochaines étapes :**
1. Teste sur Nest Hub réel
2. Configure la rotation dans Paramètres → Famille
3. Ajoute des menus pour la semaine
4. Profite ! 🚀

---

**Support:** Consulte les fichiers README dans chaque dossier pour plus de détails.
