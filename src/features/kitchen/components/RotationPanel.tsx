import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCurrentRotation, generateNextWeekRotation } from '../services/rotation.service';
import { RotationWeek } from '@/shared/types/kitchen.types';

// Catégories simplifiées pour la roue indicative
const CATEGORIES = [
  { id: 'cuisine', name: 'Cuisine', icon: '👨‍🍳', color: 'cuisine-icon' },
  { id: 'salle-bain', name: 'Salle de Bain', icon: '🚿', color: 'salle-bain-icon' },
  { id: 'animaux', name: 'Animaux', icon: '🐾', color: 'animaux-icon' }
];

export const RotationPanel: React.FC = () => {
  const { user } = useAuth();
  const [rotation, setRotation] = useState<RotationWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadRotation();
  }, [user]);

  const loadRotation = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getCurrentRotation(user.id);
      setRotation(data);
    } catch (err) {
      console.error('Rotation load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRotate = async () => {
    if (!user || rotating) return;
    
    setRotating(true);
    
    // Animation de roue qui ralentit : 2 secondes
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      setGenerating(true);
      await generateNextWeekRotation(user.id);
      await loadRotation();
    } catch (err) {
      console.error('Rotation failed:', err);
    } finally {
      setRotating(false);
      setGenerating(false);
    }
  };

  const formatWeek = (isoDate: string): string => {
    const date = new Date(isoDate);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  // Tableau : tâches uniques × membres - 1 assignation par tâche maximum
  const taskTable = useMemo(() => {
    if (!rotation?.assignments || rotation.assignments.length === 0) return null;

    // Extraire tâches uniques (dédupliquer par nom de rôle)
    const uniqueTasks = Array.from(
      new Set(rotation.assignments.map(a => a.role))
    ).sort();

    // Extraire tous les membres uniques
    const membersMap = new Map<string, { name: string; avatarUrl?: string }>();
    rotation.assignments.forEach(assignment => {
      if (!membersMap.has(assignment.assigneeMemberId)) {
        membersMap.set(assignment.assigneeMemberId, {
          name: assignment.assigneeName,
          avatarUrl: assignment.assigneeAvatarUrl
        });
      }
    });

    const members = Array.from(membersMap.entries())
      .map(([id, info]) => ({ id, ...info }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Créer la matrice d'assignation : Map<taskName, memberId>
    // ⚠️ IMPORTANT : 1 tâche = 1 membre SEULEMENT (première assignation trouvée)
    const assignmentMatrix = new Map<string, string>();
    
    rotation.assignments.forEach(assignment => {
      // Si cette tâche n'a pas encore d'assignation, on la garde
      if (!assignmentMatrix.has(assignment.role)) {
        assignmentMatrix.set(assignment.role, assignment.assigneeMemberId);
      }
      // Sinon on ignore (c'est un doublon dans la base de données)
    });

    return { uniqueTasks, members, assignmentMatrix };
  }, [rotation]);

  return (
    <div className="kitchen-card-enhanced">
      <div className="card-header">
        <div>
          <h2 className="card-title">Rotation des tâches</h2>
          <p className="card-subtitle">
            {rotation ? `Semaine du ${formatWeek(rotation.weekStart)}` : 'Chargement...'}
          </p>
        </div>
        <button 
          className="ghost-btn" 
          onClick={loadRotation} 
          disabled={loading}
          type="button"
        >
          {loading ? '⏳' : '🔄'}
        </button>
      </div>

      {/* Roue compacte avec animation réaliste */}
      <div className="rotation-wheel-compact">
        <div className={`wheel-circle ${rotating ? 'spinning' : ''}`}>
          {CATEGORIES.map((category, index) => (
            <div 
              key={category.id} 
              className="wheel-icon"
              style={{
                '--icon-index': index,
                '--total-icons': CATEGORIES.length
              } as React.CSSProperties}
            >
              <div className={`icon-wrapper ${category.color}-martial`}>
                {category.icon}
              </div>
            </div>
          ))}
        </div>

        <button 
          className="rotate-button-compact"
          onClick={handleRotate}
          disabled={rotating || !user}
          type="button"
        >
          {rotating ? (
            <>
              <span style={{ display: 'inline-block', animation: 'spinIcon 1s linear infinite' }}>⟳</span>
              Rotation...
            </>
          ) : generating ? (
            'Génération...'
          ) : (
            '⟳ Nouvelle rotation'
          )}
        </button>
      </div>

      {/* Tableau des tâches officielles */}
      <div className="rotation-tasks-table-container">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px 0' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-line" style={{ height: '48px', borderRadius: '10px' }}></div>
            ))}
          </div>
        ) : taskTable ? (
          <>
            <div style={{ 
              fontSize: '13px', 
              color: '#94a3b8', 
              fontWeight: '700', 
              marginBottom: '12px',
              padding: '0 4px'
            }}>
              Tâches officielles — {taskTable.uniqueTasks.length} tâches
            </div>
            
            <div className="task-table" style={{
              gridTemplateColumns: `2fr repeat(${taskTable.members.length}, 1fr)`
            }}>
              {/* En-tête du tableau */}
              <div className="table-header" style={{
                gridTemplateColumns: `2fr repeat(${taskTable.members.length}, 1fr)`
              }}>
                <div className="header-cell task-name-header">Tâche</div>
                {taskTable.members.map(member => (
                  <div key={member.id} className="header-cell member-header">
                    {member.avatarUrl ? (
                      <img 
                        src={member.avatarUrl} 
                        alt={member.name}
                        className="header-avatar"
                        title={member.name}
                      />
                    ) : (
                      <div className="header-avatar-placeholder" title={member.name}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="header-name">{member.name}</span>
                  </div>
                ))}
              </div>

              {/* Lignes du tableau */}
              <div className="table-body">
                {taskTable.uniqueTasks.map((task, taskIndex) => (
                  <div key={taskIndex} className="table-row" style={{
                    gridTemplateColumns: `2fr repeat(${taskTable.members.length}, 1fr)`
                  }}>
                    <div className="table-cell task-name-cell">
                      {task}
                    </div>
                    {taskTable.members.map(member => {
                      const assignedMemberId = taskTable.assignmentMatrix.get(task);
                      const isAssigned = assignedMemberId === member.id;
                      return (
                        <div key={member.id} className="table-cell member-cell">
                          {isAssigned ? (
                            <div className="assignment-badge">✓</div>
                          ) : (
                            <div className="empty-badge">—</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            flex: 1,
            color: '#94a3b8',
            textAlign: 'center',
            padding: '40px 20px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📋</div>
            <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>
              Aucune rotation configurée
            </div>
            <div style={{ fontSize: '12px' }}>
              Cliquez sur "Nouvelle rotation" pour commencer
            </div>
          </div>
        )}
      </div>
    </div>
  );
};