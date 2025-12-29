import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCurrentRotation } from '../services/rotation.service';
import { RotationWeek } from '@/shared/types/kitchen.types';

const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' });
};

export const RotationPanel: React.FC = () => {
  const { user } = useAuth();
  const [rotation, setRotation] = useState<RotationWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRotation();
  }, [user]);

  const loadRotation = async () => {
    if (!user) {
      setRotation(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getCurrentRotation(user.id);
      setRotation(data);
    } catch (err) {
      console.error('Rotation loading error', err);
      setError('Rotation non configurée');
      setRotation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRefreshing(true);
    loadRotation().finally(() => setRefreshing(false));
  };

  return (
    <div className="kitchen-card">
      <div className="kitchen-card-header">
        <div>
          <h3>Rotation — semaine du {rotation ? formatDate(rotation.weekStart) : '...'}</h3>
          {rotation && <p className="card-caption">Règle : {rotation.rule ?? 'Rotation hebdomadaire'}</p>}
        </div>
        <button className="ghost-btn" onClick={handleRetry} disabled={refreshing}>
          {refreshing ? '⏳' : '🔄'}
        </button>
      </div>

      {rotation?.adjusted && (
        <div className="rotation-adjusted">
          {rotation.note ? `Rotation ajustée — ${rotation.note}` : 'Rotation ajustée cette semaine'}
        </div>
      )}

      <div className="panel-scroll">
        {loading ? (
          <div className="panel-loading">
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </div>
        ) : error || !rotation ? (
          <div className="panel-empty rotation-empty">
            <p>Rotation non configurée</p>
            <Link className="ghost-btn" to="/config">
              Configurer dans Paramètres
            </Link>
          </div>
        ) : rotation.assignments.length === 0 ? (
          <div className="panel-empty rotation-empty">
            <p>Aucune assignation</p>
            <Link className="ghost-btn" to="/config">
              Configurer la rotation
            </Link>
          </div>
        ) : (
          <div className="rotation-roles">
            {rotation.assignments.map((assignment, index) => (
              <div key={`${assignment.role}-${assignment.assigneeMemberId}-${index}`} className="rotation-row">
                <span className="rotation-role">{assignment.role}</span>
                <div className="rotation-person">
                  {assignment.assigneeAvatarUrl && (
                    <img src={assignment.assigneeAvatarUrl} alt={assignment.assigneeName} className="rotation-avatar" />
                  )}
                  <span className="rotation-name">{assignment.assigneeName}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
