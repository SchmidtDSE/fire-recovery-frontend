import { 
  FIRE_ENDPOINTS, 
  REFINEMENT_ENDPOINTS, 
  VEGETATION_ENDPOINTS, 
  UPLOAD_ENDPOINTS 
} from './endpoints.js';
import { processErrorResponse, createPollingMechanism } from './response-parser.js';

/**
 * Fire severity analysis API calls
 */
export const analyzeFire = async (data) => {
  const response = await fetch(FIRE_ENDPOINTS.ANALYZE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    mode: 'cors',
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(processErrorResponse(errorData, response.status));
  }

  return await response.json();
};

export const getFireAnalysisStatus = async (fireEventName, jobId) => {
  const response = await fetch(
    FIRE_ENDPOINTS.GET_ANALYSIS_RESULT(fireEventName, jobId),
    {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      mode: 'cors'
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(processErrorResponse(errorData, response.status));
  }

  return await response.json();
};

/**
 * Boundary refinement API calls
 */
export const submitRefinement = async (data) => {
  const response = await fetch(REFINEMENT_ENDPOINTS.SUBMIT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    mode: 'cors',
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(processErrorResponse(errorData, response.status));
  }

  return await response.json();
};

export const getRefinementStatus = async (fireEventName, jobId) => {
  const response = await fetch(
    REFINEMENT_ENDPOINTS.GET_RESULT(fireEventName, jobId),
    {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      mode: 'cors'
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(processErrorResponse(errorData, response.status));
  }

  return await response.json();
};

/**
 * Vegetation impact API calls
 */
export const resolveAgainstVegMap = async (data) => {
  const response = await fetch(VEGETATION_ENDPOINTS.RESOLVE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    mode: 'cors',
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(processErrorResponse(errorData, response.status));
  }

  return await response.json();
};

export const getVegMapResult = async (fireEventName, jobId) => {
  const response = await fetch(
    VEGETATION_ENDPOINTS.GET_RESULT(fireEventName, jobId),
    {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      mode: 'cors'
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(processErrorResponse(errorData, response.status));
  }

  const result = await response.json();
  
  // If we have a fire_veg_matrix_json_url and status is complete, fetch the JSON data
  if (result.fire_veg_matrix_json_url && result.status === 'complete') {
    try {
      console.log('Fetching vegetation matrix JSON from:', result.fire_veg_matrix_json_url);
      const matrixResponse = await fetch(result.fire_veg_matrix_json_url);
      if (matrixResponse.ok) {
        const matrixData = await matrixResponse.json();
        console.log('Successfully fetched vegetation matrix data:', matrixData);
        // Merge the matrix data into the result
        result.vegetation_impact_data = matrixData;
      } else {
        console.warn('Failed to fetch vegetation matrix JSON:', matrixResponse.status, matrixResponse.statusText);
      }
    } catch (error) {
      console.warn('Error fetching vegetation matrix data:', error);
    }
  }
  
  return result;
};

/**
 * File upload API calls
 */
export const uploadShapefile = async (fireEventName, shapefileData) => {
  // Create FormData object for file upload
  const formData = new FormData();
  formData.append('fire_event_name', fireEventName);
  formData.append('shapefile', shapefileData);

  const response = await fetch(UPLOAD_ENDPOINTS.SHAPEFILE, {
    method: 'POST',
    mode: 'cors',
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(processErrorResponse(errorData, response.status));
  }

  return await response.json();
};

export const uploadGeojson = async (fireEventName, geojsonData) => {
  const data = {
    fire_event_name: fireEventName,
    geojson: geojsonData
  };

  const response = await fetch(UPLOAD_ENDPOINTS.GEOJSON, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    mode: 'cors',
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(processErrorResponse(errorData, response.status));
  }

  return await response.json();
};

/**
 * Polling utility to check for completion of long-running processes
 * @param {Function} checkFunction - Function to call to check status
 * @param {number} interval - Interval between checks in milliseconds
 * @param {number} maxAttempts - Maximum number of polling attempts
 * @returns {Promise} Promise that resolves with the result object containing:
 *   - For fire severity: result.coarse_severity_cog_urls (dict mapping metric names to URLs)
 *   - For refinement: result.refined_severity_cog_urls (dict mapping metric names to URLs)
 *   - For boundary: result.refined_boundary_geojson_url (string URL)
 */
export const pollUntilComplete = (checkFunction, interval = 10000, maxAttempts = 500) => {
  return createPollingMechanism(checkFunction, interval, maxAttempts);
};