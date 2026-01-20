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
  
  authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', GOOGLE_REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', SCOPES);
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent'); // Force l'affichage du consentement

  // Rediriger vers Google OAuth
  window.location.href = authUrl.toString();
};

/**
 * Échanger le code OAuth contre des tokens
 */
export const exchangeCodeForTokens = async (code: string) => {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens');
  }

  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
};

/**
 * Sauvegarder la connexion Google dans Supabase
 */
export const saveGoogleConnection = async (
  userId: string,
  gmailAddress: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  scope?: string | null
) => {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  const { error } = await supabase.rpc('upsert_google_connection', {
    p_gmail_address: gmailAddress,
    p_access_token: accessToken,
    p_refresh_token: refreshToken,
    p_expires_at: expiresAt.toISOString(),
    p_scope: scope ?? null,
  });

  if (error) throw error;
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

/**
 * Récupérer les informations du profil Google (email)
 */
export const getGoogleUserInfo = async (accessToken: string) => {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get user info');
  }

  const data = await response.json();
  return data.email;
};

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
