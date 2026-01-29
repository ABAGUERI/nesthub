import type React from 'react';

export type OnboardingChild = {
  name: string;
  icon: 'bee' | 'ladybug' | 'butterfly' | 'caterpillar';
};

export type OnboardingNextPayload = {
  selectedCalendars?: string[];
};

export type OnboardingStepProps = {
  children: OnboardingChild[];
  setChildren: React.Dispatch<React.SetStateAction<OnboardingChild[]>>;
  onNext: (payload?: OnboardingNextPayload) => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
};
