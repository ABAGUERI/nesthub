import React, { useState, useEffect } from 'react';
import { useOnboarding } from '../hooks/useOnboarding';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/components/Button';
import {
  getGoogleConnection,
  getCalendars,
} from '@/features/google/google.service';
import './GoogleStep.css';

interface Calendar {
  id: string;
  name: string;
  description: string;
  backgroundColor: string;
  primary: boolean;
}

export const GoogleStep: React.FC = () => {
  const { user } = useAuth();
  const {
    connectGoogle,
    selectedCalendars,
    setSelectedCalendars,
    completeOnboarding,
    prevStep,
    isLoading,
    error,
    children,
  } = useOnboarding();

  const [googleConnected, setGoogleConnected] = useState(false);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [googleError, setGoogleError] = useState<string | null>(null);

  useEffect(() => {
    checkGoogleConnection();
  }, [user]);

  const checkGoogleConnection = async () => {
    if (!user) return;

    try {
      const connection = await getGoogleConnection(user.id);
      
      if (connection) {
        setGoogleConnected(true);
        await loadCalendars(connection.accessToken);
      }
    } catch (err) {
      console.error('Error checking Google connection:', err);
    }
  };

  const loadCalendars = async (accessToken: string) => {
    setLoadingCalendars(true);
    setGoogleError(null);

    try {
      const cals = await getCalendars(accessToken);
      setCalendars(cals);

      // Pré-sélectionner le calendrier principal
      const primary = cals.find((c) => c.primary);
      if (primary) {
        setSelectedCalendars([primary.id]);
      }
    } catch (err: any) {
      setGoogleError('Erreur lors du chargement des calendriers');
      console.error('Error loading calendars:', err);
    } finally {
      setLoadingCalendars(false);
    }
  };

  const toggleCalendar = (calendarId: string) => {
    if (selectedCalendars.includes(calendarId)) {
      setSelectedCalendars(selectedCalendars.filter((id) => id !== calendarId));
    } else {
      setSelectedCalendars([...selectedCalendars, calendarId]);
    }
  };

  const handleComplete = async () => {
    if (selectedCalendars.length === 0) {
      setGoogleError('Veuillez sélectionner au moins un calendrier');
      return;
    }

    await completeOnboarding();
  };

  // Calculer les noms des listes qui seront créées
  const getTaskListsToCreate = () => {
    const lists = ['📝 Épicerie', '👨‍👩‍👧 Familiale'];
    
    children.forEach((child) => {
      if (child.name.trim()) {
        lists.push(`${child.icon === 'bee' ? '🐝' : '🐞'} Tâches ${child.name}`);
      }
    });
    
    return lists;
  };

  if (!googleConnected) {
    return (
      <div className="google-step">
        <div className="step-header">
          <h2>Connectez votre compte Google</h2>
          <p>Pour synchroniser vos calendriers et tâches</p>
        </div>

        <div className="google-connect-box">
          <div className="google-icon">🔗</div>
          
          <p className="google-description">
            Après connexion, nous créerons automatiquement les listes de tâches suivantes:
          </p>

          <div className="task-lists-preview">
            {getTaskListsToCreate().map((list, index) => (
              <div key={index} className="task-list-item">
                {list}
              </div>
            ))}
          </div>

          <Button
            onClick={connectGoogle}
            fullWidth
            size="large"
          >
            🔗 Connecter Google
          </Button>
        </div>

        <div className="step-actions">
          <Button
            variant="secondary"
            onClick={prevStep}
          >
            ← Retour
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="google-step">
      <div className="step-header">
        <h2>Choisissez vos calendriers</h2>
        <p>Sélectionnez les calendriers à afficher dans votre hub</p>
      </div>

      <div className="google-success-message">
        ✅ Compte Google connecté avec succès!
      </div>

      {loadingCalendars ? (
        <div className="loading-calendars">Chargement des calendriers...</div>
      ) : (
        <>
          <div className="calendars-list">
            {calendars.length === 0 ? (
              <div className="no-calendars">Aucun calendrier trouvé</div>
            ) : (
              calendars.map((calendar) => (
                <div
                  key={calendar.id}
                  className={`calendar-item ${
                    selectedCalendars.includes(calendar.id) ? 'selected' : ''
                  }`}
                  onClick={() => toggleCalendar(calendar.id)}
                >
                  <div className="calendar-checkbox">
                    {selectedCalendars.includes(calendar.id) && <span>✓</span>}
                  </div>
                  
                  <div className="calendar-info">
                    <div className="calendar-name">
                      {calendar.name}
                      {calendar.primary && (
                        <span className="calendar-badge">Principal</span>
                      )}
                    </div>
                    {calendar.description && (
                      <div className="calendar-description">
                        {calendar.description}
                      </div>
                    )}
                  </div>

                  <div
                    className="calendar-color"
                    style={{ backgroundColor: calendar.backgroundColor }}
                  />
                </div>
              ))
            )}
          </div>

          {googleError && (
            <div className="error-message">{googleError}</div>
          )}

          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="step-actions">
            <Button
              variant="secondary"
              onClick={prevStep}
              disabled={isLoading}
            >
              ← Retour
            </Button>

            <Button
              onClick={handleComplete}
              isLoading={isLoading}
              disabled={selectedCalendars.length === 0}
            >
              Terminer ✓
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
