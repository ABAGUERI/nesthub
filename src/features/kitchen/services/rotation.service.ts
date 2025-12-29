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
  adjusted?: boolean;
  note?: string | null;
  rule?: string | null;
}

interface RotationRow {
  role: string;
  assignee_member_id: string;
  assignee_name: string;
  assignee_avatar_url: string | null;
  adjusted?: boolean | null;
  note?: string | null;
  rule?: string | null;
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
      .select('*')
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

    const rotationWeek: RotationWeek = {
      weekStart,
      assignments: rows.map((row: RotationRow) => ({
        role: row.role,
        assigneeMemberId: row.assignee_member_id,
        assigneeName: row.assignee_name,
        assigneeAvatarUrl: row.assignee_avatar_url ?? undefined,
      })),
    };

    const [firstRow] = rows;
    if (firstRow) {
      if (typeof firstRow.adjusted !== 'undefined') {
        rotationWeek.adjusted = Boolean(firstRow.adjusted);
      }
      if (typeof firstRow.note !== 'undefined') {
        rotationWeek.note = firstRow.note ?? null;
      }
      if (typeof firstRow.rule !== 'undefined') {
        rotationWeek.rule = firstRow.rule ?? null;
      }
    }

    return rotationWeek;
  } catch (error) {
    console.warn('Rotation lookup failed:', error);
    return null;
  }
};
