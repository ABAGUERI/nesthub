# 📅 LAYOUT 7 JOURS - 2 COLONNES

## Version: 2.2 (2025-12-29 20:05)

### 🎯 NOUVEAU LAYOUT

```
┌──────────────────────────────┬──────────────────────────┐
│                              │                          │
│  Menu de la semaine          │  Épicerie — Épicerie    │
│  29 déc. → 4 janv.     ← →   │  [Ajouter...] 🔄       │
│                              │                          │
│  ┌─────┬─────┬─────┐        │  ☐ Dentifrice           │
│  │LUN  │MAR  │MER  │        │  ☑ Jus                  │
│  │ 29  │ 30  │ 31  │        │  ☐ Pommes               │
│  │🍝   │🍕   │🥗   │        │                          │
│  └─────┴─────┴─────┘        ├──────────────────────────┤
│  ┌─────┬─────┬─────┐        │                          │
│  │JEU  │VEN  │SAM  │        │  Rotation                │
│  │ 1   │ 2   │ 3   │        │  semaine du 29 décembre  │
│  │Vide │Vide │Vide │        │                          │
│  └─────┴─────┴─────┘        │  Cuisine → Sifaw        │
│  ┌─────┐                    │  Vaisselle → Lucas      │
│  │DIM  │                    │  Litière → Ahmed        │
│  │ 4   │                    │                          │
│  │Vide │                    │                          │
│  └─────┘                    │                          │
│                              │                          │
│  [✏️ Modifier le menu]      │                          │
│                              │                          │
└──────────────────────────────┴──────────────────────────┘
```

---

## ✨ CARACTÉRISTIQUES

### Layout 2 colonnes fixe (100vh)
- **Colonne gauche (50%)**: Menu 7 jours en grille
- **Colonne droite (50%)**: 
  - Épicerie (50% hauteur)
  - Rotation (50% hauteur)

### Menu 7 jours
- ✅ Grille 3 colonnes (responsive 2 colonnes mobile)
- ✅ Tous les jours visibles simultanément
- ✅ Jour actuel surligné (border cyan)
- ✅ Click sur un jour pour éditer
- ✅ Navigation semaine ← →
- ✅ Max 3 repas affichés par jour (+ compteur si plus)
- ✅ Scroll interne si beaucoup de repas

### Épicerie (inchangée)
- Sync Google Tasks
- Ajout/toggle items
- Scroll interne si nécessaire

### Rotation (inchangée)
- Affichage assignations
- Scroll interne si nécessaire

---

## 🔧 FICHIERS MODIFIÉS

### KitchenPage.css (nouveau)
- Grid 2 colonnes fixe: `grid-template-columns: 1fr 1fr`
- Sidebar: `grid-template-rows: 1fr 1fr` (50/50)
- Hauteur fixe: `height: 100vh`, `overflow: hidden`
- Scroll interne: `.panel-scroll` dans chaque carte
- Grille menu: `.menu-week-grid` avec 3 colonnes

### MenuPanel.tsx (réécrit)
- Affiche les 7 jours simultanément
- Grille responsive
- Click sur carte jour pour éditer
- Navigation semaine
- Indicateur jour actuel

### KitchenPage.tsx (simplifié)
- Layout 2 colonnes direct
- Sidebar avec grid 50/50

---

## 📊 DIMENSIONS

### Page globale
- Hauteur: `100vh` (fixe)
- Header: `60px` (fixe)
- Content: `flex: 1` (reste disponible)

### Grid 2 colonnes
- Colonne 1: `1fr` (50%)
- Colonne 2: `1fr` (50%)
- Gap: `18px`

### Sidebar droite
- Row 1 (Épicerie): `1fr` (50%)
- Row 2 (Rotation): `1fr` (50%)
- Gap: `14px`

### Cartes jours
- 3 colonnes sur desktop
- 2 colonnes sur mobile
- Gap: `10px`
- Hauteur: auto (flex avec contenu)

---

## 🎨 VISUELS

### Jour actuel
```css
.menu-day-card.today {
  border-color: rgba(34, 211, 238, 0.4);
  background: rgba(34, 211, 238, 0.08);
}
```

### Hover jour
```css
.menu-day-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
}
```

### Repas tronqués
Si > 3 repas : affiche "+ X de plus..."

---

## 📱 RESPONSIVE

### Desktop (> 1024px)
- 2 colonnes : Menu | Sidebar
- Grille menu : 3 colonnes

### Tablet (768-1024px)
- Stack vertical : Menu → Sidebar
- Grille menu : 2 colonnes

### Mobile (< 768px)
- Stack vertical complet
- Grille menu : 2 colonnes
- Sidebar : auto height

---

## ✅ TESTS

### Affichage
- [ ] Les 7 jours sont visibles
- [ ] Jour actuel surligné (border cyan)
- [ ] Repas affichés correctement (max 3 + compteur)
- [ ] Grille responsive (3→2 colonnes)

### Interaction
- [ ] Click sur jour ouvre éditeur
- [ ] Navigation ← → change semaine
- [ ] Modal édition fonctionne
- [ ] Sauvegarde persiste

### Layout
- [ ] Page tient en 100vh (pas de scroll global)
- [ ] Sidebar 50/50 (Épicerie + Rotation)
- [ ] Scroll interne seulement si nécessaire

---

## 🔄 MIGRATION DEPUIS v2.1

### Étape 1: Remplacer les fichiers
```bash
# CSS
cp KitchenPage.css <projet>/src/features/kitchen/

# Components
cp components/MenuPanel.tsx <projet>/src/features/kitchen/components/

# Page
cp KitchenPage.tsx <projet>/src/features/kitchen/
```

### Étape 2: Vérifier
```bash
npm run dev
# → /kitchen
```

### Étape 3: Tester
1. Vérifie les 7 jours s'affichent
2. Clique sur un jour (doit ouvrir modal)
3. Ajoute des repas
4. Vérifie sauvegarde

---

## 💡 PERSONNALISATION

### Changer la grille menu (ex: 2 colonnes au lieu de 3)
```css
/* KitchenPage.css ligne ~290 */
.menu-week-grid {
  grid-template-columns: repeat(2, 1fr); /* ← Changer ici */
}
```

### Ajuster les hauteurs sidebar
```css
/* KitchenPage.css ligne ~70 */
.kitchen-sidebar {
  grid-template-rows: 1.2fr 0.8fr; /* Épicerie plus grande */
}
```

### Changer le nombre max de repas affichés
```tsx
// MenuPanel.tsx ligne ~180
meals.slice(0, 4) // ← Changer de 3 à 4
```

---

## 🎉 AVANTAGES

### Par rapport au carousel (v2.0-2.1)
- ✅ Vue d'ensemble de toute la semaine
- ✅ Pas besoin de naviguer ← → pour voir un jour
- ✅ Planification visuelle intuitive
- ✅ Plus rapide pour vérifier un jour spécifique

### Par rapport au scroll (v2.1)
- ✅ Tout visible sans scroll global
- ✅ Layout fixe 100vh
- ✅ Meilleure utilisation de l'espace
- ✅ Sidebar organisée 50/50

---

**Version 2.2 avec les 7 jours prête ! 🚀**
