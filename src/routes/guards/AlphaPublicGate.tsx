import { useState, useEffect, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/shared/utils/supabase';

const ALPHA_MODE = import.meta.env.VITE_ALPHA_MODE === 'true';

interface AlphaPublicGateProps {
  children: ReactNode;
}

/**
 * Guard for restricting access to signup/onboarding in Alpha mode.
 * - If ALPHA_MODE is false: render children normally
 * - If ALPHA_MODE is true:
 *   - Check if user is authenticated via supabase.auth.getSession()
 *   - Show loader while checking
 *   - If authenticated: allow access (render children)
 *   - If not authenticated: redirect to /alpha
 */
export function AlphaPublicGate({ children }: AlphaPublicGateProps) {
  const [checking, setChecking] = useState(ALPHA_MODE);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (!ALPHA_MODE) return;

    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setIsAuthenticated(!!data.session);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setChecking(false);
      }
    };

    checkAuth();
  }, []);

  // If Alpha mode is disabled, render children directly
  if (!ALPHA_MODE) {
    return <>{children}</>;
  }

  // Show minimal loader while checking auth status
  if (checking) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  // If authenticated, allow access
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Not authenticated in Alpha mode - redirect to /alpha
  return <Navigate to="/alpha" replace />;
}

// Export helper for use in components as fallback check
export const isAlphaMode = () => ALPHA_MODE;
