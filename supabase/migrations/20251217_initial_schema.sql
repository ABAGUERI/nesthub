-- =====================================================
-- MIGRATION: Hub Familial 2.0 - Schema complet
-- Date: 2025-12-17
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: profiles
-- Extension du système auth.users de Supabase
-- =====================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  has_children BOOLEAN DEFAULT false,
  trial_ends_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired')),
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- TABLE: children
-- Enfants des utilisateurs
-- =====================================================
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  icon TEXT CHECK (icon IN ('bee', 'ladybug')) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_children_user_id ON children(user_id);

-- =====================================================
-- TABLE: client_config
-- Configuration personnalisée par client
-- =====================================================
CREATE TABLE client_config (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Modules activés (ON/OFF)
  module_calendar BOOLEAN DEFAULT true,
  module_tasks BOOLEAN DEFAULT true,
  module_weather BOOLEAN DEFAULT true,
  module_stocks BOOLEAN DEFAULT false,
  module_vehicle BOOLEAN DEFAULT false,
  module_photos BOOLEAN DEFAULT true,
  module_children_rewards BOOLEAN DEFAULT false,
  module_screen_time BOOLEAN DEFAULT false,
  
  -- Config météo
  weather_city TEXT,
  weather_postal_code TEXT,
  
  -- Config récompenses
  reward_system TEXT DEFAULT 'points' CHECK (reward_system IN ('points', 'money', 'hybrid', 'none')),
  reward_points_to_money_rate INTEGER DEFAULT 20, -- 100 pts = X $
  reward_enable_levels BOOLEAN DEFAULT false,
  reward_enable_badges BOOLEAN DEFAULT false,
  reward_levels_enabled BOOLEAN DEFAULT false,
  reward_auto_convert_points BOOLEAN DEFAULT true,
  
  -- Config temps d'écran
  screen_time_mode TEXT DEFAULT 'manual' CHECK (screen_time_mode IN ('manual', 'semi-auto', 'disabled')),
  screen_time_default_allowance INTEGER DEFAULT 60, -- minutes
  screen_time_use_lives BOOLEAN DEFAULT true,
  
  -- Config ticker boursier
  stock_symbols TEXT[] DEFAULT ARRAY['BTC-USD', 'AAPL', 'GOOGL', 'MSFT', 'NVDA'],
  stock_refresh_interval INTEGER DEFAULT 30, -- secondes
  
  -- Config véhicule
  vehicle_brand TEXT CHECK (vehicle_brand IN ('tesla', 'byd', 'generic') OR vehicle_brand IS NULL),
  vehicle_api_configured BOOLEAN DEFAULT false,
  
  -- Config galerie photos
  photos_slideshow_interval INTEGER DEFAULT 120, -- secondes
  photos_folder_id TEXT, -- Google Drive folder ID
  
  -- Config Google
  google_calendar_id TEXT,
  google_calendar_name TEXT,
  google_grocery_list_id TEXT,
  google_grocery_list_name TEXT DEFAULT 'Épicerie',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- TABLE: reward_levels
-- Paliers de niveaux configurables par client
-- =====================================================
CREATE TABLE reward_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  level_number INTEGER NOT NULL,
  level_name TEXT NOT NULL,
  points_min INTEGER NOT NULL,
  points_max INTEGER NOT NULL,
  badge_icon TEXT CHECK (badge_icon IN ('bronze', 'silver', 'gold', 'diamond')) NOT NULL,
  money_reward DECIMAL(5,2) DEFAULT 0.00,
  badge_color TEXT DEFAULT '#94a3b8',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, level_number)
);

-- Index pour recherche rapide
CREATE INDEX idx_reward_levels_user_id ON reward_levels(user_id);

-- =====================================================
-- TABLE: child_progress
-- Progression de chaque enfant (points, niveaux, argent)
-- =====================================================
CREATE TABLE child_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE UNIQUE NOT NULL,
  total_points INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  money_balance DECIMAL(6,2) DEFAULT 0.00,
  badges_earned TEXT[] DEFAULT ARRAY[]::TEXT[],
  total_tasks_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_child_progress_child_id ON child_progress(child_id);

-- =====================================================
-- TABLE: available_tasks
-- Tâches disponibles configurables par client
-- =====================================================
CREATE TABLE available_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  points INTEGER DEFAULT 10,
  money_value DECIMAL(5,2) DEFAULT 0.00,
  icon TEXT, -- emoji ou icon class
  category TEXT DEFAULT 'daily' CHECK (category IN ('daily', 'weekly', 'special')),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_available_tasks_user_id ON available_tasks(user_id);
CREATE INDEX idx_available_tasks_active ON available_tasks(user_id, is_active);

-- =====================================================
-- TABLE: completed_tasks
-- Historique des tâches complétées
-- =====================================================
CREATE TABLE completed_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES available_tasks(id) ON DELETE SET NULL,
  task_name TEXT NOT NULL,
  points_earned INTEGER DEFAULT 0,
  money_earned DECIMAL(5,2) DEFAULT 0.00,
  completed_at TIMESTAMP DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_completed_tasks_child_id ON completed_tasks(child_id);
CREATE INDEX idx_completed_tasks_date ON completed_tasks(completed_at DESC);

