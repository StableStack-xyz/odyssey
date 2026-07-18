// Environment Variables
const BASE_URL = import.meta.env.VITE_REACT_APP_BASE_URL;
const AUTH_BASE_URL = import.meta.env.VITE_REACT_APP_AUTH_BASE_URL;
const WALLET_BASE_URL = import.meta.env.VITE_REACT_APP_WALLET_BASE_URL;

// In development, hit backend directly (avoids Vite proxy + Render cold start issues)
// In production, use /api/* paths so Netlify proxy handles routing
const isBrowser = typeof window !== 'undefined';
const isDev = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const request = isDev ? BASE_URL : '/api/base';
export const authRequest = isDev ? AUTH_BASE_URL : '/api/auth';
export const walletRequest = isDev ? WALLET_BASE_URL : '/api/wallet';

// PAGE URL
export const pageURL = import.meta.env.VITE_REACT_APP_FRONTEND_URL;

// Development mode check
export const isDevelopment =
  import.meta.env.VITE_REACT_APP_ENV_MODE === 'development' ||
  import.meta.env.VITE_REACT_APP_ENV_MODE === 'sandbox';
