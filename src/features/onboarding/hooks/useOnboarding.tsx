import { useState, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { createChild } from '@/shared/utils/children.service';
import { supabase } from '@/shared/utils/supabase';
import {
  initiateGoogleOAuth,
  createDefaultTaskLists,
  getGoogleConnection,
} from '@/features/google/google.service';

interface OnboardingContextType {
  currentStep: number;
  totalSteps: number;
  
  // Étape 1: Famille
  children: Array<{ name: string; icon: 'bee' | 'ladybug' }>;
  setChildren: (children: Array<{ name: string; icon: 'bee' | 'ladybug' }>) => void;
  
  // Étape 2: Google
  googleConnected: boolean;
  selectedCalendars: string[];
  setSelectedCalendars: (calendars: string[]) => void;
  
  // Navigation
  nextStep: () => Promise<void>;
  prevStep: () => void;
  
  // Actions
  saveFamily: () => Promise<void>;
  connectGoogle: () => void;
  completeOnboarding: () => Promise<void>;
  
  // État
  isLoading: boolean;
  error: string | null;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({
  children: childrenProp,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;
  
  // State Étape 1: Famille
  const [children, setChildren] = useState<Array<{ name: string; icon: 'bee' | 'ladybug' }>>([
    { name: '', icon: 'bee' },
    { name: '', icon: 'ladybug' },
  ]);
  
  // State Étape 2: Google
  const [googleConnected, setGoogleConnected] = useState(false);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);
  
  // État général
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sauvegarder la famille (enfants) dans la DB
   */
  const saveFamily = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Filtrer les enfants avec un nom
      const validChildren = children.filter((child) => child.name.trim() !== '');

      if (validChildren.length === 0) {
        throw new Error('Veuillez entrer au moins un prénom d\'enfant');
      }

      // Créer les enfants dans la DB
      for (const child of validChildren) {
        await createChild(user.id, child.name.trim(), child.icon);
      }

      // Mettre à jour le profil
      await supabase
        .from('profiles')
        .update({ has_children: validChildren.length > 0 })
        .eq('id', user.id);

      console.log('✅ Famille sauvegardée');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Connecter Google OAuth
   */
  const connectGoogle = () => {
    // Sauvegarder l'étape actuelle dans sessionStorage
    // pour revenir après le callback OAuth
    sessionStorage.setItem('onboarding_step', currentStep.toString());
    sessionStorage.setItem('onboarding_children', JSON.stringify(children));
    
    // Lancer OAuth
    initiateGoogleOAuth();
  };

  /**
   * Compléter l'onboarding
   */
  const completeOnboarding = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Vérifier que Google est connecté
      const googleConnection = await getGoogleConnection(user.id);
      if (!googleConnection) {
        throw new Error('Veuillez connecter votre compte Google');
      }

      // Créer automatiquement les listes de tâches
      const childrenNames = children
        .filter((c) => c.name.trim() !== '')
        .map((c) => c.name.trim());

      await createDefaultTaskLists(
        user.id,
        googleConnection.accessToken,
        childrenNames
      );

      // Sauvegarder les calendriers sélectionnés
      if (selectedCalendars.length > 0) {
        await supabase
          .from('google_connections')
          .update({
            selected_calendar_id: selectedCalendars[0], // Premier = principal
          })
          .eq('user_id', user.id);
      }

      // Marquer l'onboarding comme complété
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      console.log('✅ Onboarding terminé');

      // Rediriger vers le dashboard
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Passer à l'étape suivante
   */
  const nextStep = async () => {
    setError(null);

    // Validation selon l'étape
    if (currentStep === 1) {
      // Valider que au moins 1 enfant a un nom
      const validChildren = children.filter((c) => c.name.trim() !== '');
      if (validChildren.length === 0) {
        setError('Veuillez entrer au moins un prénom d\'enfant');
        return;
      }

      // Sauvegarder la famille
      try {
        await saveFamily();
        setCurrentStep(currentStep + 1);
      } catch (err) {
        // Erreur déjà gérée dans saveFamily
      }
    } else if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  /**
   * Revenir à l'étape précédente
   */
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        totalSteps,
        children,
        setChildren,
        googleConnected,
        selectedCalendars,
        setSelectedCalendars,
        nextStep,
        prevStep,
        saveFamily,
        connectGoogle,
        completeOnboarding,
        isLoading,
        error,
      }}
    >
      {childrenProp}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
