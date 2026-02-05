import { ensureSession, supabase } from '@/shared/utils/supabase';

export interface GoogleConnectionSafe {
  id: string;
  userId: string;
  gmailAddress: string | null;
  selectedCalendarId: string | null;
  selectedCalendarName: string | null;
  groceryListId: string | null;
  groceryListName: string | null;
}

type CachedEntry<T> = {
  timestamp: number;
  promise: Promise<T>;
};

const cache = new Map<string, CachedEntry<any>>();
const DEFAULT_TTL_MS = 60_000;

const getCached = <T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> => {
  const existing = cache.get(key);
  const now = Date.now();

  if (existing && now - existing.timestamp < ttlMs) {
    return existing.promise as Promise<T>;
  }

  const promise = fetcher();
  cache.set(key, { timestamp: now, promise });
  return promise;
};

const parseFunctionError = (error: unknown) => {
  const fallback: { message: string; status?: number } = { message: 'Erreur de synchronisation Google' };

  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const maybeContext = (error as { context?: { status?: number; body?: unknown } }).context;
  if (!maybeContext) {
    return { message: (error as Error).message || fallback.message };
  }

  let message = fallback.message;
  const status = maybeContext.status;

  if (maybeContext.body) {
    if (typeof maybeContext.body === 'string') {
      try {
        const parsed = JSON.parse(maybeContext.body);
        message = parsed?.message || message;
      } catch {
        message = maybeContext.body;
      }
    } else if (typeof maybeContext.body === 'object' && 'message' in maybeContext.body) {
      message = (maybeContext.body as { message?: string }).message || message;
    }
  }

  return { message, status };
};

const invokeFunction = async <T>(name: string, body: Record<string, unknown>): Promise<T> => {
  const session = await ensureSession();
  const accessToken = session?.access_token;

  const { data, error } = await supabase.functions.invoke(name, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body,
  });
  if (error) {
    const parsed = parseFunctionError(error);
    const err = new Error(parsed.message);
    (err as { status?: number }).status = parsed.status;
    throw err;
  }

  return data as T;
};

export const getGoogleConnectionSafe = async (userId: string): Promise<GoogleConnectionSafe | null> => {
  return getCached(`google-connection-${userId}`, 30_000, async () => {
    const { data, error } = await supabase
      .from('v_google_connections_safe')
      .select(
        'id, user_id, gmail_address, selected_calendar_id, selected_calendar_name, grocery_list_id, grocery_list_name'
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      gmailAddress: data.gmail_address,
      selectedCalendarId: data.selected_calendar_id,
      selectedCalendarName: data.selected_calendar_name,
      groceryListId: data.grocery_list_id,
      groceryListName: data.grocery_list_name,
    };
  });
};

export const fetchCalendarEvents = async (params: {
  timeMin: string;
  timeMax: string;
  maxResults?: number;
  calendarId?: string;
}) => {
  const key = `calendar-events-${params.calendarId ?? 'primary'}-${params.timeMin}-${params.timeMax}-${
    params.maxResults ?? 'default'
  }`;

  return getCached(key, DEFAULT_TTL_MS, () =>
    invokeFunction('google-calendar-events', {
      timeMin: params.timeMin,
      timeMax: params.timeMax,
      maxResults: params.maxResults,
      calendarId: params.calendarId,
    })
  );
};

export const fetchTasksList = async (listId: string) => {
  const key = `tasks-list-${listId}`;
  return getCached(key, DEFAULT_TTL_MS, () =>
    invokeFunction('google-tasks-list', {
      listId,
    })
  );
};

export const createTaskInList = async (listId: string, title: string) =>
  invokeFunction('google-tasks-list', {
    action: 'createTask',
    listId,
    title,
  });

export const updateTaskInList = async (
  listId: string,
  taskId: string,
  status: string
) =>
  invokeFunction('google-tasks-list', {
    action: 'updateTask',
    listId,
    taskId,
    status,
  });

export const createTaskList = async (title: string) =>
  invokeFunction('google-tasks-list', {
    action: 'createList',
    title,
  });
