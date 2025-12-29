const STORAGE_KEY = 'nesthub.weekMenu';

export type WeekMenu = Record<string, string[]>;

type WeekMenuStorage = Record<string, string>;

const isBrowser = typeof window !== 'undefined';

const readStorage = (): WeekMenuStorage => {
  if (!isBrowser) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as WeekMenuStorage;
  } catch (error) {
    console.warn('Unable to read week menu storage', error);
    return {};
  }
};

const writeStorage = (data: WeekMenuStorage) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Unable to persist week menu', error);
  }
};

export const getWeekMenu = async (weekStart: string): Promise<WeekMenu> => {
  const stored = readStorage();
  const menu = stored[weekStart];
  if (menu) {
    try {
      const parsed = JSON.parse(menu) as Record<string, string | string[]>;
      return Object.entries(parsed).reduce<WeekMenu>((acc, [key, value]) => {
        if (Array.isArray(value)) {
          acc[key] = value;
        } else if (typeof value === 'string') {
          acc[key] = value ? [value] : [];
        } else {
          acc[key] = [];
        }
        return acc;
      }, {});
    } catch {
      return {};
    }
  }
  return {};
};

export const saveWeekMenu = async (weekStart: string, weekMenu: WeekMenu): Promise<void> => {
  const stored = readStorage();
  const updated: WeekMenuStorage = {
    ...stored,
    [weekStart]: JSON.stringify(weekMenu),
  };
  writeStorage(updated);
};
