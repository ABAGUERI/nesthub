import React from 'react';
import { useOnboarding } from '../hooks/useOnboarding';
import './OnboardingLayout.css';

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({ children }) => {
  const { currentStep, totalSteps } = useOnboarding();

  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="onboarding-container">
      <div className="onboarding-content">
        {/* Header avec progression */}
        <div className="onboarding-header">
          <h1 className="onboarding-title">Configuration de votre Hub</h1>
          
          <div className="step-indicator">
            <div className="step-text">
              Étape {currentStep} sur {totalSteps}
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Contenu de l'étape actuelle */}
        <div className="onboarding-step-content">
          {children}
        </div>
      </div>
    </div>
  );
};
