import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { getGoogleConnectionSafe, GoogleConnectionSafe } from '@/features/google/google-edge.service';

type GoogleConnectionState = {
  connection: GoogleConnectionSafe | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export const useGoogleConnection = (): GoogleConnectionState => {
  const { user } = useAuth();
  const [connection, setConnection] = useState<GoogleConnectionSafe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setConnection(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getGoogleConnectionSafe(user.id);
      setConnection(data);
      if (!data) {
        setError('Google non connecté.');
      }
    } catch (err) {
      console.error('Erreur lors de la récupération de la connexion Google:', err);
      setError('Impossible de vérifier la connexion Google.');
      setConnection(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { connection, loading, error, refresh };
};
