/**
 * API Module Barrel Export
 * Centralizes all API exports for easy importing
 */

// Config
export { getApiBaseUrl, API_BASE_PATH, API_BASE_URL } from './config';

// API Client
export { apiClient, ApiClient, ApiError } from './api-client';

// Fire Severity API
export {
  analyzeFire,
  getFireAnalysisStatus,
  pollFireAnalysis,
} from './fire-api';

// Boundary Refinement API
export {
  submitRefinement,
  getRefinementStatus,
  pollRefinement,
} from './refine-api';

// Vegetation Impact API
export {
  resolveAgainstVegMap,
  getVegMapResult,
  pollVegetationAnalysis,
} from './vegetation-api';

// Upload API
export {
  uploadShapefile,
  uploadGeojson,
} from './upload-api';

// Utility function for polling (generic)
export async function pollUntilComplete<T extends { status: string }>(
  checkFunction: () => Promise<T>,
  interval: number = 2000,
  maxAttempts: number = 500
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await checkFunction();

    if (result.status === 'complete' || result.status === 'completed') {
      return result;
    } else if (result.status === 'failed' || result.status === 'error') {
      throw new Error('Operation failed');
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Polling timed out');
}
