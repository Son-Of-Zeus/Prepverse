import axios, { AxiosInstance } from 'axios';

/**
 * API Client
 *
 * Axios instance configured with:
 * - Base URL from environment variables
 * - Bearer token authentication
 * - Error handling interceptor
 */

// API URL - empty means use relative path (Vite proxy in dev)
const apiUrl = import.meta.env.VITE_API_URL || '';

const TOKEN_KEY = 'prepverse_token';

/**
 * Create axios instance with base configuration
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: `${apiUrl}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

/**
 * Request interceptor to add Bearer token
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
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
      const message = error.response.data?.detail || error.message;

      switch (status) {
        case 401:
          console.error('Session expired - Please log in again');
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
