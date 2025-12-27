import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

/**
 * Callback Page
 *
 * Handles the Auth0 redirect after authentication
 * Shows a loading state while Auth0 processes the authentication result
 */
export const CallbackPage: React.FC = () => {
  const { error, isLoading } = useAuth0();

  useEffect(() => {
    // Log any authentication errors
    if (error) {
      console.error('Authentication error:', error);
    }
  }, [error]);

  if (error) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-4">
            {/* Error icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>

            {/* Error message */}
            <h1 className="font-display text-3xl text-white">
              Authentication Failed
            </h1>
            <p className="text-gray-400 text-lg">
              {error.message || 'An error occurred during authentication'}
            </p>

            {/* Return button */}
            <button
              onClick={() => window.location.replace('/')}
              className="mt-8 px-6 py-3 bg-prepverse-red hover:bg-prepverse-red-dark text-white rounded-lg font-medium transition-colors"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="text-center space-y-6">
        {/* Animated loading spinner */}
        <div className="flex justify-center">
          <div className="relative">
            {/* Outer ring */}
            <div className="w-20 h-20 border-4 border-white/10 rounded-full" />
            {/* Spinning ring */}
            <div className="absolute inset-0 w-20 h-20 border-4 border-prepverse-red border-t-transparent rounded-full animate-spin" />
            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 bg-prepverse-red rounded-full animate-pulse" />
            </div>
          </div>
        </div>

        {/* Loading text */}
        <div className="space-y-2">
          <h2 className="font-display text-2xl text-white">
            {isLoading ? 'Authenticating...' : 'Redirecting...'}
          </h2>
          <p className="text-gray-400">
            Please wait while we complete your sign-in
          </p>
        </div>

        {/* Decorative line with dots */}
        <div className="flex items-center justify-center gap-2 pt-4">
          <div className="w-2 h-2 bg-prepverse-red rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-prepverse-red rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
          <div className="w-2 h-2 bg-prepverse-red rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
        </div>
      </div>
    </div>
  );
};

export default CallbackPage;
