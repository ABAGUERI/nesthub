import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/components/Button';
import { supabase } from '@/shared/utils/supabase';
import {
  exchangeCodeForTokens,
  saveGoogleConnection,
  getGoogleUserInfo,
} from '../google.service';

export const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [sessionMissing, setSessionMissing] = useState(false);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
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

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session || !user) {
      setSessionMissing(true);
      setError('Session manquante. Veuillez vous reconnecter.');
      return;
    }

    try {
      // Échanger le code contre des tokens
      const { accessToken, refreshToken, expiresIn } = await exchangeCodeForTokens(code);

      // Récupérer l'email Google
      const gmailAddress = await getGoogleUserInfo(accessToken);

      // Sauvegarder dans Supabase
      await saveGoogleConnection(
        user.id,
        gmailAddress,
        accessToken,
        refreshToken,
        expiresIn
      );

      console.log('✅ Google connecté avec succès');

      // Rediriger vers l'onboarding
      navigate('/onboarding');
    } catch (err: any) {
      console.error('Error handling OAuth callback:', err);
      setError('Connexion Google impossible (session ou permissions).');
    }
  };

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
          <p style={{ color: '#94a3b8' }}>
            {sessionMissing ? 'Veuillez vous reconnecter.' : 'Réessayez dans un instant.'}
          </p>
          {sessionMissing ? (
            <div style={{ marginTop: '16px' }}>
              <Button onClick={() => navigate('/login')} size="large">
                Se connecter
              </Button>
            </div>
          ) : (
            <div style={{ marginTop: '16px' }}>
              <Button onClick={() => navigate('/onboarding')} size="large">
                Retour à l’onboarding
              </Button>
            </div>
          )}
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
            Connexion à Google...
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
