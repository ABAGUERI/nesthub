import { supabase } from '@/shared/utils/supabase';
import { RotationWeek, RotationAssignment } from '@/shared/types/kitchen.types';

const formatWeekStart = (date: Date): string => {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
};

/**
 * Vérifier si aujourd'hui est le jour de réinitialisation de la rotation
 * @param resetDay Jour de la semaine (0=Dimanche, 1=Lundi, etc.)
 */
export const isResetDay = (resetDay: number): boolean => {
  const today = new Date().getDay();
  return today === resetDay;
};

/**
 * Obtenir le nom du jour de la semaine
 */
export const getDayName = (dayNumber: number): string => {
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return days[dayNumber] || 'Lundi';
};

export const getCurrentRotation = async (userId: string): Promise<RotationWeek | null> => {
  try {
    const weekStart = formatWeekStart(new Date());

    const { data, error } = await supabase
      .from('rotation_assignments')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching rotation:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('No rotation found for week:', weekStart);
      return null;
    }

    // Toutes les lignes ont le même attempts_used, on prend celui de la première
    const attemptsUsed = data[0]?.attempts_used ?? 0;
    
    console.log('Loaded rotation:', {
      weekStart,
      count: data.length,
      attemptsUsed,
      firstRow: data[0]
    });

    return {
      weekStart,
      assignments: data.map((row: any) => ({
        role: row.role,
        assigneeMemberId: row.assignee_member_id,
        assigneeName: row.assignee_name,
        assigneeAvatarUrl: row.assignee_avatar_url,
        sortOrder: row.sort_order || 0,
      })),
      adjusted: Boolean(data[0]?.adjusted),
      note: data[0]?.note || null,
      rule: data[0]?.rule || null,
      attemptsUsed: attemptsUsed,
    };
  } catch (error) {
    console.error('Error in getCurrentRotation:', error);
    return null;
  }
};

export const saveRotation = async (
  userId: string,
  weekStart: string,
  assignments: RotationAssignment[],
  options?: { adjusted?: boolean; note?: string; rule?: string; attemptsUsed?: number }
): Promise<void> => {
  try {
    console.log('Saving rotation:', {
      userId,
      weekStart,
      assignmentsCount: assignments.length,
      attemptsUsed: options?.attemptsUsed
    });

    // D'abord supprimer toutes les anciennes lignes pour cette semaine
    const { error: deleteError } = await supabase
      .from('rotation_assignments')
      .delete()
      .eq('user_id', userId)
      .eq('week_start', weekStart);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw deleteError;
    }

    if (assignments.length === 0) {
      console.log('No assignments to save');
      return;
    }

    // Construire les lignes à insérer avec attempts_used sur CHAQUE ligne
    const rows = assignments.map((assignment, index) => ({
      user_id: userId,
      week_start: weekStart,
      role: assignment.role,
      assignee_member_id: assignment.assigneeMemberId,
      assignee_name: assignment.assigneeName,
      assignee_avatar_url: assignment.assigneeAvatarUrl || null,
      sort_order: assignment.sortOrder ?? index,
      adjusted: options?.adjusted ?? false,
      note: options?.note ?? null,
      rule: options?.rule ?? null,
      attempts_used: options?.attemptsUsed ?? 0,  // Important : même valeur partout
    }));

    console.log('Inserting rows:', rows.length, 'with attempts_used:', options?.attemptsUsed);

    // Insérer les nouvelles lignes
    const { error: insertError } = await supabase
      .from('rotation_assignments')
      .insert(rows);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('Rotation saved successfully');
  } catch (err) {
    console.error('Error in saveRotation:', err);
    throw err;
  }
};

/**
 * Générer une nouvelle rotation pour la semaine courante (jour de reset)
 * Mélange les assignations de manière aléatoire
 * Maximum 3 tentatives par période de reset
 */
