import { supabase } from '@/shared/utils/supabase';
import { WeekMenu, WeekMenuRow } from '@/shared/types/kitchen.types';

export const getWeekMenu = async (userId: string, weekStart: string): Promise<WeekMenu> => {
  try {
    const { data, error } = await supabase
      .from('weekly_menu')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', weekStart);

    if (error || !data) return {};

    const menu: WeekMenu = {};
    (data as WeekMenuRow[]).forEach((row) => {
      menu[row.day_iso_date] = row.meals || [];
    });

    return menu;
  } catch (err) {
    console.error('Error in getWeekMenu:', err);
    return {};
  }
};

export const saveWeekMenu = async (
  userId: string,
  weekStart: string,
  weekMenu: WeekMenu
): Promise<void> => {
  try {
    const nonEmptyDays = Object.entries(weekMenu).filter(([, meals]) => meals && meals.length > 0);

    if (nonEmptyDays.length === 0) {
      await supabase.from('weekly_menu').delete().eq('user_id', userId).eq('week_start', weekStart);
      return;
    }

    const promises = nonEmptyDays.map(([dayIso, meals]) => {
      return supabase.from('weekly_menu').upsert(
        { user_id: userId, week_start: weekStart, day_iso_date: dayIso, meals },
        { onConflict: 'user_id,week_start,day_iso_date' }
      );
    });

    await Promise.all(promises);
  } catch (err) {
    console.error('Error in saveWeekMenu:', err);
    throw err;
  }
};
