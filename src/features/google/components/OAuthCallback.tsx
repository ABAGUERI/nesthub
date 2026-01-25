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

  // Correlation id pour logs (utile si tu compares avec logs edge)
  const requestId = useMemo(() => crypto.randomUUID(), []);

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
    window.history.replaceState({}, document.title, url.pathname);
  }, []);

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

    if (errorParam) {
      setUiState('error');
      setError(errorDescription ? `Connexion Google annulée: ${errorDescription}` : 'Connexion Google annulée');
      cleanUrl();
      return;
    }

    if (!code) {
      setUiState('error');
      setError('Code OAuth manquant');
      cleanUrl();
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
      console.info(`[OAuthCallback:${requestId}] exchange start`, {
        hasUser: !!supabaseUser,
        hasSession: !!session,
        redirectUri,
        codeLength: code.length,
      });

      const result = await googleOAuthExchange(code, redirectUri);

      if (!result?.ok) {
        const exchangeError = result as GoogleOAuthExchangeError;
        console.error(`[OAuthCallback:${requestId}] exchange failed`, exchangeError);

        setUiState('error');
        setError(`${exchangeError.error}: ${exchangeError.description}`);

        cleanUrl();
        return;
      }

      console.info(`[OAuthCallback:${requestId}] exchange success`);
      setUiState('success');

      cleanUrl();
      navigate('/onboarding', { replace: true });
    } catch (err: any) {
      console.error(`[OAuthCallback:${requestId}] unexpected error`, err);
      setUiState('error');
      setError('Erreur OAuth: impossible de finaliser la connexion.');
      cleanUrl();
    }
  }, [cleanUrl, navigate, redirectUri, requestId, searchParams, session, supabaseUser]);

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