export const generateCurrentWeekRotation = async (userId: string): Promise<{ success: boolean; attemptsUsed: number; message?: string }> => {
  const currentWeekStart = formatWeekStart(new Date());
  
  console.log('=== generateCurrentWeekRotation START ===');
  console.log('Week start:', currentWeekStart);
  
  // Récupérer la rotation actuelle pour vérifier les tentatives
  const currentRotation = await getCurrentRotation(userId);
  
  console.log('Current rotation:', currentRotation);
  
  // Si pas de rotation configurée
  if (!currentRotation || currentRotation.assignments.length === 0) {
    throw new Error('Aucune rotation configurée. Configurez d\'abord vos tâches dans Paramètres > Famille.');
  }

  // Vérifier le nombre de tentatives
  const attemptsUsed = currentRotation.attemptsUsed ?? 0;
  const MAX_ATTEMPTS = 3;
  
  console.log('Attempts used:', attemptsUsed, '/', MAX_ATTEMPTS);
  
  if (attemptsUsed >= MAX_ATTEMPTS) {
    console.log('Max attempts reached');
    return {
      success: false,
      attemptsUsed,
      message: 'Maximum de 3 tentatives atteint. Réessayez demain !',
    };
  }

  // Extraire les tâches et membres uniques
  const roles = [...new Set(currentRotation.assignments.map((a) => a.role))];
  const membersMap = new Map<string, { id: string; name: string; avatar?: string }>();
  
  currentRotation.assignments.forEach((a) => {
    if (!membersMap.has(a.assigneeMemberId)) {
      membersMap.set(a.assigneeMemberId, {
        id: a.assigneeMemberId,
        name: a.assigneeName,
        avatar: a.assigneeAvatarUrl,
      });
    }
  });
  
  const members = Array.from(membersMap.values());

  console.log('Roles:', roles);
  console.log('Members:', members.map(m => m.name));

  // Mélanger aléatoirement les membres (Fisher-Yates shuffle)
  const shuffledMembers = [...members];
  for (let i = shuffledMembers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledMembers[i], shuffledMembers[j]] = [shuffledMembers[j], shuffledMembers[i]];
  }

  console.log('Shuffled members:', shuffledMembers.map(m => m.name));

  // Créer les nouvelles assignations avec les membres mélangés
  const newAssignments: RotationAssignment[] = roles.map((role, index) => {
    const member = shuffledMembers[index % shuffledMembers.length];
    return {
      role,
      assigneeMemberId: member.id,
      assigneeName: member.name,
      assigneeAvatarUrl: member.avatar,
      sortOrder: index,
    };
  });

  console.log('New assignments:', newAssignments.map(a => `${a.role} → ${a.assigneeName}`));

  // Incrémenter le compteur de tentatives
  const newAttemptsUsed = attemptsUsed + 1;

  console.log('New attempts used:', newAttemptsUsed);

  // Sauvegarder la nouvelle rotation
  await saveRotation(userId, currentWeekStart, newAssignments, {
    adjusted: false,
    rule: `Rotation automatique (tentative ${newAttemptsUsed}/${MAX_ATTEMPTS})`,
    attemptsUsed: newAttemptsUsed,
  });

  console.log('=== generateCurrentWeekRotation END ===');

  return {
    success: true,
    attemptsUsed: newAttemptsUsed,
    message: newAttemptsUsed < MAX_ATTEMPTS 
      ? `Nouvelle rotation ! Il reste ${MAX_ATTEMPTS - newAttemptsUsed} tentative(s)`
      : 'Dernière tentative utilisée. Prochaine rotation demain !',
  };
};

/**
 * @deprecated Utiliser generateCurrentWeekRotation à la place
 * Générer la rotation pour la prochaine semaine (ancien comportement)
 */
export const generateNextWeekRotation = async (userId: string): Promise<void> => {
  const currentWeekStart = formatWeekStart(new Date());
  const nextWeekDate = new Date(currentWeekStart);
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeekStart = nextWeekDate.toISOString();

  const currentRotation = await getCurrentRotation(userId);
  if (!currentRotation || currentRotation.assignments.length === 0) {
    throw new Error('No current rotation');
  }

  const roles = [...new Set(currentRotation.assignments.map((a) => a.role))];
  const members = [...new Set(currentRotation.assignments.map((a) => ({
    id: a.assigneeMemberId,
    name: a.assigneeName,
    avatar: a.assigneeAvatarUrl,
  })))];

  const newAssignments: RotationAssignment[] = roles.map((role, index) => {
    const currentMemberIndex = currentRotation.assignments.findIndex((a) => a.role === role);
    const nextMemberIndex = (currentMemberIndex + 1) % members.length;
    const member = members[nextMemberIndex];

    return {
      role,
      assigneeMemberId: member.id,
      assigneeName: member.name,
      assigneeAvatarUrl: member.avatar,
      sortOrder: index,
    };
  });

  await saveRotation(userId, nextWeekStart, newAssignments, {
    adjusted: false,
    rule: currentRotation.rule || 'Rotation automatique hebdomadaire',
  });
};
