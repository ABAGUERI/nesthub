import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/components/Button';
import { GoogleOAuthExchangeError, googleOAuthExchange } from '../google.service';

type UiState = 'idle' | 'processing' | 'success' | 'error';

export const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { supabaseUser, session, loading } = useAuth() as any; // adapte si ton hook expose déjà session
  const [error, setError] = useState<string | null>(null);
  const [uiState, setUiState] = useState<UiState>('idle');

  // Empêche double-run (StrictMode / rerenders)
  const hasRunRef = useRef(false);
  const inFlightRef = useRef(false);

  // Correlation id pour logs (utile si tu compares avec logs edge)
  const fallbackRid = useMemo(() => crypto.randomUUID(), []);

  const redirectUri = useMemo(() => {
    return import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/callback`;
  }, []);

  const cleanUrl = useCallback(() => {
    // Retire les params OAuth pour empêcher tout replay
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
    // Ici tu peux rediriger vers ton bouton / route "connect google"
    // Exemple : /onboarding ou /settings/integrations
    cleanUrl();
    navigate('/onboarding', { replace: true });
  }, [cleanUrl, navigate]);

  const handleCallback = useCallback(async () => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const ridParam = searchParams.get('state');
    const storedRid = sessionStorage.getItem('google_oauth_rid');
    const rid = ridParam || storedRid || fallbackRid;
    const logId = rid;
    const currentUrl = window.location.href;

    if (errorParam) {
      setUiState('error');
      setError(errorDescription ? `Connexion Google annulée: ${errorDescription}` : 'Connexion Google annulée');
      logAndCleanUrl(rid, currentUrl, logId);
      return;
    }

    if (!code) {
      setUiState('error');
      setError('Code OAuth manquant');
      logAndCleanUrl(rid, currentUrl, logId);
      return;
    }

    // Dedupe par code (survit aux remounts / refresh)
    const dedupeKey = `google_oauth_processed_${code}`;
    if (sessionStorage.getItem(dedupeKey)) {
      // Déjà traité : on évite de rappeler l’edge function
      cleanUrl();
      navigate('/onboarding', { replace: true });
      return;
    }
    sessionStorage.setItem(dedupeKey, '1');

    setUiState('processing');
    setError(null);

    try {
      if (inFlightRef.current) {
        return;
      }
      inFlightRef.current = true;

      console.info(`[OAuthCallback:${logId}] exchange start`, {
        rid,
        hasUser: !!supabaseUser,
        hasSession: !!session,
        redirectUri,
        codeLength: code.length,
        currentUrl,
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
  }, [fallbackRid, logAndCleanUrl, navigate, redirectUri, searchParams, session, supabaseUser]);

  useEffect(() => {
    if (loading) return;

    // Important : ne pas lancer tant qu’on n’a pas une session valide.
    // Si ton useAuth ne fournit pas session, garde supabaseUser mais c’est moins robuste.
    if (!supabaseUser || !session) {
      const nextUrl = `/auth/callback${window.location.search}`;
      navigate(`/login?next=${encodeURIComponent(nextUrl)}`, { replace: true });
      return;
    }

    if (hasRunRef.current) return;
    hasRunRef.current = true;

    void handleCallback();
  }, [handleCallback, loading, navigate, session, supabaseUser]);

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
