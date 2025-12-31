// Exemple d'intégration des icônes tâches dans RotationPanel
// À ajouter dans la section .rotation-wheel-compact

/* Dans ton RotationPanel.tsx existant, ajoute cette structure : */

<div className="rotation-wheel-compact">
  {/* Message verrouillage si applicable */}
  {isLocked && (
    <div className="rotation-locked-message">
      <span className="lock-icon">🔒</span>
      <span>Disponible {nextRotationDay}</span>
    </div>
  )}

  {/* Indicateur tentatives */}
  {!isLocked && (
    <div className={`attempts-indicator ${attemptsUsed >= 3 ? 'exhausted' : ''}`}>
      <span className="attempts-label">Tentatives:</span>
      <div className="attempts-dots">
        <span className={`attempt-dot ${attemptsUsed >= 1 ? 'used' : 'available'}`}>●</span>
        <span className={`attempt-dot ${attemptsUsed >= 2 ? 'used' : 'available'}`}>●</span>
        <span className={`attempt-dot ${attemptsUsed >= 3 ? 'used' : 'available'}`}>●</span>
      </div>
      <span className="attempts-count">({3 - attemptsUsed}/3)</span>
    </div>
  )}

  {/* Cercle de rotation avec MEMBRES (emojis rotatifs doux) */}
  <div className="wheel-circle">
    {familyMembers.map((member, index) => (
      <div
        key={member.id}
        className="wheel-icon"
        style={{
          '--icon-index': index,
          '--total-icons': familyMembers.length,
        } as React.CSSProperties}
      >
        <div 
          className="icon-wrapper"
          style={{
            background: member.avatarUrl 
              ? `url(${member.avatarUrl}) center/cover`
              : 'linear-gradient(135deg, #8b5cf6, #a855f7)'
          }}
        >
          {!member.avatarUrl && (member.icon || member.name.charAt(0))}
        </div>
      </div>
    ))}
    
    {/* NOUVEAU : Icônes TÂCHES avec animation cardiaque */}
    <div className="task-icons-circle">
      <div className="task-icon-wrapper" title="Douche">
        🚿
      </div>
      <div className="task-icon-wrapper" title="Cuisine">
        🍳
      </div>
      <div className="task-icon-wrapper" title="Animaux">
        🐾
      </div>
    </div>
  </div>

  {/* Bouton rotation */}
  {!isLocked && (
    <button
      className="rotate-button-compact"
      onClick={handleRotate}
      disabled={attemptsUsed >= 3 || isSpinning}
      type="button"
    >
      <span style={{ animation: isSpinning ? 'spin 1s linear infinite' : 'none' }}>
        ⟳
      </span>
      {attemptsUsed >= 3 ? (
        <>🔒 3 tentatives utilisées</>
      ) : (
        <>Nouvelle rotation</>
      )}
    </button>
  )}

  {/* Message feedback */}
  {feedbackMessage && (
    <div className={`rotation-feedback ${feedbackType}`}>
      {feedbackMessage}
    </div>
  )}
</div>

/* 
EXPLICATION :
- Les emojis MEMBRES tournent doucement (gentleRotate 20s)
- Les icônes TÂCHES (🚿 🍳 🐾) tournent avec rythme cardiaque (heartbeatRotate 3s)
- Deux animations indépendantes pour un effet visuel riche
- Les icônes tâches sont en overlay sur les membres
*/
