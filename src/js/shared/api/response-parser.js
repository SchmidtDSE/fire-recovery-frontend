/**
 * API response parsing utilities
 */

/**
 * A readable message from an error response body.
 * @param {Object} errorData - Parsed error body ({detail} from FastAPI, or {message})
 * @param {number} status - HTTP status code
 * @returns {string}
 */
export function processErrorResponse(errorData, status) {
  const { detail, message } = errorData;
  if (Array.isArray(detail)) {
    return detail.map((err) => `${err.msg} (${(err.loc || []).join('.')})`).join('\n');
  }
  if (detail) return String(detail);
  if (message) return message;
  return `HTTP error! Status: ${status}`;
}
