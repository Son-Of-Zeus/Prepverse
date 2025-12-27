import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage, OnboardingPage, DashboardPage, PracticePage, PracticeSession, PracticeResults } from './pages';
import { useAuth } from './hooks/useAuth';
import './styles/globals.css';

/**
 * App - Root component with React Router for navigation
 */
function App() {
  const { isAuthenticated, isLoading, user, refetchUser } = useAuth();

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

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-void">
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

          {/* Default Redirect */}
          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
