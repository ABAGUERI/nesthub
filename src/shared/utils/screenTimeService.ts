import { supabase } from '@/shared/utils/supabase';

export interface ScreenTimeConfigData {
  id?: string;
  childId: string;
  weeklyAllowance: number | null;
  dailyAllowance: number | null;
  weekResetDay: number | null;
  heartsTotal: number | null;
  heartsMinutes: number | null;
  livesEnabled: boolean | null;
  penaltyOnExceed: boolean | null;
}

interface ScreenTimeConfigRow {
  id: string;
  child_id: string;
  weekly_allowance: number | null;
  daily_allowance: number | null;
  week_reset_day: number | null;
  hearts_total: number | null;
  hearts_minutes: number | null;
  lives_enabled: boolean | null;
  penalty_on_exceed: boolean | null;
}

const mapConfigRow = (row: ScreenTimeConfigRow): ScreenTimeConfigData => ({
  id: row.id,
  childId: row.child_id,
  weeklyAllowance: row.weekly_allowance,
  dailyAllowance: row.daily_allowance,
  weekResetDay: row.week_reset_day,
  heartsTotal: row.hearts_total,
  heartsMinutes: row.hearts_minutes,
  livesEnabled: row.lives_enabled,
  penaltyOnExceed: row.penalty_on_exceed,
});

export const getOrCreateConfig = async (childId: string): Promise<ScreenTimeConfigData> => {
  const { data, error } = await supabase
    .from('screen_time_config')
    .select('*')
    .eq('child_id', childId)
    .maybeSingle();

  if (error) throw error;
  if (data) return mapConfigRow(data as ScreenTimeConfigRow);

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const userId = userData.user?.id;
  if (!userId) throw new Error('Utilisateur introuvable');

  const { data: clientConfig, error: clientError } = await supabase
    .from('client_config')
    .select('screen_time_default_allowance')
    .eq('user_id', userId)
    .single();

  if (clientError) throw clientError;

  const defaultDaily = clientConfig?.screen_time_default_allowance ?? 60;
  const weeklyAllowance = defaultDaily * 7;

  const { data: inserted, error: insertError } = await supabase
    .from('screen_time_config')
    .insert({
      child_id: childId,
      weekly_allowance: weeklyAllowance,
      week_reset_day: 1,
      hearts_total: 5,
      hearts_minutes: null,
      lives_enabled: true,
      daily_allowance: Math.ceil(weeklyAllowance / 7),
    })
    .select('*')
    .single();

  if (insertError) throw insertError;

  return mapConfigRow(inserted as ScreenTimeConfigRow);
};

export const upsertConfig = async (
  childId: string,
  payload: Partial<ScreenTimeConfigData>
): Promise<void> => {
  const dbPayload: Record<string, unknown> = {
    child_id: childId,
  };

  if (payload.weeklyAllowance !== undefined) {
    dbPayload.weekly_allowance = payload.weeklyAllowance;
    dbPayload.daily_allowance = Math.ceil((payload.weeklyAllowance ?? 0) / 7);
  }
  if (payload.weekResetDay !== undefined) dbPayload.week_reset_day = payload.weekResetDay;
  if (payload.heartsTotal !== undefined) dbPayload.hearts_total = payload.heartsTotal;
  if (payload.heartsMinutes !== undefined) dbPayload.hearts_minutes = payload.heartsMinutes;
  if (payload.livesEnabled !== undefined) dbPayload.lives_enabled = payload.livesEnabled;
  if (payload.penaltyOnExceed !== undefined) dbPayload.penalty_on_exceed = payload.penaltyOnExceed;

  const { error } = await supabase
    .from('screen_time_config')
    .upsert(dbPayload, { onConflict: 'child_id' });

  if (error) throw error;
};

export const getWeekWindow = (weekResetDay?: number | null) => {
  const now = new Date();
  const resetDay = weekResetDay ?? 1;
  const resetIndex = resetDay === 7 ? 0 : resetDay;
  const currentIndex = now.getDay();
  const diff = (currentIndex - resetIndex + 7) % 7;

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - diff);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return { weekStart, weekEnd };
};

export const getWeekUsage = async (childId: string, weekStart: Date, weekEnd: Date): Promise<number> => {
  const { data, error } = await supabase
    .from('screen_time_sessions')
    .select('minutes_used')
    .eq('child_id', childId)
    .gte('start_time', weekStart.toISOString())
    .lt('start_time', weekEnd.toISOString());

  if (error) throw error;

  return (data || []).reduce((sum, row) => sum + (row.minutes_used || 0), 0);
};

export const addManualUsage = async (childId: string, minutes: number): Promise<void> => {
  const now = new Date().toISOString();

  const { error } = await supabase.from('screen_time_sessions').insert({
    child_id: childId,
    minutes_used: minutes,
    lives_used: 0,
    is_active: false,
    start_time: now,
    end_time: now,
  });

  if (error) throw error;
};