-- =====================================================
-- TABLE: screen_time_config
-- Configuration temps d'écran par enfant
-- =====================================================
CREATE TABLE screen_time_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE UNIQUE NOT NULL,
  daily_allowance INTEGER DEFAULT 60, -- minutes
  lives_enabled BOOLEAN DEFAULT true,
  max_lives INTEGER DEFAULT 3,
  minutes_per_life INTEGER DEFAULT 20,
  penalty_on_exceed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_screen_time_config_child_id ON screen_time_config(child_id);

-- =====================================================
-- TABLE: screen_time_sessions
-- Historique des sessions de temps d'écran
-- =====================================================
CREATE TABLE screen_time_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP,
  minutes_used INTEGER DEFAULT 0,
  lives_used INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_screen_time_sessions_child_id ON screen_time_sessions(child_id);
CREATE INDEX idx_screen_time_sessions_active ON screen_time_sessions(child_id, is_active);

-- =====================================================
-- TABLE: google_connections
-- Tokens OAuth et connexion Google par utilisateur
-- =====================================================
CREATE TABLE google_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  gmail_address TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP,
  selected_calendar_id TEXT,
  selected_calendar_name TEXT,
  grocery_list_id TEXT,
  grocery_list_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_google_connections_user_id ON google_connections(user_id);

-- =====================================================
-- TABLE: task_lists
-- Listes de tâches Google personnalisées
-- =====================================================
CREATE TABLE task_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  google_task_list_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'custom' CHECK (type IN ('grocery', 'custom')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_task_lists_user_id ON task_lists(user_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE available_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_time_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_time_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_lists ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES: profiles
-- =====================================================
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- POLICIES: children
-- =====================================================
CREATE POLICY "Users can manage own children" 
  ON children FOR ALL 
  USING (auth.uid() = user_id);

-- =====================================================
-- POLICIES: client_config
-- =====================================================
CREATE POLICY "Users can manage own config" 
  ON client_config FOR ALL 
  USING (auth.uid() = user_id);

-- =====================================================
-- POLICIES: reward_levels
-- =====================================================
CREATE POLICY "Users can manage own reward levels" 
  ON reward_levels FOR ALL 
  USING (auth.uid() = user_id);

-- =====================================================
-- POLICIES: child_progress
-- =====================================================
CREATE POLICY "Users can manage own children progress" 
  ON child_progress FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM children 
      WHERE children.id = child_progress.child_id 
      AND children.user_id = auth.uid()
    )
  );

-- =====================================================
-- POLICIES: available_tasks
-- =====================================================
CREATE POLICY "Users can manage own tasks" 
  ON available_tasks FOR ALL 
  USING (auth.uid() = user_id);

-- =====================================================
-- POLICIES: completed_tasks
-- =====================================================
CREATE POLICY "Users can manage own completed tasks" 
  ON completed_tasks FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM children 
      WHERE children.id = completed_tasks.child_id 
      AND children.user_id = auth.uid()
    )
  );

-- =====================================================
-- POLICIES: screen_time_config
-- =====================================================
CREATE POLICY "Users can manage own screen time config" 
  ON screen_time_config FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM children 
      WHERE children.id = screen_time_config.child_id 
      AND children.user_id = auth.uid()
    )
  );

-- =====================================================
-- POLICIES: screen_time_sessions
-- =====================================================
CREATE POLICY "Users can manage own screen time sessions" 
  ON screen_time_sessions FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM children 
      WHERE children.id = screen_time_sessions.child_id 
      AND children.user_id = auth.uid()
    )
  );

-- =====================================================
-- POLICIES: google_connections
-- =====================================================
CREATE POLICY "Users can manage own google connection" 
  ON google_connections FOR ALL 
  USING (auth.uid() = user_id);

-- =====================================================
-- POLICIES: task_lists
-- =====================================================
CREATE POLICY "Users can manage own task lists" 
  ON task_lists FOR ALL 
  USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS: updated_at
-- =====================================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur client_config
CREATE TRIGGER update_client_config_updated_at 
  BEFORE UPDATE ON client_config
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger sur child_progress
CREATE TRIGGER update_child_progress_updated_at 
  BEFORE UPDATE ON child_progress
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger sur google_connections
CREATE TRIGGER update_google_connections_updated_at 
  BEFORE UPDATE ON google_connections
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA: Niveaux par défaut (preset)
-- Ces niveaux seront copiés pour chaque nouveau client
-- =====================================================

-- On crée une table template pour les niveaux par défaut
CREATE TABLE reward_levels_template (
  level_number INTEGER PRIMARY KEY,
  level_name TEXT NOT NULL,
  points_min INTEGER NOT NULL,
  points_max INTEGER NOT NULL,
  badge_icon TEXT NOT NULL,
  money_reward DECIMAL(5,2) NOT NULL,
  badge_color TEXT NOT NULL
);

-- Insérer les niveaux par défaut
INSERT INTO reward_levels_template (level_number, level_name, points_min, points_max, badge_icon, money_reward, badge_color) VALUES
  (1, 'Novice', 0, 100, 'bronze', 5.00, '#cd7f32'),
  (2, 'Apprenti', 100, 300, 'silver', 10.00, '#c0c0c0'),
  (3, 'Expert', 300, 600, 'gold', 20.00, '#ffd700'),
  (4, 'Champion', 600, 1000, 'diamond', 50.00, '#b9f2ff');

-- =====================================================
-- FUNCTIONS: Helper pour créer config par défaut
-- =====================================================

-- Fonction appelée automatiquement après signup
CREATE OR REPLACE FUNCTION create_default_config()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer config par défaut
  INSERT INTO client_config (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger après création d'un user
CREATE TRIGGER on_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_config();

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================
