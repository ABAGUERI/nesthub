# Dashboard Refactor Summary

## Arborescence avant
```
src/features/dashboard/
├── Dashboard-final.css
├── Dashboard.css
├── DashboardPage.tsx
├── components/
│   ├── CalendarWidget.css
│   ├── CalendarWidget.tsx
│   ├── ChildTimeline.tsx
│   ├── ChildrenWidget.css
│   ├── ChildrenWidget.tsx
│   ├── DailyTasksWidget.css
│   ├── DailyTasksWidget.tsx
│   ├── DashboardHeader.css
│   ├── DashboardHeader.tsx
│   ├── FinanceWidget.css
│   ├── FinanceWidget.tsx
│   ├── GoogleTasksWidget.css
│   ├── GoogleTasksWidget.tsx
│   ├── StockTicker.css
│   ├── StockTicker.tsx
│   ├── VehicleWidget.css
│   └── VehicleWidget.tsx
└── contexts/
```

## Arborescence après
```
src/features/dashboard/
├── Dashboard.css
├── DashboardPage.tsx
├── REFACTOR_SUMMARY.md
├── components/
│   ├── CalendarWidget.css
│   ├── CalendarWidget.tsx
│   ├── ChildTimeline.css
│   ├── ChildTimeline.tsx
│   ├── ChildrenWidget.css
│   ├── ChildrenWidget.tsx
│   ├── DailyTasksWidget.css
│   ├── DailyTasksWidget.tsx
│   ├── DashboardHeader.css
│   ├── DashboardHeader.tsx
│   ├── FinanceWidget.css
│   ├── FinanceWidget.tsx
│   ├── GoogleTasksWidget.css
│   ├── GoogleTasksWidget.tsx
│   ├── StockTicker.css
│   ├── StockTicker.tsx
│   ├── VehicleWidget.css
│   └── VehicleWidget.tsx
├── hooks/
│   └── useChildEvents.ts
└── utils/
    └── dateHelpers.ts
```

## Fichiers créés
- `src/features/dashboard/hooks/useChildEvents.ts` (hook de chargement d'événements Google, logique inchangée).
- `src/features/dashboard/utils/dateHelpers.ts` (helpers dates/texte, extraction pure).
- `src/features/dashboard/components/ChildTimeline.css` (styles timeline dédiés).
- `src/features/dashboard/REFACTOR_SUMMARY.md` (ce document).

## Fichiers modifiés
- `src/features/dashboard/DashboardPage.tsx` (orchestrateur simplifié, logique extraite).
- `src/features/dashboard/components/ChildTimeline.tsx` (helpers externes + CSS dédié).
- `src/features/dashboard/Dashboard.css` (tokens CSS, nettoyage et retrait des styles timeline).

## Fichiers supprimés
- `src/features/dashboard/Dashboard-final.css` (fichier non référencé).

## Justification des choix
- **Hook**: extraction de la logique de chargement/filtrage Google Events dans `useChildEvents` pour isoler les effets et réduire la complexité de `DashboardPage`.
- **Utils**: centralisation des helpers de dates/formatage pour éviter les duplications et rendre les fonctions testables/pures.
- **Tokens CSS**: introduction de variables pour les couleurs/ombres/rayons afin d'éviter les valeurs magiques tout en conservant l'apparence.
- **Timeline CSS dédiée**: déplacement de `.child-timeline` et `.timeline-*` pour aligner la source de vérité avec le composant.

## Métriques simples
- CSS dashboard + timeline : **712 lignes ➜ 702 lignes** (`Dashboard.css` avant, puis `Dashboard.css` + `ChildTimeline.css` après).
- TSX dashboard + timeline : **492 lignes ➜ 405 lignes** (`DashboardPage.tsx` + `ChildTimeline.tsx`).
