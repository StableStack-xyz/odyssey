import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { authRequest, walletRequest, request } from './baseUrl';

// Create axios instances for each service
export const authApi = axios.create({
  baseURL: authRequest,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const walletApi = axios.create({
  baseURL: walletRequest,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const baseApi = axios.create({
  baseURL: request,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
const addAuthToken = (config: InternalAxiosRequestConfig) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

// Get token from sessionStorage (encrypted)
function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;

  const encrypted = sessionStorage.getItem('admin_token');
  if (!encrypted) return null;

  try {
    // Simple base64 decode for now - will enhance with proper encryption later
    return atob(encrypted);
  } catch {
    return null;
  }
}

// Response interceptor for error handling
const handleAuthError = (error: AxiosError) => {
  if (error.response?.status === 401) {
    // Clear auth state and redirect to login
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_user');
    window.location.href = '/login';
  }
  return Promise.reject(error);
};

// Apply interceptors
authApi.interceptors.request.use(addAuthToken);
authApi.interceptors.response.use((res) => res, handleAuthError);

walletApi.interceptors.request.use(addAuthToken);
walletApi.interceptors.response.use((res) => res, handleAuthError);

baseApi.interceptors.request.use(addAuthToken);
baseApi.interceptors.response.use((res) => res, handleAuthError);

// Helper to get error message
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || 'An error occurred';
  }
  return error instanceof Error ? error.message : 'An unknown error occurred';
};
