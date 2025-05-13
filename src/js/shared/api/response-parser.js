/**
 * API Response parsing utilities
 * Handles standardized processing of API responses
 */

/**
 * Process an error response from the API
 * @param {Object} errorData - Error data from the API
 * @param {number} status - HTTP status code
 * @returns {string} Formatted error message
 */
export function processErrorResponse(errorData, status) {
  let errorMessage = `HTTP error! Status: ${status}`;
  
  if (errorData.detail) {
    if (Array.isArray(errorData.detail)) {
      errorMessage = errorData.detail
        .map(err => `${err.msg} (${err.loc.join('.')})`).join('\n');
    } else {
      errorMessage = errorData.detail.toString();
    }
  } else if (errorData.message) {
    errorMessage = errorData.message;
  }
  
  return errorMessage;
}

/**
 * Creates a polling mechanism for long-running processes
 * @param {Function} checkFunction - Function to call to check status
 * @param {number} interval - Interval between checks in milliseconds
 * @param {number} maxAttempts - Maximum number of polling attempts
 * @returns {Promise} Promise that resolves with the result or rejects with an error
 */
export function createPollingMechanism(checkFunction, interval = 2000, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const poll = async () => {
      try {
        const result = await checkFunction();
        
        if (result.status === 'complete' || result.status === 'completed') {
          resolve(result);
        } else if (result.status === 'pending' || result.status === 'processing') {
          attempts++;
          if (attempts >= maxAttempts) {
            reject(new Error('Maximum polling attempts reached'));
          } else {
            setTimeout(poll, interval);
          }
        } else {
          reject(new Error(`Unexpected status: ${result.status}`));
        }
      } catch (error) {
        reject(error);
      }
    };
    
    poll();
  });
}