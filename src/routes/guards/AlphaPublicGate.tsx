import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

// export const ALPHA_MODE = import.meta.env.VITE_ALPHA_MODE === 'true';
export const ALPHA_MODE = true
// console.log('VITE_ALPHA_MODE', ALPHA_MODE)
interface AlphaPublicGateProps {
  children: ReactNode;
}

/**
 * Guard for restricting access to signup/onboarding in Alpha mode.
 * - If ALPHA_MODE is false: render children normally
 * - If ALPHA_MODE is true: always redirect to /alpha
 */
export function AlphaPublicGate({ children }: AlphaPublicGateProps) {
  // If Alpha mode is disabled, render children directly
  if (!ALPHA_MODE) {
    return <>{children}</>;
  }

  // Always redirect to /alpha in Alpha mode
  return <Navigate to="/alpha" replace />;
}

// Export helper for use in components as fallback check
export const isAlphaMode = () => ALPHA_MODE;
