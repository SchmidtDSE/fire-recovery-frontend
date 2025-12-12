/**
 * API Configuration
 * Handles environment-based API URL selection
 */

// Backend URLs per environment
const BACKEND_URLS = {
  local: 'http://localhost:8000',
  dev: 'https://fire-recovery-backend-dev-113009620257.us-central1.run.app',
  prod: 'https://fire-recovery-backend-prod-113009620257.us-central1.run.app'
} as const;

type Environment = keyof typeof BACKEND_URLS;

/**
 * Detect environment based on hostname and URL path
 * - localhost/127.0.0.1 → local
 * - /prod/ in path → prod
 * - otherwise → dev
 */
function detectEnvironment(): Environment {
  if (typeof window === 'undefined') return 'dev';

  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'local';
  }

  if (pathname.startsWith('/prod/') || pathname === '/prod') {
    return 'prod';
  }

  return 'dev';
}

/**
 * Get API base URL based on environment
 * Priority:
 * 1. Vite environment variable (VITE_API_BASE_URL)
 * 2. Auto-detect based on hostname and path
 */
export function getApiBaseUrl(): string {
  // Check for Vite environment variable (allows override)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Auto-detect environment
  const environment = detectEnvironment();
  return BACKEND_URLS[environment];
}

/**
 * API base path for all fire recovery endpoints
 */
export const API_BASE_PATH = '/fire-recovery';

/**
 * Full API base URL with path
 */
export const API_BASE_URL = `${getApiBaseUrl()}${API_BASE_PATH}`;
