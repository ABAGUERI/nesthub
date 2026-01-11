-- =====================================================
-- MIGRATION: Family members + kitchen rotation support
-- Date: 2025-12-18
-- =====================================================

-- Ensure extended icon set and roles on existing children table (backward compatible)
ALTER TABLE children
  ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('child', 'adult'));

UPDATE children SET role = 'child' WHERE role IS NULL;

ALTER TABLE children DROP CONSTRAINT IF EXISTS children_icon_check;
ALTER TABLE children
  ADD CONSTRAINT children_icon_check CHECK (icon IN ('bee', 'ladybug', 'butterfly', 'caterpillar'));

-- Family members unified table (additive; copies existing children)
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  icon TEXT CHECK (icon IN ('bee', 'ladybug', 'butterfly', 'caterpillar')) NOT NULL,
  role TEXT CHECK (role IN ('child', 'adult')) DEFAULT 'child',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);

INSERT INTO family_members (id, user_id, first_name, icon, role, created_at)
SELECT id, user_id, first_name, icon, COALESCE(role, 'child'), created_at FROM children
ON CONFLICT (id) DO NOTHING;

-- Rotation assignments storage (for weekly board)
CREATE TABLE IF NOT EXISTS rotation_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start TIMESTAMP WITH TIME ZONE NOT NULL,
  role TEXT NOT NULL,
  assignee_member_id UUID NOT NULL,
  assignee_name TEXT NOT NULL,
  assignee_avatar_url TEXT,
  adjusted BOOLEAN,
  note TEXT,
  rule TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rotation_assignments_user_week ON rotation_assignments(user_id, week_start);

CREATE OR REPLACE FUNCTION set_rotation_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rotation_assignments_updated_at ON rotation_assignments;
CREATE TRIGGER trg_rotation_assignments_updated_at
BEFORE UPDATE ON rotation_assignments
FOR EACH ROW
EXECUTE FUNCTION set_rotation_assignments_updated_at();

-- RLS: scope rows to owner
ALTER TABLE rotation_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rotation select own rows" ON rotation_assignments;
CREATE POLICY "Rotation select own rows"
  ON rotation_assignments
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Rotation insert own rows" ON rotation_assignments;
CREATE POLICY "Rotation insert own rows"
  ON rotation_assignments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Rotation update own rows" ON rotation_assignments;
CREATE POLICY "Rotation update own rows"
  ON rotation_assignments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
