import { useState, useEffect } from 'react';
import {
  LoginPage,
  OnboardingPage,
  DashboardPage,
  FocusModePage,
  BattlePage,
  PracticeSelectionPage,
} from './pages';
import { useAuth } from './hooks/useAuth';
import './styles/globals.css';
import { FocusProvider, useFocus } from './contexts/FocusContext';
import { FocusOverlay } from './components/focus/FocusOverlay';
import { FocusViolationModal } from './components/focus/FocusViolationModal';
import { PomodoroBreakModal } from './components/onboarding/PomodoroBreakModal';

type AppRoute =
  | 'login'
  | 'onboarding'
  | 'dashboard'
  | 'focus'
  | 'battle'
  | 'practice';

/**
 * AppContent - Inner component that uses Auth and Focus contexts
 */
function AppContent() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('login');
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const { isAuthenticated, isLoading, user } = useAuth();
  const { isActive, violations, maxViolations, resumeFromViolation, stopSession, showViolationModal, isOnBreak, skipBreak, settings } = useFocus();

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

  // Navigation handlers
  const navigateToDashboard = () => setCurrentRoute('dashboard');
  const navigateToFocus = () => setCurrentRoute('focus');
  const navigateToPractice = () => setCurrentRoute('practice');

  return (
    <div className="min-h-screen bg-void relative">
      {/* Violation Modal - Global */}
      {showViolationModal && (
        <FocusViolationModal
          violationCount={violations}
          maxViolations={maxViolations}
          onResume={resumeFromViolation}
          onEndSession={stopSession}
        />
      )}

      {/* Break Modal - Global */}
      {isOnBreak && (
        <PomodoroBreakModal
          onBreakComplete={skipBreak}
          breakMinutes={settings.breakMinutes}
        />
      )}

      {/* Focus Overlay - Visible when active and NOT on focus page */}
      {currentRoute !== 'focus' && isActive && (
        <FocusOverlay onExpand={navigateToFocus} />
      )}

      {/* Route content */}
      {currentRoute === 'login' && <LoginPage />}
      {currentRoute === 'onboarding' && <OnboardingPage onComplete={handleOnboardingComplete} />}
      {currentRoute === 'dashboard' && (
        <DashboardPage
          onNavigateToFocus={navigateToFocus}
          onNavigateToPractice={navigateToPractice}
        />
      )}
      {currentRoute === 'focus' && <FocusModePage onNavigateBack={navigateToDashboard} />}
      {currentRoute === 'battle' && <BattlePage onNavigateBack={navigateToDashboard} />}
      {currentRoute === 'practice' && <PracticeSelectionPage onNavigateBack={navigateToDashboard} />}
    </div>
  );
}

/**
 * App - Root component
 */
function App() {
  return (
    <FocusProvider>
      <AppContent />
    </FocusProvider>
  );
}

export default App;
