import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { useAuth } from '@/shared/hooks/useAuth';
import { useClientConfig } from '@/shared/hooks/useClientConfig';
import { getOrCreateConfig, upsertConfig } from '@/shared/utils/screenTimeService';
import { getChildren } from '@/shared/utils/children.service';
import type { Child } from '@/shared/types';
import { getAvatarUrl } from '../../services/avatar.service';
import './ScreenTimeTab.css';

interface ScreenTimeChildState {
  childId: string;
  name: string;
  icon: Child['icon'];
  avatarUrl?: string;
  weeklyAllowance: number;
  weekResetDay: number;
  heartsTotal: number;
}

const ICON_OPTIONS: Array<{ value: Child['icon']; emoji: string }> = [
  { value: 'bee', emoji: '🐝' },
  { value: 'ladybug', emoji: '🐞' },
  { value: 'butterfly', emoji: '🦋' },
  { value: 'caterpillar', emoji: '🐛' },
];

const DEFAULT_COLORS: Record<Child['icon'], string> = {
  bee: '#22d3ee',
  ladybug: '#10b981',
  butterfly: '#a855f7',
  caterpillar: '#fb923c',
};

const WEEK_DAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 7, label: 'Dimanche' },
];

export const ScreenTimeTab: React.FC = () => {
  const { user } = useAuth();
  const { config, updateConfig } = useClientConfig();
  const [children, setChildren] = useState<ScreenTimeChildState[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingChildId, setSavingChildId] = useState<string | null>(null);
  const [moduleSaving, setModuleSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const moduleEnabled = config?.moduleScreenTime ?? false;
  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const childrenData = await getChildren(user.id);
      const populated = await Promise.all(
        childrenData.filter((child) => child.role === 'child').map(async (child: Child) => {
          const screenConfig = await getOrCreateConfig(child.id);
          const weeklyAllowance = resolveWeeklyAllowance(screenConfig);
          const heartsTotal = Math.max(1, screenConfig.heartsTotal ?? 5);
          return {
            childId: child.id,
            name: child.firstName,
            icon: child.icon,
            avatarUrl: child.avatarUrl,
            weeklyAllowance,
            weekResetDay: screenConfig.weekResetDay ?? 1,
            heartsTotal,
          };
        })
      );

      setChildren(populated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const resolveWeeklyAllowance = (screenConfig: { weeklyAllowance: number | null; dailyAllowance: number | null }) => {
    if (screenConfig.weeklyAllowance && screenConfig.weeklyAllowance > 0) {
      return screenConfig.weeklyAllowance;
    }

    if (screenConfig.dailyAllowance && screenConfig.dailyAllowance > 0) {
      return screenConfig.dailyAllowance * 7;
    }

    return (config?.screenTimeDefaultAllowance ?? 60) * 7;
  };

  const updateChildState = (childId: string, updates: Partial<ScreenTimeChildState>) => {
    setChildren((prev) => prev.map((child) => (child.childId === childId ? { ...child, ...updates } : child)));
  };

  const handleSaveChild = async (childId: string) => {
    const child = children.find((item) => item.childId === childId);
    if (!child) return;

    if (!Number.isFinite(child.weeklyAllowance) || child.weeklyAllowance <= 0) {
      setError('Le budget hebdomadaire doit être supérieur à 0.');
      return;
    }

    if (!Number.isFinite(child.heartsTotal) || child.heartsTotal <= 0) {
      setError('Le nombre de cœurs doit être supérieur à 0.');
      return;
    }

    setSavingChildId(childId);
    setError(null);
    setSuccessMessage(null);

    try {
      await upsertConfig(childId, {
        weeklyAllowance: child.weeklyAllowance,
        weekResetDay: child.weekResetDay,
        heartsTotal: child.heartsTotal,
        heartsMinutes: null,
        livesEnabled: true,
      });

      setSuccessMessage(`Paramètres enregistrés pour ${child.name}.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
    } finally {
      setSavingChildId(null);
    }
  };

  const handleToggleModule = async (enabled: boolean) => {
    if (!config || moduleSaving) return;
    setModuleSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await updateConfig({ moduleScreenTime: enabled });
      setSuccessMessage(enabled ? 'Module Temps d’écran activé.' : 'Module Temps d’écran désactivé.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
    } finally {
      setModuleSaving(false);
    }
  };

  const hasChildren = children.length > 0;

  const autoMinutesByChild = useMemo(() => {
    const map = new Map<string, number>();
    children.forEach((child) => {
      const heartsTotal = Math.max(1, child.heartsTotal);
      map.set(child.childId, Math.ceil(child.weeklyAllowance / heartsTotal));
    });
    return map;
  }, [children]);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  return (
    <div className="config-tab-panel screen-time-tab">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Temps d’écran</p>
          <h2>Gérez le budget hebdomadaire et les cœurs</h2>
          <p className="panel-subtitle">Tout est calculé automatiquement par semaine, sans cron.</p>
        </div>
      </div>

      <div className="config-card">
        <div className="screen-time-toggle">
          <div>
            <h3>Activer Temps d’écran</h3>
            <p>Activez le suivi manuel depuis les tâches du jour.</p>
          </div>
          <div className="role-toggle" aria-label="Activer Temps d’écran">
            <button
              type="button"
              className={`role-btn ${moduleEnabled ? 'active' : ''}`}
              onClick={() => handleToggleModule(true)}
              disabled={moduleSaving}
            >
              Activé
            </button>
            <button
              type="button"
              className={`role-btn ${!moduleEnabled ? 'active' : ''}`}
              onClick={() => handleToggleModule(false)}
              disabled={moduleSaving}
            >
              Désactivé
            </button>
          </div>
        </div>
      </div>

      <div className="config-card">
        <div className="config-card-header">
          <h3>Paramètres par enfant</h3>
          <p>Budget hebdomadaire, jour de reset et conversion en cœurs.</p>
        </div>

        {loading && <div className="config-placeholder">Chargement des paramètres...</div>}
        {!loading && !hasChildren && <div className="config-placeholder">Aucun enfant configuré.</div>}

        {!loading && hasChildren && (
          <div className="screen-time-children">
            {children.map((child) => (
              <div key={child.childId} className="screen-time-child-card">
                <div className="screen-time-card-header">
                  <div
                    className="screen-time-avatar"
                    style={{ '--child-color': DEFAULT_COLORS[child.icon] } as React.CSSProperties}
                  >
                    {child.avatarUrl ? (
                      <img
                        src={getAvatarUrl(child.avatarUrl) || ''}
                        alt={`Avatar de ${child.name}`}
                        className="screen-time-avatar-img"
                      />
                    ) : (
                      <span className="screen-time-avatar-emoji">
                        {ICON_OPTIONS.find((option) => option.value === child.icon)?.emoji ?? getInitials(child.name)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4>{child.name}</h4>
                    <p>Réglez le budget et la conversion en cœurs.</p>
                  </div>
                </div>

                <div className="screen-time-grid">
                  <Input
                    label="Budget hebdomadaire (minutes)"
                    type="number"
                    min={1}
                    value={child.weeklyAllowance}
                    onChange={(event) =>
                      updateChildState(child.childId, { weeklyAllowance: Number(event.target.value) })
                    }
                  />

                  <div className="screen-time-field">
                    <label htmlFor={`week-reset-${child.childId}`}>Jour de reset</label>
                    <select
                      id={`week-reset-${child.childId}`}
                      value={child.weekResetDay}
                      onChange={(event) =>
                        updateChildState(child.childId, { weekResetDay: Number(event.target.value) })
                      }
                    >
                      {WEEK_DAYS.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="Nombre de cœurs"
                    type="number"
                    min={1}
                    value={child.heartsTotal}
                    onChange={(event) =>
                      updateChildState(child.childId, { heartsTotal: Number(event.target.value) })
                    }
                  />
                </div>

                <div className="screen-time-hint">
                  1 ❤️ = {autoMinutesByChild.get(child.childId)} minutes (calcul automatique)
                </div>

                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => handleSaveChild(child.childId)}
                  isLoading={savingChildId === child.childId}
                  fullWidth
                >
                  Enregistrer
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="config-alert error">{error}</div>}
      {successMessage && <div className="config-alert success">{successMessage}</div>}
    </div>
  );
};
