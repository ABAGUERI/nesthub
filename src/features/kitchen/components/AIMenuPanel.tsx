import React, { useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { generateAIMenu } from '../services/ai-menu.service';
import type { AIMenuRequest, AIGeneratedMenu } from '../types/ai-menu.types';

export const AIMenuPanel: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [menu, setMenu] = useState<AIGeneratedMenu | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // État du formulaire
  const [familySize, setFamilySize] = useState(4);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(2);
  const [budget, setBudget] = useState(200);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState('');
  const [preferences, setPreferences] = useState('');

  const handleGenerate = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    const request: AIMenuRequest = {
      familySize,
      adults,
      children,
      budget,
      restrictions,
      dislikes: dislikes.split(',').map(s => s.trim()).filter(Boolean),
      preferences: preferences.split(',').map(s => s.trim()).filter(Boolean),
    };
    
    const response = await generateAIMenu(user.id, request);
    
    if (response.success && response.menu) {
      setMenu(response.menu);
      setShowForm(false);
      
      if (response.cached) {
        console.log('✨ Menu chargé du cache');
      } else if (response.usage) {
        console.log(`💰 Coût: $${response.usage.cost.toFixed(4)}`);
      }
    } else {
      setError(response.error || 'Erreur lors de la génération');
    }
    
    setLoading(false);
  };

  const toggleRestriction = (restriction: string) => {
    setRestrictions(prev => 
      prev.includes(restriction)
        ? prev.filter(r => r !== restriction)
        : [...prev, restriction]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  return (
    <div className="kitchen-card-enhanced ai-menu-card">
      <div className="card-header">
        <div>
          <h2 className="card-title">🤖 Menu IA</h2>
          <p className="card-subtitle">
            {menu ? 'Menu généré' : 'Générateur intelligent de menus'}
          </p>
        </div>
        {menu && (
          <button 
            className="ghost-btn"
            onClick={() => setShowForm(true)}
            type="button"
          >
            🔄 Nouveau
          </button>
        )}
      </div>

      {!menu && !showForm && (
        <div className="ai-menu-intro">
          <div className="ai-intro-icon">✨</div>
          <h3>Génération automatique de menu</h3>
          <p>L'IA crée un menu hebdomadaire complet adapté à votre famille :</p>
          <ul className="ai-features-list">
            <li>✅ 7 jours de repas équilibrés</li>
            <li>✅ Budget respecté</li>
            <li>✅ Restrictions alimentaires</li>
            <li>✅ Liste d'épicerie incluse</li>
          </ul>
          <button
            className="ai-generate-btn"
            onClick={() => setShowForm(true)}
            type="button"
          >
            ✨ Générer mon menu
          </button>
        </div>
      )}

      {showForm && (
        <div className="ai-menu-form">
          <div className="form-group">
            <label>Famille</label>
            <div className="family-inputs">
              <input
                type="number"
                placeholder="Adultes"
                value={adults}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setAdults(val);
                  setFamilySize(val + children);
                }}
                min="1"
                max="10"
              />
              <input
                type="number"
                placeholder="Enfants"
                value={children}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setChildren(val);
                  setFamilySize(adults + val);
                }}
                min="0"
                max="10"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Budget hebdomadaire</label>
            <div className="budget-input">
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(parseInt(e.target.value) || 0)}
                min="50"
                max="1000"
                step="10"
              />
              <span className="currency">$ CAD</span>
            </div>
          </div>

          <div className="form-group">
            <label>Restrictions alimentaires</label>
            <div className="restrictions-grid">
              {['Végétarien', 'Sans gluten', 'Sans lactose', 'Halal', 'Casher'].map(r => (
                <button
                  key={r}
                  className={`restriction-tag ${restrictions.includes(r) ? 'active' : ''}`}
                  onClick={() => toggleRestriction(r)}
                  type="button"
                >
                  {restrictions.includes(r) ? '✓ ' : ''}{r}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>N'aiment pas (séparé par virgules)</label>
            <input
              type="text"
              placeholder="brocoli, poisson, champignons"
              value={dislikes}
              onChange={(e) => setDislikes(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Préférences (séparé par virgules)</label>
            <input
              type="text"
              placeholder="cuisine italienne, plats rapides"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
            />
          </div>

          {error && (
            <div className="ai-error">
              ⚠️ {error}
            </div>
          )}

          <div className="form-actions">
            <button
              className="ai-generate-btn"
              onClick={handleGenerate}
              disabled={loading}
              type="button"
            >
              {loading ? (
                <>
                  <span className="spinner">⟳</span>
                  Génération en cours...
                </>
              ) : (
                '✨ Générer le menu'
              )}
            </button>
            {menu && (
              <button
                className="ghost-btn"
                onClick={() => setShowForm(false)}
                type="button"
              >
                Annuler
              </button>
            )}
          </div>
        </div>
      )}

      {menu && !showForm && (
        <div className="ai-menu-result">
          {/* En-tête résumé */}
          <div className="menu-summary">
            <div className="summary-item">
              <span className="summary-label">Période</span>
              <span className="summary-value">
                {new Date(menu.weekStart).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                {' - '}
                {new Date(menu.weekEnd).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Budget</span>
              <span className="summary-value">{formatCurrency(menu.totalCost)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Repas</span>
              <span className="summary-value">{menu.days.length} jours</span>
            </div>
          </div>

          {/* Jours de la semaine */}
          <div className="menu-days">
            {menu.days.map((day) => (
              <div key={day.date} className="menu-day-card">
                <div className="day-header">
                  <span className="day-name">{day.dayName}</span>
                  <span className="day-date">
                    {new Date(day.date).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                
                {day.meals.soir && (
                  <div className="meal-card">
                    <div className="meal-header">
                      <h4 className="meal-name">{day.meals.soir.name}</h4>
                      <span className="meal-cost">{formatCurrency(day.meals.soir.estimatedCost)}</span>
                    </div>
                    <p className="meal-description">{day.meals.soir.description}</p>
                    <div className="meal-meta">
                      <span className="meal-time">⏱️ {day.meals.soir.prepTime} min</span>
                      <span className={`meal-difficulty ${day.meals.soir.difficulty}`}>
                        {day.meals.soir.difficulty}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Liste d'épicerie */}
          <div className="grocery-section">
            <h3>🛒 Liste d'épicerie</h3>
            {menu.groceryList.map((category) => (
              <div key={category.category} className="grocery-category">
                <h4 className="category-name">{category.category}</h4>
                <ul className="grocery-items">
                  {category.items.map((item, idx) => (
                    <li key={idx} className="grocery-item">
                      <span className="item-name">{item.name}</span>
                      <span className="item-quantity">{item.quantity}</span>
                      <span className="item-cost">{formatCurrency(item.estimatedCost)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Conseils */}
          {menu.tips && menu.tips.length > 0 && (
            <div className="tips-section">
              <h3>💡 Conseils</h3>
              <ul className="tips-list">
                {menu.tips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
