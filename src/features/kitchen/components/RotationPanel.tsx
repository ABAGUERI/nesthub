import React, { useEffect, useState } from 'react';
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
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const data = await getCurrentRotation(user.id);
      setRotation(data);
    } catch (err) {
      console.error('Rotation loading error', err);
      setError('Rotation non configurée');
    } finally {
      setLoading(false);
    }
  };

  const renderAssignments = (assignments: RotationAssignment[]) => {
    if (!assignments.length) {
      return <div className="panel-empty">Rotation non configurée</div>;
    }

    return (
      <div className="rotation-roles">
        {assignments.map((assignment) => (
          <div key={`${assignment.role}-${assignment.assigneeMemberId}`} className="rotation-row">
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

  return (
    <div className="kitchen-card">
      <div className="kitchen-card-header">
        <div>
          <p className="card-kicker">Famille</p>
          <h3>Rotation — semaine du {rotation ? formatDate(rotation.weekStart) : '...'}</h3>
        </div>
        <button className="ghost-btn" onClick={loadRotation} aria-label="Rafraîchir la rotation">
          🔄
        </button>
      </div>

      {loading ? (
        <div className="panel-loading">
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
          <div className="skeleton-line" />
        </div>
      ) : error || !rotation ? (
        <div className="panel-empty">Rotation non configurée</div>
      ) : (
        renderAssignments(rotation.assignments)
      )}
    </div>
  );
};
