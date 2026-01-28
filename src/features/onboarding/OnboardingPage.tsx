import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OnboardingLayout } from './components/OnboardingLayout';
import { FamilyStep } from './components/FamilyStep';
import { GoogleStep } from './components/GoogleStep';
import { OnboardingChild, OnboardingNextPayload } from './types';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/utils/supabase';
import { createChild } from '@/shared/utils/children.service';
import {
  createDefaultTaskLists,
  googleOAuthExchange,
  initiateGoogleOAuth,
} from '@/features/google/google.service';

const DEFAULT_CHILDREN: OnboardingChild[] = [
  { name: '', icon: 'bee' },
  { name: '', icon: 'ladybug' },
];

const TOTAL_STEPS = 3;

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, refreshUser } = useAuth();

  // ✅ Source unique de vérité pour l'onboarding
  const [currentStep, setCurrentStep] = useState(1);
  const [children, setChildren] = useState<OnboardingChild[]>(DEFAULT_CHILDREN);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasHydratedRef = useRef<string | null>(null);
  const oauthHandledRef = useRef(false);

  const redirectUri = useMemo(() => {
    return import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/callback`;
  }, []);

  const isBusy = loading || hydrating;
  const logDev = useCallback((message: string, payload?: Record<string, unknown>) => {
    if (import.meta.env.DEV) {
      console.info(`[Onboarding] ${message}`, payload ?? {});
    }
  }, []);

  const cleanOAuthParams = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('scope');
    url.searchParams.delete('authuser');
    url.searchParams.delete('prompt');
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    window.history.replaceState({}, document.title, url.pathname);
  }, []);

  const hydrateOnboardingState = useCallback(async () => {
    if (!user) return;

    if (hasHydratedRef.current === user.id) {
      return;
    }
    hasHydratedRef.current = user.id;

    setHydrating(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      logDev('hydrate start', {
        userId: user.id,
        hasSession: !!sessionData?.session,
        onboardingCompleted: user.onboardingCompleted,
      });

      // ✅ Re-hydratation DB au mount
      const [childrenResult, googleResult, taskListsResult] = await Promise.all([
        supabase
          .from('family_members')
          .select('first_name, icon')
          .eq('user_id', user.id)
          .eq('role', 'child'),
        supabase.rpc('get_google_connection'),
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

      const googleConnection = Array.isArray(googleResult.data) ? googleResult.data[0] : googleResult.data;
      const hasChildren = dbChildren.length > 0;
      const hasGoogleConnection = Boolean(googleConnection);
      const hasTaskLists = (taskListsResult.data || []).length > 0;

      setGoogleConnected(hasGoogleConnection);
      logDev('hydrate result', {
        childrenCount: dbChildren.length,
        googleConnected: hasGoogleConnection,
        taskListsCount: taskListsResult.data?.length ?? 0,
      });

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
  }, [logDev, navigate, user]);

  useEffect(() => {
    if (authLoading || !user) return;

    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    if ((code || errorParam) && !oauthHandledRef.current) {
      return;
    }

    void hydrateOnboardingState();
  }, [authLoading, hydrateOnboardingState, searchParams, user]);

  useEffect(() => {
    if (authLoading || !user) return;

    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (!code && !errorParam) {
      return;
    }

    if (oauthHandledRef.current) {
      return;
    }
    oauthHandledRef.current = true;

    if (errorParam) {
      setError(errorDescription ? `Connexion Google annulée: ${errorDescription}` : 'Connexion Google annulée');
      cleanOAuthParams();
      return;
    }

    const dedupeKey = `google_oauth_processed_${code}`;
    if (sessionStorage.getItem(dedupeKey)) {
      cleanOAuthParams();
      void hydrateOnboardingState();
      return;
    }
    sessionStorage.setItem(dedupeKey, '1');

    setLoading(true);
    setError(null);

    const runExchange = async () => {
      logDev('oauth exchange start', {
        codeLength: code?.length ?? 0,
        redirectUri,
        userId: user.id,
      });

      const result = await googleOAuthExchange(code, redirectUri);

      if (!result?.ok) {
        const errorResult = result as { error: string; description: string };
        setError(`${errorResult.error}: ${errorResult.description}`);
        cleanOAuthParams();
        return;
      }

      logDev('oauth exchange success');
      cleanOAuthParams();
      await hydrateOnboardingState();
    };

    runExchange()
      .catch((err) => {
        console.error('Erreur OAuth onboarding:', err);
        setError('Erreur OAuth: impossible de finaliser la connexion.');
        cleanOAuthParams();
      })
      .finally(() => {
        setLoading(false);
      });
  }, [
    authLoading,
    cleanOAuthParams,
    hydrateOnboardingState,
    logDev,
    redirectUri,
    searchParams,
    user,
  ]);

  useEffect(() => {
    logDev('state change', {
      currentStep,
      childrenCount: children.length,
      googleConnected,
    });
  }, [children.length, currentStep, googleConnected, logDev]);

  useEffect(() => {
    logDev('state change', {
      currentStep,
      childrenCount: children.length,
      googleConnected,
    });
  }, [children.length, currentStep, googleConnected, logDev]);

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
        // ✅ Idempotent : ne créer que les listes manquantes
        const childrenNames = children
          .filter((c) => c.name.trim() !== '')
          .map((c) => c.name.trim());

        await createDefaultTaskLists(user.id, childrenNames);

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
