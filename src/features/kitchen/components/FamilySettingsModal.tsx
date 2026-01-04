// src/features/kitchen/components/FamilySettingsModal.tsx
// Modal configuration famille + envies semaine

import React, { useState, useEffect } from 'react';
import type { FamilySettings } from '../types/ai-menu.types';
import { DIETARY_RESTRICTION_LABELS } from '../types/ai-menu.types';
import './FamilySettingsModal.css';

interface FamilySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: FamilySettings) => void;
  initialSettings: FamilySettings;
}

export const FamilySettingsModal: React.FC<FamilySettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSettings,
}) => {
  const [adults, setAdults] = useState(initialSettings.adults);
  const [children, setChildren] = useState(initialSettings.children);
  const [weekCravings, setWeekCravings] = useState('');
  const [restrictions, setRestrictions] = useState<string[]>(initialSettings.restrictions);

  useEffect(() => {
    setAdults(initialSettings.adults);
    setChildren(initialSettings.children);
    setRestrictions(initialSettings.restrictions);
  }, [initialSettings]);

  if (!isOpen) return null;

  const handleSave = () => {
    const settings: FamilySettings = {
      adults,
      children,
      restrictions,
      customRestrictions: [],
      favoriteIngredients: weekCravings ? [weekCravings] : [],
      preferredCuisines: [],
    };
    onSave(settings);
    onClose();
  };

  const toggleRestriction = (restriction: string) => {
    if (restrictions.includes(restriction)) {
      setRestrictions(restrictions.filter(r => r !== restriction));
    } else {
      setRestrictions([...restrictions, restriction]);
    }
  };

  const totalPeople = adults + children;

  return (
    <div className="family-modal-overlay" onClick={onClose}>
      <div className="family-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="family-modal-header">
          <h2 className="family-modal-title">
            <span className="modal-icon">👥</span>
            Configuration famille
          </h2>
          <button className="modal-close-btn" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="family-modal-body">
          {/* Composition famille */}
          <div className="settings-section">
            <h3 className="section-title">Composition</h3>
            <div className="composition-grid">
              <div className="composition-item">
                <label className="composition-label">Adultes</label>
                <select
                  className="composition-select"
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div className="composition-item">
                <label className="composition-label">Enfants</label>
                <select
                  className="composition-select"
                  value={children}
                  onChange={(e) => setChildren(Number(e.target.value))}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="total-people">
              <span className="total-icon">👥</span>
              <span className="total-text">Total : {totalPeople} personnes</span>
            </div>
          </div>

          {/* Envies semaine */}
          <div className="settings-section">
            <h3 className="section-title">✏️ Envies cette semaine</h3>
            <p className="section-help">
              Guider l'IA : saveurs, types de plats, cuisines...
            </p>
            <textarea
              className="cravings-input"
              placeholder="Ex: Italien, épicé, comfort food, cuisine asiatique..."
              value={weekCravings}
              onChange={(e) => setWeekCravings(e.target.value)}
              rows={3}
            />
          </div>

          {/* Restrictions */}
          <div className="settings-section">
            <h3 className="section-title">Restrictions alimentaires</h3>
            <div className="restrictions-grid">
              {Object.entries(DIETARY_RESTRICTION_LABELS).map(([key, label]) => (
                <label key={key} className="restriction-checkbox">
                  <input
                    type="checkbox"
                    checked={restrictions.includes(key)}
                    onChange={() => toggleRestriction(key)}
                  />
                  <span className="checkbox-label">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="family-modal-footer">
          <button className="cancel-btn" onClick={onClose} type="button">
            Annuler
          </button>
          <button className="save-btn" onClick={handleSave} type="button">
            <span className="btn-icon">✅</span>
            <span className="btn-text">Enregistrer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
