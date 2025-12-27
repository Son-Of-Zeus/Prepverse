import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { LoginPage, OnboardingPage, DashboardPage, PracticePage, PracticeSession, BattlePage, PracticeSelectionPage } from './pages';
import { PracticeResults } from './pages/PracticeResults';
import { DiscussionFeed } from './pages/DiscussionFeed';
import { DiscussionThread } from './pages/DiscussionThread';
import { FocusModePage } from './pages/FocusMode';
import { useAuth } from './hooks/useAuth';
import './styles/globals.css';
import { FocusProvider, useFocus } from './contexts/FocusContext';
import { FocusOverlay } from './components/focus/FocusOverlay';
import { FocusViolationModal } from './components/focus/FocusViolationModal';
import { PomodoroBreakModal } from './components/onboarding/PomodoroBreakModal';
import { useNavigate } from 'react-router-dom';

/**
 * AppContent - Inner component with routing and Focus context
 */
function AppContent() {
  const { isAuthenticated, isLoading, user, refetchUser } = useAuth();
  const { isActive, violations, maxViolations, resumeFromViolation, stopSession, showViolationModal, isOnBreak, skipBreak, settings } = useFocus();
  const location = useLocation();
  const navigate = useNavigate();

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

  const handleOnboardingComplete = () => {
    refetchUser();
  };

  // Check if we're on the focus page
  const isOnFocusPage = location.pathname === '/focus';

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
      {!isOnFocusPage && isActive && (
        <FocusOverlay onExpand={() => navigate('/focus')} />
      )}

      {/* Routes */}
      <Routes>
        {/* Public Route */}
        <Route
          path="/login"
          element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />}
        />

        {/* Protected Routes */}
        <Route
          path="/onboarding"
          element={
            isAuthenticated
              ? (user?.onboarding_completed ? <Navigate to="/dashboard" /> : <OnboardingPage onComplete={handleOnboardingComplete} />)
              : <Navigate to="/login" />
          }
        />

        <Route
          path="/dashboard"
          element={
            isAuthenticated
              ? (user?.onboarding_completed ? <DashboardPage /> : <Navigate to="/onboarding" />)
              : <Navigate to="/login" />
          }
        />

        <Route
          path="/practice"
          element={
            isAuthenticated
              ? (user?.onboarding_completed ? <PracticePage /> : <Navigate to="/onboarding" />)
              : <Navigate to="/login" />
          }
        />

        {/* Dynamic Route for Practice Session */}
        <Route
          path="/practice/session/:id"
          element={
            isAuthenticated
              ? (user?.onboarding_completed ? <PracticeSession /> : <Navigate to="/onboarding" />)
              : <Navigate to="/login" />
          }
        />

        <Route
          path="/practice/results"
          element={
            isAuthenticated
              ? (user?.onboarding_completed ? <PracticeResults /> : <Navigate to="/onboarding" />)
              : <Navigate to="/login" />
          }
        />

        {/* Focus Mode Route */}
        <Route
          path="/focus"
          element={
            isAuthenticated
              ? (user?.onboarding_completed ? <FocusModePage onNavigateBack={() => navigate('/dashboard')} /> : <Navigate to="/onboarding" />)
              : <Navigate to="/login" />
          }
        />

        {/* Battle Route */}
        <Route
          path="/battle"
          element={
            isAuthenticated
              ? (user?.onboarding_completed ? <BattlePage onNavigateBack={() => navigate('/dashboard')} /> : <Navigate to="/onboarding" />)
              : <Navigate to="/login" />
          }
        />

        {/* Practice Selection Route */}
        <Route
          path="/practice-selection"
          element={
            isAuthenticated
              ? (user?.onboarding_completed ? <PracticeSelectionPage onNavigateBack={() => navigate('/dashboard')} /> : <Navigate to="/onboarding" />)
              : <Navigate to="/login" />
          }
        />

        {/* Discussion Routes */}
        <Route
          path="/discussion"
          element={
            isAuthenticated
              ? (user?.onboarding_completed ? <DiscussionFeed /> : <Navigate to="/onboarding" />)
              : <Navigate to="/login" />
          }
        />
        <Route
          path="/discussion/:id"
          element={
            isAuthenticated
              ? (user?.onboarding_completed ? <DiscussionThread /> : <Navigate to="/onboarding" />)
              : <Navigate to="/login" />
          }
        />

        {/* Default Redirect */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />}
        />
      </Routes>
    </div>
  );
}

/**
 * App - Root component with FocusProvider and Router
 */
function App() {
  return (
    <BrowserRouter>
      <FocusProvider>
        <AppContent />
      </FocusProvider>
    </BrowserRouter>
  );
}

export default App;
