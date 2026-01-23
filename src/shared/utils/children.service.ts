import { supabase } from '@/shared/utils/supabase';
import { Child, ChildProgress } from '@/shared/types';

export type FamilyRole = 'child' | 'adult';

interface FamilyMemberRow {
  id: string;
  user_id: string;
  first_name: string;
  icon: 'bee' | 'ladybug' | 'butterfly' | 'caterpillar';
  created_at: string;
  role?: FamilyRole | null;
  avatar_url: string | null; // <- important: nullable
  birth_date: string | null;
}

const mapRowToChild = (row: FamilyMemberRow): Child => ({
  id: row.id,
  userId: row.user_id,
  firstName: row.first_name,
  icon: row.icon,
  role: row.role ?? 'child',
  avatarUrl: row.avatar_url ?? undefined, // <- FIX
  birthDate: row.birth_date ?? null,
  createdAt: row.created_at,
});

let familyTableAvailable: boolean | null = null;

const canUseFamilyTable = async (): Promise<boolean> => {
  if (familyTableAvailable !== null) return familyTableAvailable;

  const { error } = await supabase.from('family_members').select('id').limit(1);
  if (error) {
    familyTableAvailable = false;
    return false;
  }

  familyTableAvailable = true;
  return true;
};

/**
 * Service pour gérer les enfants et leur progression
 */

// Créer un enfant
export const createChild = async (
  userId: string,
  firstName: string,
  icon: 'bee' | 'ladybug' | 'butterfly' | 'caterpillar',
  role: FamilyRole = 'child',
  avatarUrl?: string
): Promise<Child> => {
  const { data, error } = await supabase
    .from('family_members')
    .insert({
      user_id: userId,
      first_name: firstName,
      icon,
      role,
      avatar_url: avatarUrl ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;

  // Progress uniquement pour les enfants, si c’est ton intention
  if (role === 'child') {
    const { error: pErr } = await supabase.from('child_progress').insert({
      child_id: data.id,
      total_points: 0,
      current_level: 1,
      money_balance: 0,
      badges_earned: [],
      total_tasks_completed: 0,
    });
    if (pErr) throw pErr;
  }

  return mapRowToChild(data as FamilyMemberRow);
};


// Récupérer tous les enfants d'un utilisateur
export const getChildren = async (userId: string): Promise<Child[]> => {
  const useFamily = await canUseFamilyTable();

  if (useFamily) {
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data as FamilyMemberRow[]).map(mapRowToChild);
  }

  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data as FamilyMemberRow[]).map(mapRowToChild);
};

// Récupérer la progression d'un enfant
export const getChildProgress = async (
  childId: string
): Promise<ChildProgress | null> => {
  const { data, error } = await supabase
    .from('child_progress')
    .select('*')
    .eq('child_id', childId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    childId: data.child_id,
    totalPoints: data.total_points,
    currentLevel: data.current_level,
    moneyBalance: data.money_balance,
    badgesEarned: data.badges_earned,
    totalTasksCompleted: data.total_tasks_completed,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

// Mettre à jour la progression d'un enfant
export const updateChildProgress = async (
  childId: string,
  updates: Partial<ChildProgress>
): Promise<void> => {
  const dbUpdates: any = {};

  if (updates.totalPoints !== undefined) dbUpdates.total_points = updates.totalPoints;
  if (updates.currentLevel !== undefined) dbUpdates.current_level = updates.currentLevel;
  if (updates.moneyBalance !== undefined) dbUpdates.money_balance = updates.moneyBalance;
  if (updates.badgesEarned !== undefined) dbUpdates.badges_earned = updates.badgesEarned;
  if (updates.totalTasksCompleted !== undefined)
    dbUpdates.total_tasks_completed = updates.totalTasksCompleted;

  const { error } = await supabase
    .from('child_progress')
    .update(dbUpdates)
    .eq('child_id', childId);

  if (error) throw error;
};

// Supprimer un enfant
export const deleteChild = async (childId: string): Promise<void> => {
  const useFamily = await canUseFamilyTable();

  const { error } = useFamily
    ? await supabase.from('family_members').delete().eq('id', childId)
    : await supabase.from('family_members').delete().eq('id', childId);

  if (error) throw error;
};

// Mettre à jour un enfant (nom, icône)
export const updateChild = async (
  childId: string,
  updates: Partial<Pick<Child, 'firstName' | 'icon' | 'role' | 'birthDate'>>
): Promise<void> => {
  const dbUpdates: any = {};
  if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
  if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
  if (updates.role !== undefined) dbUpdates.role = updates.role;
  if (updates.birthDate !== undefined) dbUpdates.birth_date = updates.birthDate;

  const useFamily = await canUseFamilyTable();

  const { error } = useFamily
    ? await supabase.from('family_members').update(dbUpdates).eq('id', childId)
    : await supabase.from('family_members').update(dbUpdates).eq('id', childId);
  if (error) throw error;
};

// Récupérer tous les enfants avec leur progression
export const getChildrenWithProgress = async (userId: string) => {
  const children = await getChildren(userId);
  
  const childrenWithProgress = await Promise.all(
    children.map(async (child) => {
      const progress = await getChildProgress(child.id);
      return {
        ...child,
        progress,
      };
    })
  );

  return childrenWithProgress;
};
