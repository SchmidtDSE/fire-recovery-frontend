/**
 * Custom type definitions and extensions for the Fire Recovery Frontend
 */

import type { components } from './api';

// Type aliases for commonly used API types
export type ProcessingRequest = components['schemas']['ProcessingRequest'];
export type ProcessingStartedResponse = components['schemas']['ProcessingStartedResponse'];
export type FireSeverityResponse = components['schemas']['FireSeverityResponse'] & { message?: string };
export type RefineRequest = components['schemas']['RefineRequest'];
export type RefinedBoundaryResponse = components['schemas']['RefinedBoundaryResponse'] & { message?: string };
export type VegMapResolveRequest = components['schemas']['VegMapResolveRequest'];
export type VegMapMatrixResponse = components['schemas']['VegMapMatrixResponse'] & { message?: string };

// Job status types
export type JobStatus = 'pending' | 'processing' | 'complete' | 'completed' | 'failed' | 'error';

// Severity metric types
export type SeverityMetric = 'dNBR' | 'RdNBR' | 'RBR';

// API error type
export interface ApiErrorDetail {
  detail?: string | Array<{ msg: string; loc: string[] }>;
  message?: string;
}

// Polling configuration
export interface PollingConfig {
  interval?: number;
  maxAttempts?: number;
}
