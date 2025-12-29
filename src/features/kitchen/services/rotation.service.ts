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

export const getCurrentRotation = async (userId: string): Promise<RotationWeek | null> => {
  try {
    const weekStart = formatWeekStart(new Date());

    const { data, error } = await supabase
      .from('rotation_assignments')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) return null;

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
  options?: { adjusted?: boolean; note?: string; rule?: string }
): Promise<void> => {
  try {
    await supabase.from('rotation_assignments').delete().eq('user_id', userId).eq('week_start', weekStart);

    if (assignments.length === 0) return;

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
    }));

    await supabase.from('rotation_assignments').insert(rows);
  } catch (err) {
    console.error('Error in saveRotation:', err);
    throw err;
  }
};

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
