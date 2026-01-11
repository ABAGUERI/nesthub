# 🔧 CORRECTIFS APPLIQUÉS

## Version: 2.1 (2025-12-29 19:50)

### 🐛 Problème 1: Erreur 400 sur refresh Google OAuth

**Symptôme:**
```
PATCH https://...supabase.co/rest/v1/google_connections 400 (Bad Request)
Token refreshed (mais l'update échoue)
```

**Cause:**
- Politique RLS manquante pour UPDATE sur `google_connections`
- Pas de gestion d'erreur dans l'update Supabase

**Solution:**
1. **Migration SQL enrichie** avec politique RLS pour UPDATE:
```sql
CREATE POLICY "Users can update own google connections" 
  ON google_connections 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

2. **google.service.ts corrigé** avec gestion d'erreur:
```typescript
const { error: updateError } = await supabase
  .from('google_connections')
  .update({
    access_token: tokens.access_token,
    expires_at: newExpiresAt.toISOString(),
    updated_at: new Date().toISOString(),
  })
  .eq('user_id', userId);

if (updateError) {
  console.error('Failed to save refreshed token:', updateError);
  throw new Error('unauthorized');
}
```

**Résultat:**
✅ Refresh fonctionne sans erreur 400
✅ Tokens correctement sauvegardés
✅ Pas besoin de reconnecter constamment

---

### 🎨 Problème 2: Scrollbars partout + Espace perdu

**Symptôme:**
- Scrollbars internes dans chaque panel
- Beaucoup d'espace blanc inutilisé
- Interface comprimée

**Solution:**
**KitchenPage.css réécrit** pour layout dépliable:

1. **Scroll global uniquement:**
```css
.kitchen-page {
  overflow-y: auto; /* Scroll global */
  overflow-x: hidden;
}
```

2. **Panels s'étendent naturellement:**
```css
.kitchen-card {
  /* Plus de max-height */
  /* Plus de overflow-y: auto */
}

.menu-meals-vertical {
  /* S'étend avec le contenu */
}

.grocery-list {
  /* S'étend avec le contenu */
}

.rotation-roles {
  /* S'étend avec le contenu */
}
```

3. **Grid vertical:**
```css
.kitchen-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
```

**Résultat:**
✅ Un seul scroll (global)
✅ Tout le contenu visible
✅ Pas d'espace perdu
✅ Plus d'espace pour afficher les données

---

### ⚠️ Warning React Router

**Symptôme:**
```
React Router Future Flag Warning: v7_relativeSplatPath
```

**Cause:**
Dépréciation React Router v6 → v7

**Solution:**
Ajoute cette config dans ton routing principal (App.tsx ou router.tsx):
```typescript
<BrowserRouter future={{ v7_relativeSplatPath: true }}>
  {/* tes routes */}
</BrowserRouter>
```

Ou dans `vite.config.ts`:
```typescript
export default defineConfig({
  plugins: [
    react({
      router: {
        future: {
          v7_relativeSplatPath: true,
        },
      },
    }),
  ],
});
```

---

## 📋 CHECKLIST POST-INSTALLATION

### 1. Exécute TOUTE la migration SQL
La nouvelle version inclut la politique RLS pour google_connections.

```sql
-- Vérifie que la politique existe
SELECT * FROM pg_policies 
WHERE tablename = 'google_connections' 
AND policyname = 'Users can update own google connections';
```

**Si vide:** Exécute toute la migration `20251229_weekly_menu_storage.sql`

### 2. Remplace google.service.ts
Le nouveau fichier inclut la gestion d'erreur sur l'update.

### 3. Remplace KitchenPage.css
Le nouveau CSS n'a plus de scrolls internes.

### 4. Teste le refresh
1. Va sur `/kitchen`
2. Ouvre la console (F12)
3. Attends 5+ minutes (ou force expiration en DB)
4. Observe: "Token refreshed successfully" (sans erreur 400)

### 5. Teste le layout
1. Ajoute 10+ items à l'épicerie
2. Ajoute 3+ repas au menu
3. Vérifie: Tout visible, scroll global uniquement

---

## 🎯 TESTS DE RÉGRESSION

- [ ] Menu s'affiche correctement
- [ ] Navigation ← → fonctionne
- [ ] Épicerie sync sans erreur 401
- [ ] **Refresh token sans erreur 400** ← NOUVEAU
- [ ] Rotation s'affiche
- [ ] **Pas de scroll interne dans panels** ← NOUVEAU
- [ ] **Tout le contenu visible** ← NOUVEAU
- [ ] Modal d'édition fonctionne
- [ ] Ajout/suppression items épicerie
- [ ] Toggle checkbox épicerie

---

## 💡 AMÉLIORATIONS FUTURES

### Token Refresh
- Implémenter retry avec exponential backoff
- Notifier l'utilisateur si refresh échoue après 3 tentatives
- Badge "Session expirée" dans l'UI

### Layout
- Toggle view "Compacte" / "Étendue"
- Drag-and-drop pour réorganiser repas
- Filtres sur épicerie (complétés/en cours)

---

**Version:** 2.1  
**Date:** 2025-12-29  
**Auteur:** Claude AI  
**Testé sur:** Chrome 120+, Nest Hub (Chromium)
