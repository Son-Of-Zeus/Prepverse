import React, { useState, useEffect } from 'react';
import { LoginPage, OnboardingPage, DashboardPage } from './pages';
import { useAuth } from './hooks/useAuth';
import './styles/globals.css';

type AppRoute = 'login' | 'onboarding' | 'dashboard';

/**
 * App - Root component with simple routing for demonstration
 *
 * In production, this would use React Router for proper navigation
 */
function App() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('login');
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const { isAuthenticated, isLoading, user } = useAuth();

  // Handle authentication state changes
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // User is authenticated - check onboarding status
        if (user?.onboarding_completed || hasCompletedOnboarding) {
          setCurrentRoute('dashboard');
        } else {
          setCurrentRoute('onboarding');
        }
      } else {
        // User is not authenticated, redirect to login
        setCurrentRoute('login');
      }
    }
  }, [isAuthenticated, isLoading, user, hasCompletedOnboarding]);

  const handleOnboardingComplete = () => {
    setHasCompletedOnboarding(true);
    setCurrentRoute('dashboard');
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-prepverse-red border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void">
      {/* Route content */}
      {currentRoute === 'login' && <LoginPage />}
      {currentRoute === 'onboarding' && <OnboardingPage onComplete={handleOnboardingComplete} />}
      {currentRoute === 'dashboard' && <DashboardPage />}
    </div>
  );
}

export default App;
