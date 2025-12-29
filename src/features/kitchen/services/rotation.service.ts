import { supabase } from '@/shared/utils/supabase';

export interface RotationAssignment {
  role: string;
  assigneeMemberId: string;
  assigneeName: string;
  assigneeAvatarUrl?: string;
}

export interface RotationWeek {
  weekStart: string;
  assignments: RotationAssignment[];
}

interface RotationRow {
  role: string;
  assignee_member_id: string;
  assignee_name: string;
  assignee_avatar_url: string | null;
}

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
      .select('role, assignee_member_id, assignee_name, assignee_avatar_url')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .order('role', { ascending: true });

    if (error) {
      console.warn('Rotation service unavailable:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const rows: RotationRow[] = data as RotationRow[];

    return {
      weekStart,
      assignments: rows.map((row: RotationRow) => ({
        role: row.role,
        assigneeMemberId: row.assignee_member_id,
        assigneeName: row.assignee_name,
        assigneeAvatarUrl: row.assignee_avatar_url ?? undefined,
      })),
    };
  } catch (error) {
    console.warn('Rotation lookup failed:', error);
    return null;
  }
};
