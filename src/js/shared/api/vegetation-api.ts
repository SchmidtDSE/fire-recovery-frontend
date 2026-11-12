/**
 * Vegetation Impact API
 * Type-safe API calls for vegetation impact analysis operations
 */

import type {
  VegMapResolveRequest,
  VegMapMatrixResponse,
  ProcessingStartedResponse,
} from '@/types/custom';
import { apiClient } from './api-client';

/**
 * Submit vegetation impact analysis request
 */
export async function resolveAgainstVegMap(
  data: VegMapResolveRequest
): Promise<ProcessingStartedResponse> {
  return apiClient.post('/fire-recovery/process/resolve_against_veg_map', {
    body: data,
  });
}

/**
 * Get vegetation impact analysis results
 * Automatically fetches severity breaks from state manager if available
 */
export async function getVegMapResult(
  fireEventName: string,
  jobId: string,
  severityBreaks?: number[]
): Promise<VegMapMatrixResponse> {
  const path = `/fire-recovery/result/resolve_against_veg_map/${fireEventName}/${jobId}`;

  // If severity breaks not provided, try to get from state manager
  let breaks = severityBreaks;
  if (!breaks) {
    try {
      // Dynamically import state manager to avoid circular dependencies
      // @ts-ignore - JS module without type definitions
      const stateManagerModule = await import('../../../core/state-manager.js');
      const stateManager = (stateManagerModule as any).default;
      const colorBreaks = stateManager.getSharedState().colorBreaks;
      breaks = colorBreaks.breaks;
    } catch (error) {
      console.warn('Could not get severity breaks from state manager:', error);
      // Continue without severity breaks - backend will use defaults
    }
  }

  // Build query parameters
  const params: Record<string, string> = {};
  if (breaks && breaks.length > 0) {
    // Convert array to multiple query params
    breaks.forEach((breakValue) => {
      params[`severity_breaks`] = String(breakValue);
    });
  }

  const result = await apiClient.get(path as any, { params });

  // If we have a fire_veg_matrix_json_url and status is complete, fetch the JSON data
  if (result.fire_veg_matrix_json_url && result.status === 'complete') {
    try {
      const matrixResponse = await fetch(result.fire_veg_matrix_json_url);
      if (matrixResponse.ok) {
        const matrixData = await matrixResponse.json();
        // Merge the matrix data into the result for visualization
        result.vegetation_impact_data = matrixData;
      } else {
        console.warn('Failed to fetch vegetation matrix JSON:', matrixResponse.status, matrixResponse.statusText);
      }
    } catch (error) {
      console.warn('Error fetching vegetation matrix data:', error);
    }
  }

  return result;
}

/**
 * Poll for vegetation impact analysis completion
 */
export async function pollVegetationAnalysis(
  fireEventName: string,
  jobId: string,
  options?: {
    interval?: number;
    maxAttempts?: number;
    severityBreaks?: number[];
  }
): Promise<VegMapMatrixResponse> {
  const interval = options?.interval ?? 2000;
  const maxAttempts = options?.maxAttempts ?? 500;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await getVegMapResult(fireEventName, jobId, options?.severityBreaks);

    if (result.status === 'complete' || result.status === 'completed') {
      return result;
    } else if (result.status === 'failed' || result.status === 'error') {
      throw new Error(`Vegetation impact analysis failed: ${result.message || 'Unknown error'}`);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Vegetation impact analysis polling timed out');
}
