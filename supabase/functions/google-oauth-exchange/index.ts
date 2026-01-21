import { corsHeaders, getSupabaseClients, jsonResponse } from '../_shared/google.ts';

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  id_token?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) {
      return jsonResponse(401, {
        error: 'unauthorized',
        description: 'Authorization header missing',
      });
    }

    const body = await req.json().catch(() => null);
    const code = body?.code as string | undefined;
    const redirectUri = body?.redirectUri as string | undefined;

    if (!code || !redirectUri) {
      return jsonResponse(400, {
        error: 'invalid_request',
        description: 'code et redirectUri requis',
      });
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return jsonResponse(500, {
        error: 'server_error',
        description: 'Google OAuth secrets manquants',
      });
    }

    const { authClient } = getSupabaseClients(authHeader);
    const { data: authData, error: authError } = await authClient.auth.getUser();

    if (authError || !authData?.user) {
      return jsonResponse(401, {
        error: 'unauthorized',
        description: 'Utilisateur non authentifié',
      });
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.json().catch(() => null);
      console.error('google-oauth-exchange token error', {
        status: tokenResponse.status,
        error: errorBody?.error,
        description: errorBody?.error_description,
      });
      return jsonResponse(tokenResponse.status, {
        error: errorBody?.error ?? 'oauth_error',
        description:
          errorBody?.error_description ?? 'Erreur échange OAuth Google',
      });
    }

    const tokenData = (await tokenResponse.json()) as TokenResponse;
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error('google-oauth-exchange userinfo error', {
        status: userInfoResponse.status,
        message: errorText,
      });
      return jsonResponse(userInfoResponse.status, {
        error: 'userinfo_error',
        description: 'Impossible de récupérer l’email Google',
      });
    }

    const userInfo = await userInfoResponse.json();
    const gmailAddress = userInfo?.email as string | undefined;

    if (!gmailAddress) {
      return jsonResponse(400, {
        error: 'userinfo_error',
        description: 'Email Google introuvable',
      });
    }

    const { error: upsertError } = await authClient.rpc('upsert_google_connection', {
      p_gmail_address: gmailAddress,
      p_access_token: tokenData.access_token,
      p_refresh_token: tokenData.refresh_token ?? null,
      p_expires_at: expiresAt,
      p_scope: tokenData.scope ?? null,
    });

    if (upsertError) {
      console.error('google-oauth-exchange upsert error', upsertError);
      return jsonResponse(500, {
        error: 'server_error',
        description: 'Erreur sauvegarde Google',
      });
    }

    return jsonResponse(200, {
      ok: true,
      gmailAddress,
      scope: tokenData.scope ?? null,
      expiresAt,
    });
  } catch (error) {
    console.error('google-oauth-exchange error', error);
    return jsonResponse(500, {
      error: 'server_error',
      description: 'Erreur interne',
    });
  }
});
