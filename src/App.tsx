import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/shared/hooks/useAuth';
import { ClientConfigProvider } from '@/shared/hooks/useClientConfig';
import { SignupForm } from '@/features/auth/components/SignupForm';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { OAuthCallback } from '@/features/google/components/OAuthCallback';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { ConfigPage } from '@/features/config/ConfigPage';
import { KitchenPage } from '@/features/kitchen/KitchenPage';
import { FinancePage } from '@/features/finance/FinancePage';
import { ChildSelectionProvider } from '@/features/dashboard/contexts/ChildSelectionContext';
import { AppLayout } from '@/shared/layouts/AppLayout';
import '@/styles/global.css';

// Composant pour protéger les routes authentifiées
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Composant pour rediriger si déjà connecté
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Chargement...</div>;
  }

  if (user) {
    // Si l'user est connecté mais n'a pas terminé l'onboarding, rediriger vers onboarding
    if (!user.onboardingCompleted) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Composant pour vérifier si l'onboarding est nécessaire
const OnboardingRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si l'onboarding est déjà complété, rediriger vers dashboard
  if (user.onboardingCompleted) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Routes publiques */}
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <SignupForm />
          </PublicRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginForm />
          </PublicRoute>
        }
      />

      {/* Route OAuth callback */}
      <Route
        path="/auth/callback"
        element={<OAuthCallback />}
      />

      {/* Routes protégées */}
      <Route
        path="/verify-email"
        element={
          <div className="page-container">
            <h1>Vérifiez votre email</h1>
            <p>Un email de vérification a été envoyé à votre adresse.</p>
          </div>
        }
      />
      
      <Route
        path="/onboarding"
        element={
          <OnboardingRoute>
            <OnboardingPage />
          </OnboardingRoute>
        }
      />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/kitchen"
        element={
          <ProtectedRoute>
            <AppLayout>
              <KitchenPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/config"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ConfigPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/finances"
        element={
          <ProtectedRoute>
            <AppLayout>
              <FinancePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Redirection par défaut */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ClientConfigProvider>
          <ChildSelectionProvider>
            <AppRoutes />
          </ChildSelectionProvider>
        </ClientConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
