import React from 'react';
import { useOnboarding } from '../hooks/useOnboarding';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import './FamilyStep.css';

export const FamilyStep: React.FC = () => {
  const { children, setChildren, nextStep, isLoading, error } = useOnboarding();

  const handleNameChange = (index: number, name: string) => {
    const newChildren = [...children];
    newChildren[index].name = name;
    setChildren(newChildren);
  };

  const handleIconChange = (index: number, icon: 'bee' | 'ladybug') => {
    const newChildren = [...children];
    newChildren[index].icon = icon;
    setChildren(newChildren);
  };

  return (
    <div className="family-step">
      <div className="step-header">
        <h2>Configurez votre famille</h2>
        <p>Entrez les prénoms de vos enfants (maximum 2)</p>
      </div>

      <div className="children-config">
        {children.map((child, index) => (
          <div key={index} className="child-config">
            <div className="child-number">Enfant {index + 1}</div>
            
            <Input
              label="Prénom"
              placeholder={index === 0 ? 'Sifaw' : 'Lucas'}
              value={child.name}
              onChange={(e) => handleNameChange(index, e.target.value)}
            />

            <div className="icon-selector">
              <label className="icon-label">Icône</label>
              <div className="icon-options">
                <div
                  className={`icon-option ${child.icon === 'bee' ? 'selected' : ''}`}
                  onClick={() => handleIconChange(index, 'bee')}
                >
                  <div className="icon-image">🐝</div>
                  <div className="icon-name">Abeille</div>
                </div>
                
                <div
                  className={`icon-option ${child.icon === 'ladybug' ? 'selected' : ''}`}
                  onClick={() => handleIconChange(index, 'ladybug')}
                >
                  <div className="icon-image">🐞</div>
                  <div className="icon-name">Coccinelle</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      <div className="step-actions">
        <Button
          onClick={nextStep}
          isLoading={isLoading}
          fullWidth
          size="large"
        >
          Suivant →
        </Button>
      </div>

      <div className="step-hint">
        💡 Astuce: Si vous n'avez qu'un seul enfant, laissez le deuxième champ vide
      </div>
    </div>
  );
};
