import React from 'react';
import { OnboardingProvider, useOnboarding } from './hooks/useOnboarding';
import { OnboardingLayout } from './components/OnboardingLayout';
import { FamilyStep } from './components/FamilyStep';
import { GoogleStep } from './components/GoogleStep';

const OnboardingContent: React.FC = () => {
  const { currentStep } = useOnboarding();

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <FamilyStep />;
      case 2:
        return <GoogleStep />;
      default:
        return <FamilyStep />;
    }
  };

  return (
    <OnboardingLayout>
      {renderStep()}
    </OnboardingLayout>
  );
};

export const OnboardingPage: React.FC = () => {
  return (
    <OnboardingProvider>
      <OnboardingContent />
    </OnboardingProvider>
  );
};
