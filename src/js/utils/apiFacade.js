const API_BASE_URL = 'http://localhost:8000';

export const analyzeFire = async (data) => {
  const response = await fetch(`${API_BASE_URL}/process/analyze_fire_severity`, {
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
    `${API_BASE_URL}/result/analyze_fire_severity/${fireEventName}/${jobId}`,
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

export const submitRefinement = async (data) => {
  const response = await fetch(`${API_BASE_URL}/process/refine`, {
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
    `${API_BASE_URL}/result/refine/${fireEventName}/${jobId}`,
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

export const resolveAgainstVegMap = async (data) => {
  const response = await fetch(`${API_BASE_URL}/process/resolve_against_veg_map`, {
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
    `${API_BASE_URL}/result/resolve_against_veg_map/${fireEventName}/${jobId}`,
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

export const uploadShapefile = async (fireEventName, shapefileData) => {
  // Create FormData object for file upload
  const formData = new FormData();
  formData.append('fire_event_name', fireEventName);
  formData.append('shapefile', shapefileData);

  const response = await fetch(`${API_BASE_URL}/upload/shapefile`, {
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

  const response = await fetch(`${API_BASE_URL}/upload/geojson`, {
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

// Polling utility to check for completion of long-running processes
export const pollUntilComplete = (checkFunction, interval = 2000, maxAttempts = 30) => {
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
};

const processErrorResponse = (errorData, status) => {
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
};