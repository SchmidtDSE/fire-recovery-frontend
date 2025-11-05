/**
 * API Configuration
 * Handles environment-based API URL selection
 */

/**
 * Detect if running in local environment
 */
function isLocalEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
}

/**
 * Get API base URL based on environment
 * Priority:
 * 1. Vite environment variable (VITE_API_BASE_URL)
 * 2. Auto-detect based on hostname
 * 3. Default to dev backend
 */
export function getApiBaseUrl(): string {
  // Check for Vite environment variable
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Auto-detect based on hostname
  if (isLocalEnvironment()) {
    return 'http://localhost:8000';
  }

  // Default to dev backend
  return 'https://fire-recovery-backend-dev-113009620257.us-central1.run.app';
}

/**
 * API base path for all fire recovery endpoints
 */
export const API_BASE_PATH = '/fire-recovery';

/**
 * Full API base URL with path
 */
export const API_BASE_URL = `${getApiBaseUrl()}${API_BASE_PATH}`;
