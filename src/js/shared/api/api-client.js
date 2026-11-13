import { SEVERITY_ENDPOINTS } from './endpoints.js';
import { processErrorResponse } from './response-parser.js';

/**
 * A non-2xx response. `detail` is the body's `detail` (an array of field
 * errors on 422); `retryAfter` is the Retry-After header (seconds) on 429.
 */
export class ApiError extends Error {
  constructor(status, message, { detail = null, retryAfter = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.retryAfter = retryAfter;
  }
}

/**
 * Submit a severity analysis.
 * @param {Object} request - SeverityRequest
 * @returns {Promise<Object>} SeverityResult (200: already computed) or SeverityAccepted (202: queued)
 * @throws {ApiError} on any non-2xx response
 */
export function submitSeverity(request) {
  return requestJson(SEVERITY_ENDPOINTS.SUBMIT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

/**
 * Where a severity analysis stands.
 * @param {string} jobId
 * @returns {Promise<Object>} SeverityStatus
 * @throws {ApiError} on any non-2xx response (404: unknown job)
 */
export function getSeverityStatus(jobId) {
  return requestJson(SEVERITY_ENDPOINTS.STATUS(jobId), { method: 'GET' });
}

async function requestJson(url, { headers = {}, ...init }) {
  const response = await fetch(url, {
    ...init,
    headers: { 'Accept': 'application/json', ...headers },
    mode: 'cors',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, processErrorResponse(data, response.status), {
      detail: data.detail ?? null,
      retryAfter: response.headers.get('Retry-After'),
    });
  }
  return data;
}
