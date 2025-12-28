import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';

const TOKEN_KEY = 'prepverse_token';

/**
 * Get stored auth token
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Set auth token
 */
export const setAuthToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Clear auth token
 */
export const clearAuthToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

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
 * Uses token-based auth for cross-origin compatibility.
 * Token is stored in localStorage and sent as Bearer token.
 */
export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  /**
   * Check for token in URL (after OAuth callback)
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      setAuthToken(token);
      // Clean the URL
      params.delete('token');
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  /**
   * Check authentication status by calling /auth/me
   * Token is sent as Bearer header via interceptor
   */
  const checkAuth = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      const response = await apiClient.get('/auth/me');
      setState({
        user: response.data,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      // Token invalid or expired
      clearAuthToken();
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  // Check auth on mount (with small delay to allow token capture from URL)
  useEffect(() => {
    const timer = setTimeout(() => {
      checkAuth();
    }, 100);
    return () => clearTimeout(timer);
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
   * Clears local token
   */
  const logout = useCallback(async () => {
    clearAuthToken();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    window.location.href = '/';
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
