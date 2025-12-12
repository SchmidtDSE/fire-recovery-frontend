/**
 * API Endpoint definitions
 * Centralizes API endpoints used in the application
 */

// Backend URLs per environment
const BACKEND_URLS = {
  local: 'http://localhost:8000',
  dev: 'https://fire-recovery-backend-dev-113009620257.us-central1.run.app',
  prod: 'https://fire-recovery-backend-prod-113009620257.us-central1.run.app'
};

/**
 * Detect environment based on hostname and URL path
 * - localhost/127.0.0.1 → local
 * - /prod/ in path → prod
 * - otherwise → dev
 */
const detectEnvironment = () => {
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
};

// Base URL configuration - automatically set based on environment
const environment = detectEnvironment();
const API_BASE = `${BACKEND_URLS[environment]}/fire-recovery`;


// Fire severity endpoints
export const FIRE_ENDPOINTS = {
  ANALYZE: `${API_BASE}/process/analyze_fire_severity`,
  GET_ANALYSIS_RESULT: (fireEventName, jobId) => 
    `${API_BASE}/result/analyze_fire_severity/${fireEventName}/${jobId}`
};

// Boundary refinement endpoints
export const REFINEMENT_ENDPOINTS = {
  SUBMIT: `${API_BASE}/process/refine`,
  GET_RESULT: (fireEventName, jobId) => 
    `${API_BASE}/result/refine/${fireEventName}/${jobId}`
};

// Vegetation impact endpoints
export const VEGETATION_ENDPOINTS = {
  RESOLVE: `${API_BASE}/process/resolve_against_veg_map`,
  GET_RESULT: (fireEventName, jobId) => 
    `${API_BASE}/result/resolve_against_veg_map/${fireEventName}/${jobId}`
};

// File upload endpoints
export const UPLOAD_ENDPOINTS = {
  SHAPEFILE: `${API_BASE}/upload/shapefile`,
  GEOJSON: `${API_BASE}/upload/geojson`
};

// Export the base URL for other configurations
export const API_BASE_URL = API_BASE;