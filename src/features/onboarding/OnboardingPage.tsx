import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingLayout } from './components/OnboardingLayout';
import { FamilyStep } from './components/FamilyStep';
import { GoogleStep } from './components/GoogleStep';
import { OnboardingChild, OnboardingNextPayload } from './types';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/utils/supabase';
import { createChild } from '@/shared/utils/children.service';
import {
  createDefaultTaskLists,
  initiateGoogleOAuth,
} from '@/features/google/google.service';

const DEFAULT_CHILDREN: OnboardingChild[] = [
  { name: '', icon: 'bee' },
  { name: '', icon: 'ladybug' },
];

const TOTAL_STEPS = 3;

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshUser } = useAuth();

  // ✅ Source unique de vérité pour l'onboarding
  const [currentStep, setCurrentStep] = useState(1);
  const [children, setChildren] = useState<OnboardingChild[]>(DEFAULT_CHILDREN);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isBusy = loading || hydrating;

  const hydrateOnboardingState = useCallback(async () => {
    if (!user) return;

    setHydrating(true);
    setError(null);

    try {
      // ✅ Re-hydratation DB au mount
      const [childrenResult, googleResult, taskListsResult] = await Promise.all([
        supabase
          .from('family_members')
          .select('first_name, icon')
          .eq('user_id', user.id)
          .eq('role', 'child'),
        supabase
          .from('google_connections')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase.from('task_lists').select('id').eq('user_id', user.id),
      ]);

      if (childrenResult.error) throw childrenResult.error;
      if (googleResult.error) throw googleResult.error;
      if (taskListsResult.error) throw taskListsResult.error;

      const dbChildren = (childrenResult.data || []).map((child) => ({
        name: child.first_name ?? '',
        icon: (child.icon || 'bee') as OnboardingChild['icon'],
      }));

      if (dbChildren.length > 0) {
        setChildren(dbChildren);
      }

      const hasChildren = dbChildren.length > 0;
      const hasGoogleConnection = Boolean(googleResult.data);
      const hasTaskLists = (taskListsResult.data || []).length > 0;

      setGoogleConnected(hasGoogleConnection);

      // ✅ Déterminer l'étape depuis la DB
      if (!hasChildren) {
        setCurrentStep(1);
        return;
      }

      if (!hasGoogleConnection) {
        setCurrentStep(2);
        return;
      }

      if (!hasTaskLists) {
        setCurrentStep(3);
        return;
      }

      // ✅ Onboarding complet : fin propre vers le dashboard
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Erreur lors du chargement onboarding:', err);
      setError('Impossible de charger votre onboarding pour le moment.');
      setCurrentStep(1);
    } finally {
      setHydrating(false);
    }
  }, [navigate, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    void hydrateOnboardingState();
  }, [authLoading, hydrateOnboardingState, user]);

  const saveFamily = useCallback(async () => {
    if (!user) return false;

    setLoading(true);
    setError(null);

    try {
      const validChildren = children.filter((child) => child.name.trim() !== '');

      if (validChildren.length === 0) {
        setError("Veuillez entrer au moins un prénom d'enfant");
        return false;
      }

      for (const child of validChildren) {
        await createChild(user.id, child.name.trim(), child.icon);
      }

      await supabase
        .from('profiles')
        .update({ has_children: validChildren.length > 0 })
        .eq('id', user.id);

      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde des enfants.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [children, user]);

  const completeOnboarding = useCallback(
    async (payload?: OnboardingNextPayload) => {
      if (!user) return;

      const selectedCalendars = payload?.selectedCalendars || [];

      if (!googleConnected) {
        setError('Veuillez connecter votre compte Google');
        return;
      }

      if (selectedCalendars.length === 0) {
        setError('Veuillez sélectionner au moins un calendrier');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // ✅ Idempotent : ne créer les listes que si elles n'existent pas
        const { data: existingTaskLists, error: taskListError } = await supabase
          .from('task_lists')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (taskListError) throw taskListError;

        if (!existingTaskLists || existingTaskLists.length === 0) {
          const childrenNames = children
            .filter((c) => c.name.trim() !== '')
            .map((c) => c.name.trim());

          await createDefaultTaskLists(user.id, childrenNames);
        }

        const { error: calendarError } = await supabase
          .from('google_connections')
          .update({
            selected_calendar_id: selectedCalendars[0],
          })
          .eq('user_id', user.id);

        if (calendarError) throw calendarError;

        const { error: profileError } = await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id);

        if (profileError) throw profileError;

        await refreshUser();
        navigate('/dashboard', { replace: true });
      } catch (err: any) {
        setError(err.message || "Erreur lors de la finalisation de l'onboarding.");
      } finally {
        setLoading(false);
      }
    },
    [children, googleConnected, navigate, refreshUser, user]
  );

  const handleNext = useCallback(
    async (payload?: OnboardingNextPayload) => {
      setError(null);

      if (currentStep === 1) {
        const saved = await saveFamily();
        if (saved) {
          setCurrentStep(2);
        }
        return;
      }

      if (currentStep === 2) {
        // ✅ Ne gère pas l'état ici, on relit depuis la DB au retour OAuth
        initiateGoogleOAuth();
        return;
      }

      if (currentStep === 3) {
        await completeOnboarding(payload);
      }
    },
    [completeOnboarding, currentStep, saveFamily]
  );

  const handleBack = useCallback(() => {
    setError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  }, []);

  const stepContent = useMemo(() => {
    switch (currentStep) {
      case 1:
        return (
          <FamilyStep
            children={children}
            setChildren={setChildren}
            onNext={handleNext}
            onBack={handleBack}
            loading={isBusy}
            error={error}
          />
        );
      case 2:
      case 3:
        return (
          <GoogleStep
            children={children}
            setChildren={setChildren}
            onNext={handleNext}
            onBack={handleBack}
            loading={isBusy}
            error={error}
            googleConnected={googleConnected}
          />
        );
      default:
        return null;
    }
  }, [children, currentStep, error, googleConnected, handleBack, handleNext, isBusy]);

  if (authLoading || !user) {
    return null;
  }

  return (
    <OnboardingLayout currentStep={currentStep} totalSteps={TOTAL_STEPS}>
      {stepContent}
    </OnboardingLayout>
  );
};
