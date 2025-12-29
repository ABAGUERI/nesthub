import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCurrentRotation, RotationAssignment, RotationWeek } from '../services/rotation.service';

const formatDate = (isoDate: string) => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('fr-CA', {
    day: 'numeric',
    month: 'long',
  });
};

export const RotationPanel: React.FC = () => {
  const { user } = useAuth();
  const [rotation, setRotation] = useState<RotationWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const renderAssignments = (assignments: RotationAssignment[]) => {
    if (!assignments.length) {
      return null;
    }

    return (
      <div className="rotation-roles" role="list">
        {assignments.map((assignment) => (
          <div key={`${assignment.role}-${assignment.assigneeMemberId}`} className="rotation-row" role="listitem">
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
    );
  };

  const assignmentCount = rotation?.assignments.length ?? 0;
  const ruleLabel = rotation?.rule ?? 'Rotation hebdomadaire (lundi)';

  return (
    <div className="kitchen-card">
      <div className="kitchen-card-header">
        <div>
          <p className="card-kicker">Famille</p>
          <h3>Rotation — semaine du {rotation ? formatDate(rotation.weekStart) : '...'}</h3>
          {rotation && <p className="card-caption">Règle : {ruleLabel}</p>}
        </div>
        <button className="ghost-btn" onClick={loadRotation} aria-label="Rafraîchir la rotation">
          🔄
        </button>
      </div>

      {rotation?.adjusted || rotation?.note ? (
        <p className="rotation-adjusted">{rotation.note ? `Rotation ajustée — ${rotation.note}` : 'Rotation ajustée cette semaine'}</p>
      ) : null}

      <div className="panel-scroll">
        {loading ? (
          <div className="panel-loading">
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
            <div className="skeleton-line" />
          </div>
        ) : error || !rotation ? (
          <div className="panel-empty rotation-empty">
            <p>Rotation non configurée</p>
            <Link className="ghost-btn" to="/config">
              Configurer dans Paramètres
            </Link>
          </div>
        ) : assignmentCount === 0 ? (
          <div className="panel-empty rotation-empty">
            <p>Rotation non configurée</p>
            <Link className="ghost-btn" to="/config">
              Configurer dans Paramètres
            </Link>
          </div>
        ) : (
          <div className="rotation-board" aria-label="Tâches en rotation">
            {renderAssignments(rotation.assignments)}
          </div>
        )}
      </div>
    </div>
  );
};
