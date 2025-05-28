/**
 * API Endpoint definitions
 * Centralizes all API endpoints used in the application
 */

const local = true; // Set to true for local development, false for production

// Base URL configuration
let API_BASE;
if (local) {
  API_BASE = 'http://localhost:8000/fire-recovery';
} else {
  API_BASE = 'https://fire-recovery-backend-dev-113009620257.us-central1.run.app/fire-recovery';
}

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

// Export the base URL for other configurationsv
export const API_BASE_URL = API_BASE;