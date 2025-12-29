# Notes d'intégration Kitchen

- **Rotation** : `rotation.service.ts` attend une table `rotation_assignments` avec les colonnes `user_id`, `week_start` (ISO), `role`, `assignee_member_id`, `assignee_name`, `assignee_avatar_url`. En l'absence de table/API, le bloc affiche "Rotation non configurée" sans casser l'écran. La migration `supabase/migrations/20251218_family_and_rotation.sql` crée la table, les index et les policies RLS nécessaires.
- **Épicerie** : s'appuie exclusivement sur Google Tasks via les IDs stockés dans `google_connections.grocery_list_id` ou `client_config.google_grocery_list_id`. Aucun stockage backend additionnel.
- **Menu de la semaine** : persistance locale (localStorage) pour le MVP. Prévoir un endpoint additif (ex : `week_menus` avec `user_id`, `week_start`, `entries JSONB`) pour synchro backend ultérieure.
