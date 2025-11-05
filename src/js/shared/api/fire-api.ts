/**
 * Fire Severity Analysis API
 * Type-safe API calls for fire severity analysis operations
 */

import type {
  ProcessingRequest,
  ProcessingStartedResponse,
  FireSeverityResponse,
} from '@/types/custom';
import { apiClient } from './api-client';

/**
 * Start fire severity analysis
 */
export async function analyzeFire(
  data: ProcessingRequest
): Promise<ProcessingStartedResponse> {
  return apiClient.post('/fire-recovery/process/analyze_fire_severity', {
    body: data,
  });
}

/**
 * Get fire severity analysis status and results
 */
export async function getFireAnalysisStatus(
  fireEventName: string,
  jobId: string
): Promise<FireSeverityResponse> {
  const path = `/fire-recovery/result/analyze_fire_severity/${fireEventName}/${jobId}`;
  return apiClient.get(path as any);
}

/**
 * Poll for fire severity analysis completion
 */
export async function pollFireAnalysis(
  fireEventName: string,
  jobId: string,
  options?: {
    interval?: number;
    maxAttempts?: number;
  }
): Promise<FireSeverityResponse> {
  const interval = options?.interval ?? 2000;
  const maxAttempts = options?.maxAttempts ?? 500;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await getFireAnalysisStatus(fireEventName, jobId);

    if (result.status === 'complete' || result.status === 'completed') {
      return result;
    } else if (result.status === 'failed' || result.status === 'error') {
      throw new Error(`Fire severity analysis failed: ${result.message || 'Unknown error'}`);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Fire severity analysis polling timed out');
}
