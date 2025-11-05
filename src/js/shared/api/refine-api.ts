/**
 * Boundary Refinement API
 * Type-safe API calls for boundary refinement operations
 */

import type {
  RefineRequest,
  RefinedBoundaryResponse,
  ProcessingStartedResponse,
} from '@/types/custom';
import { apiClient } from './api-client';

/**
 * Submit boundary refinement request
 */
export async function submitRefinement(
  data: RefineRequest
): Promise<ProcessingStartedResponse> {
  return apiClient.post('/fire-recovery/process/refine', {
    body: data,
  });
}

/**
 * Get refinement status and results
 */
export async function getRefinementStatus(
  fireEventName: string,
  jobId: string
): Promise<RefinedBoundaryResponse> {
  const path = `/fire-recovery/result/refine/${fireEventName}/${jobId}`;
  return apiClient.get(path as any);
}

/**
 * Poll for refinement completion
 */
export async function pollRefinement(
  fireEventName: string,
  jobId: string,
  options?: {
    interval?: number;
    maxAttempts?: number;
  }
): Promise<RefinedBoundaryResponse> {
  const interval = options?.interval ?? 2000;
  const maxAttempts = options?.maxAttempts ?? 500;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await getRefinementStatus(fireEventName, jobId);

    if (result.status === 'complete' || result.status === 'completed') {
      return result;
    } else if (result.status === 'failed' || result.status === 'error') {
      throw new Error(`Boundary refinement failed: ${result.message || 'Unknown error'}`);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Boundary refinement polling timed out');
}
