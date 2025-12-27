import React, { useState, useEffect } from 'react';
import { LoginPage, OnboardingPage } from './pages';
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

  // Dev navigation helper
  const DevNav = () => (
    <div className="fixed bottom-4 left-4 z-50 flex gap-2">
      <button
        onClick={() => setCurrentRoute('login')}
        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
          currentRoute === 'login'
            ? 'bg-prepverse-red text-white'
            : 'bg-white/10 text-gray-400 hover:bg-white/20'
        }`}
      >
        Login
      </button>
      <button
        onClick={() => setCurrentRoute('onboarding')}
        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
          currentRoute === 'onboarding'
            ? 'bg-prepverse-red text-white'
            : 'bg-white/10 text-gray-400 hover:bg-white/20'
        }`}
      >
        Onboarding
      </button>
      <button
        onClick={() => setCurrentRoute('dashboard')}
        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
          currentRoute === 'dashboard'
            ? 'bg-prepverse-red text-white'
            : 'bg-white/10 text-gray-400 hover:bg-white/20'
        }`}
      >
        Dashboard
      </button>
    </div>
  );

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
      {/* Dev navigation - remove in production */}
      <DevNav />

      {/* Route content */}
      {currentRoute === 'login' && <LoginPage />}
      {currentRoute === 'onboarding' && <OnboardingPage onComplete={handleOnboardingComplete} />}
      {currentRoute === 'dashboard' && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="font-display text-4xl text-white">Dashboard</h1>
            <p className="text-gray-400">Coming soon...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
