import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

/**
 * User profile returned from the backend
 */
export interface User {
  id: string;
  email: string;
  full_name?: string;
  class_level: number;
  school_id?: string | null;
  onboarding_completed: boolean;
  total_questions_attempted: number;
  correct_answers: number;
  accuracy: number;
  xp?: number;
  created_at: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Custom Auth Hook
 *
 * Uses server-side OAuth with HTTP-only cookies.
 * No client-side token management required.
 */
export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  /**
   * Check authentication status by calling /auth/me
   * Cookie is automatically sent by the browser
   */
  const checkAuth = useCallback(async () => {
    try {
      const response = await apiClient.get('/auth/me');
      setState({
        user: response.data,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      // 401 is expected when not logged in
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  /**
   * Initiate Google OAuth login
   * Redirects to backend login endpoint which handles the OAuth flow
   * Uses relative URL to go through Vite proxy in dev
   */
  const loginWithGoogle = useCallback(() => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    window.location.href = `${apiUrl}/api/v1/auth/login`;
  }, []);

  /**
   * Log out the current user
   * Calls backend to clear session cookie
   */
  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      window.location.href = '/';
    }
  }, []);

  return {
    // Auth state
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    user: state.user,
    error: state.error,

    // Auth methods
    loginWithGoogle,
    logout,
    refetchUser: checkAuth,
  };
};
