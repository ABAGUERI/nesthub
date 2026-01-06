export type WeekMenu = Record<string, string[]>;

export interface WeekMenuRow {
  id: string;
  user_id: string;
  week_start: string;
  day_iso_date: string;
  meals: string[];
  created_at: string;
  updated_at: string;
}

export interface RotationAssignment {
  role: string;
  assigneeMemberId: string;
  assigneeName: string;
  assigneeAvatarUrl?: string;
  sortOrder?: number;
}

export interface RotationWeek {
  weekStart: string;
  assignments: RotationAssignment[];
  adjusted?: boolean;
  note?: string | null;
  rule?: string | null;
}

export type GoogleTaskStatus = 'needsAction' | 'completed';

export interface GroceryTask {
  id: string;
  title: string;
  status: GoogleTaskStatus;
  completed?: string;
  updated?: string;
}

export interface WeekDay {
  label: string;
  fullLabel: string;
  offset: number;
}

export const WEEK_DAYS: WeekDay[] = [
  { label: 'Lun', fullLabel: 'Lundi', offset: 0 },
  { label: 'Mar', fullLabel: 'Mardi', offset: 1 },
  { label: 'Mer', fullLabel: 'Mercredi', offset: 2 },
  { label: 'Jeu', fullLabel: 'Jeudi', offset: 3 },
  { label: 'Ven', fullLabel: 'Vendredi', offset: 4 },
  { label: 'Sam', fullLabel: 'Samedi', offset: 5 },
  { label: 'Dim', fullLabel: 'Dimanche', offset: 6 },
];
