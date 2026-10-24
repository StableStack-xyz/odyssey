// Environment Variables
const BASE_URL = import.meta.env.VITE_REACT_APP_BASE_URL;
const AUTH_BASE_URL = import.meta.env.VITE_REACT_APP_AUTH_BASE_URL;
const WALLET_BASE_URL = import.meta.env.VITE_REACT_APP_WALLET_BASE_URL;
const GATEWAY_URL = (import.meta.env.VITE_REACT_APP_GATEWAY_URL || '').replace(/\/+$/, '');

// In development, hit backend directly (avoids Vite proxy + Render cold start issues)
// In production:
// 1. If VITE_REACT_APP_GATEWAY_URL is provided, call internal-middleware directly from the browser
// 2. Otherwise fall back to /api/* paths handled by Netlify proxy
const isBrowser = typeof window !== 'undefined';
const isDev = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const request = GATEWAY_URL ? `${GATEWAY_URL}/api/base` : (isDev ? BASE_URL : '/api/base');
export const authRequest = GATEWAY_URL ? `${GATEWAY_URL}/api/auth` : (isDev ? AUTH_BASE_URL : '/api/auth');
export const walletRequest = GATEWAY_URL ? `${GATEWAY_URL}/api/wallet` : (isDev ? WALLET_BASE_URL : '/api/wallet');
export const identityRequest = GATEWAY_URL ? `${GATEWAY_URL}/api/identity` : '/api/identity';

// PAGE URL
export const pageURL = import.meta.env.VITE_REACT_APP_FRONTEND_URL;

// Development mode check
export const isDevelopment =
  import.meta.env.VITE_REACT_APP_ENV_MODE === 'development' ||
  import.meta.env.VITE_REACT_APP_ENV_MODE === 'sandbox';
