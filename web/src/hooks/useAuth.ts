import { useAuth0 } from '@auth0/auth0-react';
import { useCallback } from 'react';
import { AUTH0_CONNECTIONS } from '../lib/auth0';

/**
 * Custom Auth Hook
 *
 * Wraps Auth0's useAuth0 hook with application-specific logic
 * Provides a simplified interface for authentication operations
 */
export const useAuth = () => {
  const {
    isAuthenticated,
    isLoading,
    user,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
    error,
  } = useAuth0();

  /**
   * Initiate Google OAuth login
   * Redirects user to Google sign-in page
   */
  const loginWithGoogle = useCallback(async () => {
    try {
      await loginWithRedirect({
        authorizationParams: {
          connection: AUTH0_CONNECTIONS.GOOGLE,
          // Ensure we request the necessary scopes
          scope: 'openid profile email offline_access',
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, [loginWithRedirect]);

  /**
   * Log out the current user
   * Redirects to the home page after logout
   */
  const logout = useCallback(() => {
    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }, [auth0Logout]);

  /**
   * Get the current access token
   * Automatically handles token refresh if needed
   *
   * @returns Promise resolving to the access token
   * @throws Error if unable to get token
   */
  const getAccessToken = useCallback(async (): Promise<string> => {
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        },
      });
      return token;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }, [getAccessTokenSilently]);

  return {
    // Auth state
    isAuthenticated,
    isLoading,
    user,
    error,

    // Auth methods
    loginWithGoogle,
    logout,
    getAccessToken,
  };
};

/**
 * Type definition for the user object returned by Auth0
 */
export interface Auth0User {
  sub?: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
  updated_at?: string;
  [key: string]: unknown;
}
