import { useCallback } from 'react';

// This keeps the export so other files don't break
export const AUTH0_CONNECTIONS = {
  GOOGLE: 'google-oauth2',
};

export const useAuth = () => {
  // We hardcode these to TRUE and FALSE to bypass the login screen
  const isAuthenticated = true;
  const isLoading = false;
  const error = null;

  // Mock user data so the UI has something to display
  const user = {
    name: "Guest Student",
    email: "guest@prepverse.com",
    picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    email_verified: true,
  };

  const loginWithGoogle = useCallback(async () => {
    console.log('Mock login triggered');
  }, []);

  const logout = useCallback(() => {
    console.log('Mock logout triggered');
    window.location.href = '/';
  }, []);

  const getAccessToken = useCallback(async (): Promise<string> => {
    return "mock-access-token";
  }, []);

  return {
    isAuthenticated,
    isLoading,
    user,
    error,
    loginWithGoogle,
    logout,
    getAccessToken,
  };
};

export interface Auth0User {
  sub?: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
  updated_at?: string;
  [key: string]: unknown;
}