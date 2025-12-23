import React, { useEffect, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  getGoogleConnection,
  initiateGoogleOAuth,
} from '@/features/google/google.service';

export const GoogleTab: React.FC = () => {
  const { user } = useAuth();
  const [gmail, setGmail] = useState<string | null>(null);
  const [calendarName, setCalendarName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConnection();
  }, [user]);

  const loadConnection = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const connection = await getGoogleConnection(user.id);
      setGmail(connection?.gmailAddress || null);
      setCalendarName(connection?.selectedCalendarName || null);
    } catch (err: any) {
      setError(err.message || 'Impossible de récupérer la connexion Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="config-tab-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Google</p>
          <h2>Adresse Gmail & synchronisation</h2>
          <p className="panel-subtitle">
            Changez le compte Google utilisé pour l’agenda et les tâches. Une reconnexion mettra à jour les tokens et l’adresse Gmail.
          </p>
        </div>
        <Button variant="secondary" onClick={loadConnection} isLoading={loading}>
          Rafraîchir
        </Button>
      </div>

      {error && <div className="config-alert error">{error}</div>}

      <div className="config-card">
        <div className="config-card-header">
          <div>
            <h3>Compte actuel</h3>
            <p>Modifiez l’adresse Gmail et les autorisations en relançant le flow OAuth.</p>
          </div>
        </div>

        {loading ? (
          <div className="config-placeholder">Chargement...</div>
        ) : (
          <div className="google-connection">
            <div className="google-row">
              <span className="google-label">Adresse Gmail</span>
              <span className="google-value">{gmail || 'Aucun compte connecté'}</span>
            </div>
            <div className="google-row">
              <span className="google-label">Calendrier principal</span>
              <span className="google-value">{calendarName || 'Non sélectionné'}</span>
            </div>
          </div>
        )}

        <div className="config-actions">
          <Button onClick={initiateGoogleOAuth} fullWidth size="large">
            Changer de compte Google
          </Button>
        </div>
      </div>
    </div>
  );
};
