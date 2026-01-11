-- =====================================================
-- MIGRATION: Weekly Menu Storage
-- Date: 2025-12-29
-- =====================================================

CREATE TABLE IF NOT EXISTS weekly_menu (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start TIMESTAMP WITH TIME ZONE NOT NULL,
  day_iso_date TEXT NOT NULL,
  meals TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_start, day_iso_date)
);

CREATE INDEX IF NOT EXISTS idx_weekly_menu_user_week ON weekly_menu(user_id, week_start);
ALTER TABLE weekly_menu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own weekly menu" ON weekly_menu;
CREATE POLICY "Users manage own weekly menu" ON weekly_menu FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- VÉRIFICATION RLS google_connections
-- Assure que les updates sont autorisés
-- =====================================================

-- Politique pour permettre les updates sur google_connections
DROP POLICY IF EXISTS "Users can update own google connections" ON google_connections;
CREATE POLICY "Users can update own google connections" 
  ON google_connections 
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Vérifie que RLS est activé
ALTER TABLE google_connections ENABLE ROW LEVEL SECURITY;

COMMENT ON POLICY "Users can update own google connections" ON google_connections IS 
  'Permet aux utilisateurs de mettre à jour leur propre connexion Google (refresh token)';
