import { supabase } from '@/shared/utils/supabase';
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
const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || '';

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
  const requestId = crypto.randomUUID();
  
  authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', GOOGLE_REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', SCOPES);
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent'); // Force l'affichage du consentement
  authUrl.searchParams.append('state', requestId);

  sessionStorage.setItem('google_oauth_rid', requestId);
  console.info('[GoogleOAuth] init', {
    rid: requestId,
    redirectUri: GOOGLE_REDIRECT_URI,
    origin: window.location.origin,
    timestamp: new Date().toISOString(),
  });

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
  redirectUri: string,
  requestId?: string | null
): Promise<GoogleOAuthExchangeResult> => {
  // 1) Forcer récupération session
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (sessionError || !accessToken) {
    return {
      error: 'unauthorized',
      description: 'Session Supabase absente. Reconnecte-toi puis réessaie.',
    };
  }

  // 2) Appeler l’Edge Function en passant le JWT explicitement
  const { data, error } = await supabase.functions.invoke('google-oauth-exchange', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(requestId ? { 'x-request-id': requestId } : {}),
    },
    body: { code, redirectUri, rid: requestId ?? null },
  });

  if (error) {
    return { error: 'supabase_error', description: error.message };
  }

  if (data?.ok) return data as GoogleOAuthExchangeSuccess;

  if (data?.error && data?.description) return data as GoogleOAuthExchangeError;

  return { error: 'unknown_error', description: 'Réponse inattendue du serveur OAuth.' };
};


/**
 * Récupérer la connexion Google de l'utilisateur
 */
export const getGoogleConnection = async (userId: string) => {
  const connection = await getGoogleConnectionSafe(userId);
  if (!connection) return null;

  return {
    id: connection.id,
    userId: connection.userId,
    gmailAddress: connection.gmailAddress,
    selectedCalendarId: connection.selectedCalendarId,
    selectedCalendarName: connection.selectedCalendarName,
    groceryListId: connection.groceryListId,
    groceryListName: connection.groceryListName,
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
  const { error } = await supabase
    .from('google_connections')
    .upsert(
      {
        user_id: userId,
        grocery_list_id: listId,
        grocery_list_name: listName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) throw error;
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

  const createdLists = [];

  // Créer chaque liste dans Google Tasks
  for (const list of listsToCreate) {
    try {
      const googleList = await createTaskList(list.name);
      
      // Sauvegarder dans Supabase
      const { error } = await supabase.from('task_lists').insert({
        user_id: userId,
        google_task_list_id: googleList.id,
        name: googleList.title,
        type: list.type,
      });

      if (error) {
        console.error(`Error saving task list ${list.name}:`, error);
      } else {
        createdLists.push({
          id: googleList.id,
          name: googleList.title,
          type: list.type,
        });
      }
    } catch (error) {
      console.error(`Error creating task list ${list.name}:`, error);
    }
  }

  // Mettre à jour la connexion Google avec l'ID de la liste Épicerie
  const groceryList = createdLists.find((l) => l.type === 'grocery');
  if (groceryList) {
    await supabase
      .from('google_connections')
      .update({
        grocery_list_id: groceryList.id,
        grocery_list_name: groceryList.name,
      })
      .eq('user_id', userId);
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
