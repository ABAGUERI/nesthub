import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/components/Button';
import { GoogleOAuthExchangeError, googleOAuthExchange } from '../google.service';

export const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { supabaseUser, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const redirectUri = useMemo(() => {
    return import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/callback`;
  }, []);

  const handleCallback = useCallback(async () => {
    // Récupérer le code OAuth depuis l'URL
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('Connexion Google annulée');
      setTimeout(() => navigate('/onboarding'), 2000);
      return;
    }

    if (!code) {
      setError('Code OAuth manquant');
      setTimeout(() => navigate('/onboarding'), 2000);
      return;
    }

    try {
      const result = await googleOAuthExchange(code, redirectUri);
      if (!result?.ok) {
        const exchangeError = result as GoogleOAuthExchangeError;
        setError(`${exchangeError.error}: ${exchangeError.description}`);
        return;
      }

      console.log('✅ Google connecté avec succès');

      // Rediriger vers l'onboarding
      navigate('/onboarding');
    } catch (err: any) {
      console.error('Error handling OAuth callback:', err);
      setError('Erreur OAuth: impossible de finaliser la connexion.');
    }
  }, [navigate, redirectUri, searchParams]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!supabaseUser) {
      const nextUrl = `/auth/callback${window.location.search}`;
      navigate(`/login?next=${encodeURIComponent(nextUrl)}`, { replace: true });
      return;
    }

    handleCallback();
  }, [handleCallback, loading, navigate, supabaseUser]);

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
      {error ? (
        <>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>{error}</h2>
          <p style={{ color: '#94a3b8' }}>Réessayez dans un instant.</p>
          <div style={{ marginTop: '16px' }}>
            <Button onClick={() => navigate('/onboarding')} size="large">
              Retour à l’onboarding
            </Button>
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              fontSize: '48px',
              marginBottom: '16px',
              animation: 'spin 1s linear infinite',
            }}
          >
            🔄
          </div>
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>
            {loading ? 'Connexion en cours…' : 'Connexion à Google...'}
          </h2>
          <p style={{ color: '#94a3b8' }}>Veuillez patienter</p>
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
