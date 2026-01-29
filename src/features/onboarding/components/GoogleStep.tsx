import React, { useEffect, useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/components/Button';
import { getGoogleConnection } from '@/features/google/google.service';
import { OnboardingStepProps } from '../types';
import './GoogleStep.css';

interface Calendar {
  id: string;
  name: string;
  description: string;
  backgroundColor: string;
  primary: boolean;
}

interface GoogleStepProps extends OnboardingStepProps {
  googleConnected: boolean;
}

export const GoogleStep: React.FC<GoogleStepProps> = ({
  children,
  onNext,
  onBack,
  loading,
  error,
  googleConnected,
}) => {
  const { user } = useAuth();

  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const logDev = (message: string, payload?: Record<string, unknown>) => {
    if (import.meta.env.DEV) {
      console.info(`[Onboarding:GoogleStep] ${message}`, payload ?? {});
    }
  };

  useEffect(() => {
    if (!user || !googleConnected) return;

    const loadCalendars = async () => {
      setLoadingCalendars(true);
      try {
        const connection = await getGoogleConnection(user.id);

        if (connection) {
          logDev('google connection loaded', {
            gmailAddress: connection.gmailAddress,
            selectedCalendarId: connection.selectedCalendarId,
          });
          setGoogleError(null);
          const calendarId = connection.selectedCalendarId || 'primary';
          const calendarName = connection.selectedCalendarName || 'Calendrier principal';
          setCalendars([
            {
              id: calendarId,
              name: calendarName,
              description: '',
              backgroundColor: '#3b82f6',
              primary: calendarId === 'primary',
            },
          ]);
          setSelectedCalendars([calendarId]);
        } else {
          logDev('google connection missing');
          setGoogleError("Connexion Google introuvable. Réessaie la connexion.");
        }
      } catch (err) {
        console.error('Error checking Google connection:', err);
        setGoogleError("Impossible de récupérer la connexion Google. Réessaie ou reconnecte-toi.");
      } finally {
        setLoadingCalendars(false);
      }
    };

    void loadCalendars();
  }, [googleConnected, user]);

  const toggleCalendar = (calendarId: string) => {
    setGoogleError(null);
    if (selectedCalendars.includes(calendarId)) {
      setSelectedCalendars(selectedCalendars.filter((id) => id !== calendarId));
    } else {
      setSelectedCalendars([...selectedCalendars, calendarId]);
    }
  };

  const handleComplete = () => {
    if (selectedCalendars.length === 0) {
      setGoogleError('Veuillez sélectionner au moins un calendrier');
      return;
    }

    onNext({ selectedCalendars });
  };

  // Calculer les noms des listes qui seront créées
  const getTaskListsToCreate = () => {
    const lists = ['📝 Épicerie', '👨‍👩‍👧 Familiale'];

    const avatarEmoji: Record<'bee' | 'ladybug' | 'butterfly' | 'caterpillar', string> = {
      bee: '🐝',
      ladybug: '🐞',
      butterfly: '🦋',
      caterpillar: '🐛',
    };

    children.forEach((child) => {
      if (child.name.trim()) {
        const emoji = avatarEmoji[child.icon] || '🐝';
        lists.push(`${emoji} Tâches ${child.name}`);
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

          <Button onClick={() => onNext()} fullWidth size="large">
            🔗 Connecter Google
          </Button>
        </div>

        <div className="step-actions">
          <Button variant="secondary" onClick={onBack} disabled={loading}>
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
                      {calendar.primary && <span className="calendar-badge">Principal</span>}
                    </div>
                    {calendar.description && (
                      <div className="calendar-description">{calendar.description}</div>
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

          {googleError && <div className="error-message">{googleError}</div>}

          {error && <div className="error-message">{error}</div>}

          <div className="step-actions">
            <Button variant="secondary" onClick={onBack} disabled={loading}>
              ← Retour
            </Button>

            <Button
              onClick={handleComplete}
              isLoading={loading}
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
