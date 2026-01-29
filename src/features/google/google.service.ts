import { ensureSession, supabase } from '@/shared/utils/supabase';
import {
  createTaskInList,
  createTaskList as createTaskListViaEdge,
  fetchCalendarEvents,
  fetchTasksList,
  getGoogleConnectionSafe,
  updateTaskInList,
} from './google-edge.service';

/**
 * Service Google OAuth et API
 */

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_REDIRECT_URI =
  import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/callback`;

// Scopes nécessaires
const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/tasks',
].join(' ');

/**
 * Initier le flow OAuth Google
 */
export const initiateGoogleOAuth = () => {
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  
  authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', GOOGLE_REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', SCOPES);
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent'); // Force l'affichage du consentement

  // Rediriger vers Google OAuth
  window.location.href = authUrl.toString();
};

export type GoogleOAuthExchangeSuccess = {
  ok: true;
  gmailAddress: string;
  scope: string | null;
  expiresAt: string;
};

export type GoogleOAuthExchangeError = {
  error: string;
  description: string;
};

export type GoogleOAuthExchangeResult = GoogleOAuthExchangeSuccess | GoogleOAuthExchangeError;

/**
 * Échanger le code OAuth via Edge Function
 */
export const googleOAuthExchange = async (
  code: string,
  redirectUri: string
): Promise<GoogleOAuthExchangeResult> => {
  // 1) Forcer récupération session
  const session = await ensureSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    return {
      error: 'unauthorized',
      description: 'Session Supabase absente. Reconnecte-toi puis réessaie.',
    };
  }

  // 2) Appeler l’Edge Function en passant le JWT explicitement
  const { data, error } = await supabase.functions.invoke('google-oauth-exchange', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: { code, redirectUri },
  });

  if (error) {
    return { error: 'supabase_error', description: error.message };
  }

  if (data?.ok) return data as GoogleOAuthExchangeSuccess;

  if (data?.error && data?.description) return data as GoogleOAuthExchangeError;

  return { error: 'unknown_error', description: 'Réponse inattendue du serveur OAuth.' };
};

export const waitForGoogleConnection = async (attempts: number = 5, delayMs: number = 500) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const connection = await getGoogleConnection();
    if (connection) {
      return connection;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return null;
};

export const updateGoogleConnectionSettings = async (payload: {
  selectedCalendarId?: string | null;
  groceryListId?: string | null;
  groceryListName?: string | null;
}) => {
  const { error } = await supabase.rpc('update_google_connection_settings', {
    p_selected_calendar_id: payload.selectedCalendarId ?? null,
    p_grocery_list_id: payload.groceryListId ?? null,
    p_grocery_list_name: payload.groceryListName ?? null,
  });

  if (error) throw error;
};


/**
 * Récupérer la connexion Google de l'utilisateur
 */
export const getGoogleConnection = async (userId?: string) => {
  const { data, error } = await supabase.rpc('get_google_connection');
  if (error) {
    return null;
  }

  const baseConnection = Array.isArray(data) ? data[0] : data;
  if (!baseConnection) return null;

  if (userId) {
    const connection = await getGoogleConnectionSafe(userId);
    if (connection) {
      return {
        id: connection.id,
        userId: connection.userId,
        gmailAddress: connection.gmailAddress,
        selectedCalendarId: connection.selectedCalendarId,
        selectedCalendarName: connection.selectedCalendarName,
        groceryListId: connection.groceryListId,
        groceryListName: connection.groceryListName,
      };
    }
  }

  return {
    id: baseConnection.id,
    userId: baseConnection.user_id,
    gmailAddress: baseConnection.gmail_address,
    selectedCalendarId: baseConnection.selected_calendar_id,
    selectedCalendarName: baseConnection.selected_calendar_name,
    groceryListId: null,
    groceryListName: null,
  };
};

export interface GoogleTaskList {
  id: string;
  title: string;
}

export const getTaskListsWithAuth = async (userId: string): Promise<GoogleTaskList[]> => {
  const { data, error } = await supabase
    .from('task_lists')
    .select('google_task_list_id, name')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return (data || []).map((item) => ({ id: item.google_task_list_id, title: item.name }));
};

export const updateGroceryListSelection = async (
  userId: string,
  listId: string,
  listName: string
): Promise<void> => {
  if (!userId) {
    throw new Error('userId manquant pour mettre à jour la liste épicerie');
  }

  await updateGoogleConnectionSettings({
    groceryListId: listId,
    groceryListName: listName,
  });
};

/**
 * Créer une liste de tâches Google
 */
export const createTaskList = async (title: string) => {
  const data = await createTaskListViaEdge(title);

  return {
    id: data.id,
    title: data.title,
  };
};

/**
 * Créer automatiquement toutes les listes de tâches
 * - Épicerie
 * - Tâches [Prénom Enfant 1]
 * - Tâches [Prénom Enfant 2] (si existe)
 * - Familiale
 */
export const createDefaultTaskLists = async (
  userId: string,
  childrenNames: string[]
) => {
  const listsToCreate = [
    { name: 'Épicerie', type: 'grocery' as const },
    { name: 'Familiale', type: 'custom' as const },
  ];

  // Ajouter une liste par enfant
  childrenNames.forEach((childName) => {
    if (childName.trim()) {
      listsToCreate.push({
        name: `Tâches ${childName}`,
        type: 'custom' as const,
      });
    }
  });

  const { data: existingLists, error: existingError } = await supabase
    .from('task_lists')
    .select('id, name, google_task_list_id, type')
    .eq('user_id', userId);

  if (existingError) throw existingError;

  const existingByName = new Map(
    (existingLists || []).map((list) => [list.name, list])
  );

  const createdLists: Array<{ id: string; name: string; type: string }> = [];

  // Créer chaque liste dans Google Tasks
  for (const list of listsToCreate) {
    if (existingByName.has(list.name)) {
      const existing = existingByName.get(list.name);
      if (existing) {
        if (existing.google_task_list_id) {
          createdLists.push({
            id: existing.google_task_list_id,
            name: existing.name,
            type: list.type,
          });
        }
      }
      continue;
    }

    const googleList = await createTaskList(list.name);

    const { error } = await supabase.from('task_lists').insert({
      user_id: userId,
      google_task_list_id: googleList.id,
      name: googleList.title,
      type: list.type,
    });

    if (error) {
      throw error;
    }

    createdLists.push({
      id: googleList.id,
      name: googleList.title,
      type: list.type,
    });
  }

  // Mettre à jour la connexion Google avec l'ID de la liste Épicerie
  const groceryList =
    createdLists.find((l) => l.type === 'grocery') ||
    (existingLists || []).find((l) => l.type === 'grocery');
  if (
    groceryList &&
    (('google_task_list_id' in groceryList && groceryList.google_task_list_id) ||
      (!('google_task_list_id' in groceryList) && groceryList.id))
  ) {
    await updateGoogleConnectionSettings({
      groceryListId:
        'google_task_list_id' in groceryList ? groceryList.google_task_list_id : groceryList.id,
      groceryListName: groceryList.name,
    });
  }

  return createdLists;
};

/**
 * Sauvegarder les calendriers sélectionnés
 */
export const saveSelectedCalendars = async (
  userId: string,
  calendarIds: string[]
) => {
  // Sauvegarder comme JSON array dans client_config
  const { error } = await supabase
    .from('client_config')
    .update({
      google_calendar_id: calendarIds[0] || null, // Premier calendrier = principal
      // On pourrait aussi créer une colonne selected_calendar_ids JSONB
      // pour stocker tous les IDs sélectionnés
    })
    .eq('user_id', userId);

  if (error) throw error;
};

/**
 * Récupérer les événements de plusieurs calendriers
 */
export const getCalendarEventsWithAuth = async (
  userId: string,
  calendarIds: string[],
  maxResults: number = 20,
  windowDays: number = 7
) => {
  const connection = await getGoogleConnectionSafe(userId);
  if (!connection) {
    throw new Error('google_disconnected');
  }

  const now = new Date();
  const alignedNow = new Date(Math.floor(now.getTime() / 60000) * 60000);
  const timeMin = alignedNow.toISOString();
  const timeMax = new Date(alignedNow.getTime() + windowDays * 24 * 60 * 60 * 1000).toISOString();

  const ids = calendarIds.length ? calendarIds : [connection.selectedCalendarId || 'primary'];
  const eventResponses = await Promise.all(
    ids.map((calendarId) =>
      fetchCalendarEvents({ timeMin, timeMax, maxResults, calendarId: calendarId || 'primary' })
    )
  );

  const allEvents = eventResponses.flatMap((response, index) => {
    const calendarId = ids[index] || 'primary';
    return (response.items || []).map((event: any) => ({
      ...event,
      calendarId,
      calendarName: response.summary || 'Calendrier',
    }));
  });

  allEvents.sort((a: any, b: any) => {
    const dateA = new Date(a.start.dateTime || a.start.date);
    const dateB = new Date(b.start.dateTime || b.start.date);
    return dateA.getTime() - dateB.getTime();
  });

  return allEvents.slice(0, maxResults);
};

export const getCalendarEventsForRange = async (
  userId: string,
  calendarIds: string[],
  timeMin: string,
  timeMax: string,
  maxResults: number = 250
) => {
  const connection = await getGoogleConnectionSafe(userId);
  if (!connection) {
    throw new Error('google_disconnected');
  }

  const ids = calendarIds.length ? calendarIds : [connection.selectedCalendarId || 'primary'];
  const eventResponses = await Promise.all(
    ids.map((calendarId) =>
      fetchCalendarEvents({ timeMin, timeMax, maxResults, calendarId: calendarId || 'primary' })
    )
  );

  const allEvents = eventResponses.flatMap((response, index) => {
    const calendarId = ids[index] || 'primary';
    return (response.items || []).map((event: any) => ({
      ...event,
      calendarId,
      calendarName: response.summary || 'Calendrier',
    }));
  });

  allEvents.sort((a: any, b: any) => {
    const dateA = new Date(a.start.dateTime || a.start.date);
    const dateB = new Date(b.start.dateTime || b.start.date);
    return dateA.getTime() - dateB.getTime();
  });

  return allEvents;
};

export const getTasksWithAuth = async (userId: string, taskListId: string) => {
  const connection = await getGoogleConnectionSafe(userId);
  if (!connection) {
    throw new Error('google_disconnected');
  }

  const data = await fetchTasksList(taskListId);
  return data.items || [];
};

export type GoogleTaskStatus = 'needsAction' | 'completed';

export interface GoogleTaskItem {
  id: string;
  title: string;
  status: GoogleTaskStatus;
  completed?: string;
}

export const createTask = async (
  taskListId: string,
  title: string
): Promise<GoogleTaskItem> => {
  const data = await createTaskInList(taskListId, title);
  return {
    id: data.id,
    title: data.title,
    status: data.status,
    completed: data.completed,
  };
};

export const createTaskWithAuth = async (
  userId: string,
  taskListId: string,
  title: string
): Promise<GoogleTaskItem> => {
  const connection = await getGoogleConnectionSafe(userId);
  if (!connection) {
    throw new Error('google_disconnected');
  }

  return createTask(taskListId, title);
};

export const updateTaskStatus = async (
  taskListId: string,
  taskId: string,
  status: GoogleTaskStatus
): Promise<GoogleTaskItem> => {
  const data = await updateTaskInList(taskListId, taskId, status);
  return {
    id: data.id,
    title: data.title,
    status: data.status,
    completed: data.completed,
  };
};

export const updateTaskStatusWithAuth = async (
  userId: string,
  taskListId: string,
  taskId: string,
  status: GoogleTaskStatus
): Promise<GoogleTaskItem> => {
  const connection = await getGoogleConnectionSafe(userId);
  if (!connection) {
    throw new Error('google_disconnected');
  }

  return updateTaskStatus(taskListId, taskId, status);
};
