import {
  corsHeaders,
  getSupabaseClients,
  jsonResponse,
  refreshGoogleAccessToken,
  shouldRefreshToken,
} from '../_shared/google.ts';

type TaskAction = 'list' | 'createTask' | 'updateTask' | 'createList';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) {
      return jsonResponse(401, { message: 'Unauthorized' });
    }

    const body = await req.json().catch(() => null);
    const action = (body?.action as TaskAction) ?? 'list';

    if (!body?.listId && action !== 'createList') {
      return jsonResponse(400, { message: 'listId requis' });
    }

    if (action === 'createList' && !body?.title) {
      return jsonResponse(400, { message: 'title requis' });
    }

    if (action === 'createTask' && !body?.title) {
      return jsonResponse(400, { message: 'title requis' });
    }

    if (action === 'updateTask' && (!body?.taskId || !body?.status)) {
      return jsonResponse(400, { message: 'taskId et status requis' });
    }

    const { authClient, adminClient } = getSupabaseClients(authHeader);
    const { data: authData, error: authError } = await authClient.auth.getUser();

    if (authError || !authData?.user) {
      return jsonResponse(401, { message: 'Unauthorized' });
    }

    const { data: connection, error: connectionError } = await adminClient
      .from('google_connections')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (connectionError) {
      return jsonResponse(500, { message: 'Erreur de lecture Google' });
    }

    if (!connection) {
      return jsonResponse(409, { message: 'Google non connecté' });
    }

    let accessToken = connection.access_token as string;

    if (shouldRefreshToken(connection.expires_at)) {
      let refreshed;
      try {
        refreshed = await refreshGoogleAccessToken(connection.refresh_token);
      } catch (refreshError) {
        console.error('Refresh token error', refreshError);
        return jsonResponse(401, { message: 'Reconnecter Google' });
      }

      const expiresAt = new Date(Date.now() + refreshed.expiresIn * 1000).toISOString();

      const { error: updateError } = await adminClient
        .from('google_connections')
        .update({
          access_token: refreshed.accessToken,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', authData.user.id);

      if (updateError) {
        return jsonResponse(500, { message: 'Erreur de mise à jour Google' });
      }

      accessToken = refreshed.accessToken;
    }

    const buildRequest = (token: string) => {
      if (action === 'createList') {
        return fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: body.title }),
        });
      }

      if (action === 'createTask') {
        return fetch(`https://tasks.googleapis.com/tasks/v1/lists/${body.listId}/tasks`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: body.title, status: 'needsAction' }),
        });
      }

      if (action === 'updateTask') {
        const payload: Record<string, unknown> = { status: body.status };
        if (body.status === 'completed') {
          payload.completed = new Date().toISOString();
        } else {
          payload.completed = null;
        }

        return fetch(
          `https://tasks.googleapis.com/tasks/v1/lists/${body.listId}/tasks/${body.taskId}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );
      }

      return fetch(`https://tasks.googleapis.com/tasks/v1/lists/${body.listId}/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    };

    let response = await buildRequest(accessToken);

    if (response.status === 401) {
      let refreshed;
      try {
        refreshed = await refreshGoogleAccessToken(connection.refresh_token);
      } catch (refreshError) {
        console.error('Refresh token error', refreshError);
        return jsonResponse(401, { message: 'Reconnecter Google' });
      }

      const expiresAt = new Date(Date.now() + refreshed.expiresIn * 1000).toISOString();

      await adminClient
        .from('google_connections')
        .update({
          access_token: refreshed.accessToken,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', authData.user.id);

      response = await buildRequest(refreshed.accessToken);
    }

    if (!response.ok) {
      if (response.status === 401) {
        return jsonResponse(401, { message: 'Reconnecter Google' });
      }
      const errorText = await response.text();
      return jsonResponse(response.status, { message: errorText });
    }

    const data = await response.json();
    return jsonResponse(200, data);
  } catch (error) {
    console.error('google-tasks-list error', error);
    return jsonResponse(500, { message: 'Erreur interne' });
  }
});
