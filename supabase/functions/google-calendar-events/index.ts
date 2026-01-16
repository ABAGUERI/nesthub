import {
  corsHeaders,
  getSupabaseClients,
  jsonResponse,
  refreshGoogleAccessToken,
  shouldRefreshToken,
} from '../_shared/google.ts';

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
    if (!body?.timeMin || !body?.timeMax) {
      return jsonResponse(400, { message: 'timeMin et timeMax requis' });
    }

    const { authClient, adminClient } = getSupabaseClients(authHeader);
    const { data: authData, error: authError } = await authClient.auth.getUser();

    if (authError || !authData?.user) {
      return jsonResponse(401, { message: 'Unauthorized' });
    }

    const { data: connection, error: connectionError } = await adminClient
      .from('google_connections')
      .select('access_token, refresh_token, expires_at, selected_calendar_id')
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

    const calendarId = body.calendarId || connection.selected_calendar_id || 'primary';

    const query = new URLSearchParams({
      timeMin: body.timeMin,
      timeMax: body.timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    if (body.maxResults) {
      query.set('maxResults', String(body.maxResults));
    }

    const fetchEvents = async (token: string) =>
      fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          calendarId
        )}/events?${query.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

    let response = await fetchEvents(accessToken);

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

      response = await fetchEvents(refreshed.accessToken);
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
    console.error('google-calendar-events error', error);
    return jsonResponse(500, { message: 'Erreur interne' });
  }
});
