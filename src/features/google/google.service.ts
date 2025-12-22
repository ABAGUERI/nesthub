import { supabase } from '@/shared/utils/supabase';

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
  expiresIn: number
) => {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  // Utiliser upsert avec onConflict pour gérer les doublons
  const { error } = await supabase
    .from('google_connections')
    .upsert(
      {
        user_id: userId,
        gmail_address: gmailAddress,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id', // Spécifier la colonne de conflit
      }
    );

  if (error) throw error;
};

/**
 * Récupérer la connexion Google de l'utilisateur
 */
export const getGoogleConnection = async (userId: string) => {
  const { data, error } = await supabase
    .from('google_connections')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  
  return data ? {
    id: data.id,
    userId: data.user_id,
    gmailAddress: data.gmail_address,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiresAt: data.token_expires_at,
    selectedCalendarId: data.selected_calendar_id,
    selectedCalendarName: data.selected_calendar_name,
    groceryListId: data.grocery_list_id,
    groceryListName: data.grocery_list_name,
  } : null;
};

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

/**
 * Récupérer tous les calendriers Google de l'utilisateur
 */
export const getCalendars = async (accessToken: string) => {
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch calendars');
  }

  const data = await response.json();
  
  return data.items.map((cal: any) => ({
    id: cal.id,
    name: cal.summary,
    description: cal.description || '',
    backgroundColor: cal.backgroundColor,
    primary: cal.primary || false,
  }));
};

/**
 * Créer une liste de tâches Google
 */
export const createTaskList = async (accessToken: string, title: string) => {
  const response = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create task list: ${title}`);
  }

  const data = await response.json();
  
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
  accessToken: string,
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
      const googleList = await createTaskList(accessToken, list.name);
      
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
export const getCalendarEvents = async (
  accessToken: string,
  calendarIds: string[],
  maxResults: number = 20
) => {
  const now = new Date();
  const timeMin = now.toISOString();

  const allEvents: any[] = [];

  // Fetch événements de chaque calendrier
  for (const calendarId of calendarIds) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          calendarId
        )}/events?` +
          new URLSearchParams({
            timeMin,
            singleEvents: 'true',
            orderBy: 'startTime',
            maxResults: maxResults.toString(),
          }),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        console.error(`Failed to fetch events for calendar ${calendarId}`);
        continue;
      }

      const data = await response.json();
      const events = data.items || [];

      // Ajouter le nom du calendrier à chaque événement
      events.forEach((event: any) => {
        allEvents.push({
          ...event,
          calendarId,
          calendarName: data.summary || 'Calendrier', // Nom du calendrier
        });
      });
    } catch (error) {
      console.error(`Error fetching calendar ${calendarId}:`, error);
    }
  }

  // Trier tous les événements par date
  allEvents.sort((a, b) => {
    const dateA = new Date(a.start.dateTime || a.start.date);
    const dateB = new Date(b.start.dateTime || b.start.date);
    return dateA.getTime() - dateB.getTime();
  });

  return allEvents.slice(0, maxResults);
};

/**
 * Récupérer les tâches d'une liste
 */
export const getTasks = async (accessToken: string, taskListId: string) => {
  const response = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch tasks');
  }

  const data = await response.json();
  
  return data.items || [];
};
