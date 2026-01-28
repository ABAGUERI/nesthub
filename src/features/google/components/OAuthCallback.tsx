import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/components/Button';
import { GoogleOAuthExchangeError, googleOAuthExchange } from '../google.service';
import { supabase } from '@/shared/utils/supabase';

type UiState = 'idle' | 'processing' | 'success' | 'error';

console.error('🔥 OAuthCallback MODULE LOADED 🔥', window.location.href);

export const OAuthCallback: React.FC = () => {
  console.error('✅ OAuthCallback RENDER', window.location.href);

  React.useEffect(() => {
    console.error('✅ OAuthCallback MOUNTED (useEffect)', window.location.href);
  }, []);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { supabaseUser, session, loading } = useAuth() as any;

  const [error, setError] = useState<string | null>(null);
  const [uiState, setUiState] = useState<UiState>('idle');

  // Empêche double-run (StrictMode / rerenders)
  const hasRunRef = useRef(false);
  const inFlightRef = useRef(false);

  // Correlation id pour logs (utile côté edge)
  const fallbackRid = useMemo(() => crypto.randomUUID(), []);

  const redirectUri = useMemo(() => {
    return import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/callback`;
  }, []);

  const cleanUrl = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('scope');
    url.searchParams.delete('authuser');
    url.searchParams.delete('prompt');
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    url.searchParams.delete('state');
    window.history.replaceState({}, document.title, url.pathname);
  }, []);

  const logAndCleanUrl = useCallback(
    (rid: string | null, beforeUrl: string, logId: string) => {
      cleanUrl();
      console.info(`[OAuthCallback:${logId}] cleanup`, {
        rid,
        before: beforeUrl,
        after: window.location.pathname,
      });
    },
    [cleanUrl]
  );

  const restartGoogleConnect = useCallback(() => {
    cleanUrl();
    navigate('/onboarding', { replace: true });
  }, [cleanUrl, navigate]);

  const handleCallback = useCallback(async () => {
    // Ne traite qu’une seule fois
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const ridParam = searchParams.get('state');
    const storedRid = sessionStorage.getItem('google_oauth_rid');

    const rid = ridParam || storedRid || fallbackRid;
    const logId = rid;
    const currentUrl = window.location.href;

    // Si l’URL est déjà “clean” (pas de code), on n’a rien à faire ici => on sort.
    // IMPORTANT: sinon tu te tires une balle dans le pied après un cleanUrl().
    if (!code && !errorParam) {
      console.info(`[OAuthCallback:${logId}] no code in url -> redirect to onboarding`);
      navigate('/onboarding', { replace: true });
      inFlightRef.current = false;
      return;
    }

    if (errorParam) {
      setUiState('error');
      setError(errorDescription ? `Connexion Google annulée: ${errorDescription}` : 'Connexion Google annulée');
      logAndCleanUrl(rid, currentUrl, logId);
      inFlightRef.current = false;
      return;
    }

    // Dedupe par code (survit aux remounts / refresh)
    const dedupeKey = `google_oauth_processed_${code}`;
    if (sessionStorage.getItem(dedupeKey)) {
      console.info(`[OAuthCallback:${logId}] already processed -> redirect onboarding`);
      cleanUrl();
      navigate('/onboarding', { replace: true });
      inFlightRef.current = false;
      return;
    }
    sessionStorage.setItem(dedupeKey, '1');

    setUiState('processing');
    setError(null);

    try {
      console.info(`[OAuthCallback:${logId}] exchange start`, {
        rid,
        hasUser: !!supabaseUser,
        hasSession: !!session,
        redirectUri,
        codeLength: code.length,
        currentUrl,
        origin: window.location.origin,
        timestamp: new Date().toISOString(),
      });

      const result = await googleOAuthExchange(code, redirectUri, rid);

      if (!result?.ok) {
        const exchangeError = result as GoogleOAuthExchangeError;
        console.error(`[OAuthCallback:${logId}] exchange failed`, exchangeError);

        setUiState('error');
        setError(`${exchangeError.error}: ${exchangeError.description}`);

        logAndCleanUrl(rid, currentUrl, logId);
        return;
      }

      console.info(`[OAuthCallback:${logId}] exchange success`);
      setUiState('success');

      // Clean + redirect hors de /auth/callback
      logAndCleanUrl(rid, currentUrl, logId);
      navigate('/onboarding', { replace: true });
    } catch (err: any) {
      console.error(`[OAuthCallback:${logId}] unexpected error`, err);
      setUiState('error');
      setError('Erreur OAuth: impossible de finaliser la connexion.');
      logAndCleanUrl(rid, currentUrl, logId);
    } finally {
      inFlightRef.current = false;
    }
  }, [
    cleanUrl,
    fallbackRid,
    logAndCleanUrl,
    navigate,
    redirectUri,
    searchParams,
    session,
    supabaseUser,
  ]);

  useEffect(() => {
    if (loading) return;
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    (async () => {
      // Vérifie la session “live” (plus fiable au moment T)
      const { data } = await supabase.auth.getSession();
      const liveSession = data.session;

      if (!liveSession) {
        const nextUrl = `/auth/callback${window.location.search}`;
        navigate(`/login?next=${encodeURIComponent(nextUrl)}`, { replace: true });
        return;
      }

      await handleCallback();
    })();
  }, [handleCallback, loading, navigate]);

  const isLoading = uiState === 'processing' || loading;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#e2e8f0',
      }}
    >
      {uiState === 'error' ? (
        <>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>{error}</h2>
          <p style={{ color: '#94a3b8', maxWidth: 520 }}>
            Tu peux relancer la connexion Google. Si ça persiste, on comparera le requestId côté front avec les logs
            de l’Edge Function pour isoler l’étape qui casse.
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <Button onClick={restartGoogleConnect} size="large">
              Recommencer
            </Button>
            <Button
              onClick={() => {
                cleanUrl();
                navigate('/onboarding', { replace: true });
              }}
              size="large"
              variant="secondary"
            >
              Retour onboarding
            </Button>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'spin 1s linear infinite' }}>🔄</div>
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>
            {isLoading ? 'Connexion en cours…' : 'Connexion à Google...'}
          </h2>
          <p style={{ color: '#94a3b8' }}>
            {uiState === 'success' ? 'Connexion réussie. Redirection…' : 'Veuillez patienter'}
          </p>
        </>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
