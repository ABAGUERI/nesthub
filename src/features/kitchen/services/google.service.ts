import { supabase } from '@/shared/utils/supabase';

export type GoogleTaskStatus = 'needsAction' | 'completed';

export interface GoogleTaskItem {
  id: string;
  title: string;
  status: GoogleTaskStatus;
  completed?: string;
}

export interface GoogleConnection {
  id: string;
  userId: string;
  gmailAddress: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  groceryListId?: string;
}

export const getGoogleConnection = async (userId: string): Promise<GoogleConnection | null> => {
  try {
    const { data, error } = await supabase
      .from('google_connections')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      gmailAddress: data.gmail_address,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      groceryListId: data.grocery_list_id,
    };
  } catch (err) {
    console.error('Failed to get Google connection:', err);
    return null;
  }
};

const refreshTokenIfNeeded = async (userId: string): Promise<string> => {
  try {
    const connection = await getGoogleConnection(userId);
    if (!connection) throw new Error('unauthorized');

    const expiresAt = new Date(connection.expiresAt);
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000;

    if (expiresAt.getTime() - now.getTime() > fiveMinutes) {
      return connection.accessToken;
    }

    console.log('Refreshing token...');

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
        refresh_token: connection.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) throw new Error('unauthorized');

    const tokens = await response.json();
    const newExpiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

    const { error: updateError } = await supabase
      .from('google_connections')
      .update({
        access_token: tokens.access_token,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to save refreshed token:', updateError);
      throw new Error('unauthorized');
    }

    console.log('Token refreshed successfully');
    return tokens.access_token;
  } catch (err) {
    console.error('Token refresh error:', err);
    throw new Error('unauthorized');
  }
};

export const getTasksWithAuth = async (
  userId: string,
  taskListId: string
): Promise<GoogleTaskItem[]> => {
  try {
    const accessToken = await refreshTokenIfNeeded(userId);

    const response = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?maxResults=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 401) throw new Error('unauthorized');
    if (!response.ok) throw new Error('Failed to fetch tasks');

    const data = await response.json();
    return (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      completed: item.completed,
    }));
  } catch (err) {
    console.error('Get tasks error:', err);
    throw err;
  }
};

export const createTaskWithAuth = async (
  userId: string,
  taskListId: string,
  title: string
): Promise<GoogleTaskItem> => {
  try {
    const accessToken = await refreshTokenIfNeeded(userId);

    const response = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, status: 'needsAction' }),
      }
    );

    if (response.status === 401) throw new Error('unauthorized');
    if (!response.ok) throw new Error('Failed to create task');

    const data = await response.json();
    return { id: data.id, title: data.title, status: data.status, completed: data.completed };
  } catch (err) {
    console.error('Create task error:', err);
    throw err;
  }
};

export const updateTaskStatusWithAuth = async (
  userId: string,
  taskListId: string,
  taskId: string,
  status: GoogleTaskStatus
): Promise<GoogleTaskItem> => {
  try {
    const accessToken = await refreshTokenIfNeeded(userId);

    const body: any = { status };
    if (status === 'completed') body.completed = new Date().toISOString();

    const response = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (response.status === 401) throw new Error('unauthorized');
    if (!response.ok) throw new Error('Failed to update task');

    const data = await response.json();
    return { id: data.id, title: data.title, status: data.status, completed: data.completed };
  } catch (err) {
    console.error('Update task error:', err);
    throw err;
  }
};
