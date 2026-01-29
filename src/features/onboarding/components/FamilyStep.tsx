import React from 'react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { OnboardingStepProps } from '../types';
import './FamilyStep.css';

type ChildIcon = 'bee' | 'ladybug' | 'butterfly' | 'caterpillar';

export const FamilyStep: React.FC<OnboardingStepProps> = ({
  children,
  setChildren,
  onNext,
  loading,
  error,
}) => {
  const iconOptions: { value: ChildIcon; emoji: string; label: string }[] = [
    { value: 'bee', emoji: '🐝', label: 'Abeille' },
    { value: 'ladybug', emoji: '🐞', label: 'Coccinelle' },
    { value: 'butterfly', emoji: '🦋', label: 'Papillon' },
    { value: 'caterpillar', emoji: '🐛', label: 'Chenille' },
  ];

  const handleNameChange = (index: number, name: string) => {
    const newChildren = [...children];
    newChildren[index].name = name;
    setChildren(newChildren);
  };

  const handleIconChange = (index: number, icon: ChildIcon) => {
    const newChildren = [...children];
    newChildren[index].icon = icon;
    setChildren(newChildren);
  };

  const addChild = () => {
    if (children.length >= 4) return;

    const usedIcons = children.map((c) => c.icon);
    const nextIcon = iconOptions.find((icon) => !usedIcons.includes(icon.value));

    setChildren([
      ...children,
      { name: '', icon: nextIcon?.value || 'bee' },
    ]);
  };

  const removeChild = (index: number) => {
    if (children.length <= 1) return;
    setChildren(children.filter((_, i) => i !== index));
  };

  return (
    <div className="family-step">
      <div className="step-header">
        <h2>Configurez votre famille</h2>
        <p>Entrez les prénoms de vos enfants (1 à 4)</p>
      </div>

      <div className="children-config">
        {children.map((child, index) => (
          <div key={index} className="child-config">
            <div className="child-header">
              <div className="child-number">Enfant {index + 1}</div>
              {children.length > 1 && (
                <button
                  type="button"
                  className="btn-remove-child"
                  onClick={() => removeChild(index)}
                  title="Supprimer cet enfant"
                >
                  ✕
                </button>
              )}
            </div>

            <Input
              label="Prénom"
              placeholder="Prénom"
              value={child.name}
              onChange={(e) => handleNameChange(index, e.target.value)}
            />

            <div className="icon-selector">
              <label className="icon-label">Icône</label>
              <div className="icon-options">
                {iconOptions.map((iconOption) => (
                  <div
                    key={iconOption.value}
                    className={`icon-option ${child.icon === iconOption.value ? 'selected' : ''}`}
                    onClick={() => handleIconChange(index, iconOption.value)}
                  >
                    <div className="icon-image">{iconOption.emoji}</div>
                    <div className="icon-name">{iconOption.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {children.length < 4 && (
          <button
            type="button"
            className="btn-add-child"
            onClick={addChild}
          >
            + Ajouter un enfant
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="step-actions">
        <Button onClick={() => onNext()} isLoading={loading} fullWidth size="large">
          Suivant →
        </Button>
      </div>

      <div className="step-hint">
        💡 Astuce: Vous pouvez ajouter entre 1 et 4 enfants
      </div>
    </div>
  );
};
