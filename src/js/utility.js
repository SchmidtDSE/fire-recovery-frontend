export function initializeMap(elementId, center, zoom) {
  const map = L.map(elementId).setView(center, zoom);
  
  // Define tile layers
  const streetMapLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });

  const satelliteLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: 'Imagery ©2023 Google'
  });

  // Add default layer
  streetMapLayer.addTo(map);
  
  return map;
}

export function setupDrawControls(map) {
  // Create layer groups for GeoJSON data and results
  const geoJsonLayerGroup = new L.FeatureGroup().addTo(map);
  const resultLayerGroup = L.layerGroup().addTo(map);
  
  // Initialize draw control
  const drawControl = new L.Control.Draw({
    edit: {
      featureGroup: geoJsonLayerGroup
    },
    draw: {
      polyline: false,
      circle: false,
      rectangle: false,
      marker: false,
      circlemarker: false,
      polygon: true
    }
  });
  
  map.addControl(drawControl);
  
  // Handle draw events
  map.on(L.Draw.Event.CREATED, function (event) {
    geoJsonLayerGroup.clearLayers();
    const layer = event.layer;
    geoJsonLayerGroup.addLayer(layer);
    // Update UI as needed
  });
  
  return { geoJsonLayerGroup, resultLayerGroup };
}

export function setupPolling(fetchFunction, onComplete, onError, interval = 2000) {
  const pollId = setInterval(async () => {
    try {
      const result = await fetchFunction();
      
      if (result.status === 'completed' || result.status === 'complete') {
        clearInterval(pollId);
        onComplete(result);
      } else if (result.status === 'failed') {
        clearInterval(pollId);
        onError(new Error(result.error || 'Processing failed'));
      }
      // Continue polling if status is 'pending' or similar
      
    } catch (error) {
      clearInterval(pollId);
      onError(error);
    }
  }, interval);
  
  // Return the interval ID so it can be cleared if needed
  return pollId;
}

export function cancelPolling(pollId) {
  if (pollId) {
    clearInterval(pollId);
  }
}