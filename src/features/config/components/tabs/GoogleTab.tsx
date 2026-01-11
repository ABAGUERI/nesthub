import React, { useEffect, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  getGoogleConnection,
  initiateGoogleOAuth,
  getTaskListsWithAuth,
  GoogleTaskList,
  updateGroceryListSelection,
} from '@/features/google/google.service';
import { useClientConfig } from '@/shared/hooks/useClientConfig';

export const GoogleTab: React.FC = () => {
  const { user } = useAuth();
  const { config, updateConfig } = useClientConfig();
  const [gmail, setGmail] = useState<string | null>(null);
  const [calendarName, setCalendarName] = useState<string | null>(null);
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedListName, setSelectedListName] = useState<string>('Épicerie');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [listsLoading, setListsLoading] = useState(false);
  const [savingList, setSavingList] = useState(false);

  useEffect(() => {
    loadConnection();
  }, [user, config?.googleGroceryListId, config?.googleGroceryListName]);

  const loadConnection = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const connection = await getGoogleConnection(user.id);
      setGmail(connection?.gmailAddress || null);
      setCalendarName(connection?.selectedCalendarName || null);
      setSelectedListId(connection?.groceryListId || config?.googleGroceryListId || null);
      setSelectedListName(connection?.groceryListName || config?.googleGroceryListName || 'Épicerie');
    } catch (err: any) {
      setError(err.message || 'Impossible de récupérer la connexion Google');
    } finally {
      setLoading(false);
    }
  };

  const loadTaskLists = async () => {
    if (!user) return;
    setListsLoading(true);
    setTasksError(null);
    try {
      const lists = await getTaskListsWithAuth(user.id);
      setTaskLists(lists);
    } catch (err: any) {
      const message = err?.message === 'unauthorized'
        ? 'Session expirée : reconnectez-vous via Google'
        : 'Impossible de récupérer vos listes Google Tasks';
      setTasksError(message);
    } finally {
      setListsLoading(false);
    }
  };

  const handleSelectList = async (list: GoogleTaskList) => {
    if (!user) return;
    setSavingList(true);
    setTasksError(null);
    try {
      await updateConfig({
        googleGroceryListId: list.id,
        googleGroceryListName: list.title,
      });
      await updateGroceryListSelection(user.id, list.id, list.title);
      setSelectedListId(list.id);
      setSelectedListName(list.title);
    } catch (err: any) {
      setTasksError(err.message || 'Impossible de sauvegarder la liste');
    } finally {
      setSavingList(false);
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

      <div className="config-card">
        <div className="config-card-header">
          <div>
            <h3>Liste Épicerie Google Tasks</h3>
            <p>Choisissez la liste utilisée par l’écran Cuisine (source unique, pas de duplication).</p>
          </div>
          <Button variant="secondary" onClick={loadTaskLists} isLoading={listsLoading}>
            Charger mes listes
          </Button>
        </div>

        <div className="google-connection">
          <div className="google-row">
            <span className="google-label">Sélection actuelle</span>
            <span className="google-value">{selectedListName || 'Non configurée'}</span>
          </div>
          <div className="google-row">
            <span className="google-label">ID</span>
            <span className="google-value monospace">{selectedListId || '—'}</span>
          </div>
        </div>

        {tasksError && <div className="config-alert error">{tasksError}</div>}

        {listsLoading ? (
          <div className="config-placeholder">Chargement des listes...</div>
        ) : taskLists.length ? (
          <div className="task-list-grid">
            {taskLists.map((list) => (
              <button
                key={list.id}
                className={`task-list-tile ${selectedListId === list.id ? 'active' : ''}`}
                onClick={() => handleSelectList(list)}
                disabled={savingList}
              >
                <div className="task-list-title">{list.title}</div>
                <div className="task-list-id">{list.id}</div>
                {selectedListId === list.id && <span className="task-list-selected">Utilisée</span>}
              </button>
            ))}
          </div>
        ) : (
          <div className="config-placeholder">Cliquez sur “Charger mes listes” pour voir vos listes Google Tasks.</div>
        )}
      </div>
    </div>
  );
};
