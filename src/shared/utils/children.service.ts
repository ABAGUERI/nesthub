import { supabase } from '@/shared/utils/supabase';
import { Child, ChildProgress } from '@/shared/types';

/**
 * Service pour gérer les enfants et leur progression
 */

// Créer un enfant
export const createChild = async (
  userId: string,
  firstName: string,
  icon: 'bee' | 'ladybug' | 'butterfly' | 'caterpillar'
): Promise<Child> => {
  const { data, error } = await supabase
    .from('children')
    .insert({
      user_id: userId,
      first_name: firstName,
      icon,
    })
    .select()
    .single();

  if (error) throw error;

  // Créer aussi l'entrée child_progress
  await supabase.from('child_progress').insert({
    child_id: data.id,
    total_points: 0,
    current_level: 1,
    money_balance: 0,
    badges_earned: [],
    total_tasks_completed: 0,
  });

  return {
    id: data.id,
    userId: data.user_id,
    firstName: data.first_name,
    icon: data.icon,
    createdAt: data.created_at,
  };
};

// Récupérer tous les enfants d'un utilisateur
export const getChildren = async (userId: string): Promise<Child[]> => {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return data.map((child) => ({
    id: child.id,
    userId: child.user_id,
    firstName: child.first_name,
    icon: child.icon,
    createdAt: child.created_at,
  }));
};

// Récupérer la progression d'un enfant
export const getChildProgress = async (
  childId: string
): Promise<ChildProgress | null> => {
  const { data, error } = await supabase
    .from('child_progress')
    .select('*')
    .eq('child_id', childId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

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
  const { error } = await supabase.from('children').delete().eq('id', childId);

  if (error) throw error;
};

// Mettre à jour un enfant (nom, icône)
export const updateChild = async (
  childId: string,
  updates: Partial<Pick<Child, 'firstName' | 'icon'>>
): Promise<void> => {
  const dbUpdates: any = {};
  if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
  if (updates.icon !== undefined) dbUpdates.icon = updates.icon;

  const { error } = await supabase.from('children').update(dbUpdates).eq('id', childId);
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
