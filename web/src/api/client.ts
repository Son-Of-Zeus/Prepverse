import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

/**
 * API Client
 *
 * Axios instance configured with:
 * - Base URL from environment variables
 * - Authentication interceptor to add Bearer tokens
 * - Error handling interceptor
 */

// Validate API URL
const apiUrl = import.meta.env.VITE_API_URL;

if (!apiUrl) {
  throw new Error(
    'Missing VITE_API_URL environment variable. Please check your .env file'
  );
}

/**
 * Create axios instance with base configuration
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

/**
 * Token getter function
 * This will be set by the app to provide the current access token
 */
let getAccessToken: (() => Promise<string>) | null = null;

/**
 * Set the token getter function
 * Should be called during app initialization with a function that returns the access token
 *
 * @param tokenGetter - Function that returns a promise resolving to the access token
 */
export const setTokenGetter = (tokenGetter: () => Promise<string>) => {
  getAccessToken = tokenGetter;
};

/**
 * Request interceptor
 * Automatically adds Bearer token to all requests
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Only add token if we have a token getter function
    if (getAccessToken) {
      try {
        const token = await getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Failed to get access token:', error);
        // Continue with request even if token fetch fails
        // The API will return 401 if authentication is required
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor
 * Handles common error cases
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle specific error cases
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;

      switch (status) {
        case 401:
          console.error('Unauthorized - Please log in again');
          // Could trigger a re-authentication flow here
          break;
        case 403:
          console.error('Forbidden - You do not have permission');
          break;
        case 404:
          console.error('Resource not found');
          break;
        case 500:
          console.error('Server error - Please try again later');
          break;
        default:
          console.error(`API Error (${status}):`, message);
      }
    } else if (error.request) {
      console.error('Network error - Please check your connection');
    } else {
      console.error('Request error:', error.message);
    }

    return Promise.reject(error);
  }
);

/**
 * API Error type
 */
export interface ApiError {
  message: string;
  status?: number;
  data?: unknown;
}
