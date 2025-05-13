/**
 * Base Map functionality
 * Provides core map initialization and configuration
 */

/**
 * Initialize a Leaflet map with default settings
 * @param {string} elementId - ID of the DOM element to contain the map
 * @param {Array} center - Starting center coordinates [lat, lng]
 * @param {number} zoom - Initial zoom level
 * @returns {L.Map} Initialized map instance
 */
export function initializeMap(elementId, center = [33.8734, -115.9010], zoom = 10) {
  if (!window.L) {
    console.error('Leaflet library not loaded. Make sure to include Leaflet in your HTML.');
    return null;
  }

  // Create the map
  const map = L.map(elementId).setView(center, zoom);
  
  return map;
}

/**
 * Create a set of standard base layers for the map
 * @returns {Object} Object containing various base layers
 */
export function createBaseLayers() {
  if (!window.L) {
    console.error('Leaflet library not loaded.');
    return {};
  }

  // OpenStreetMap tile layer
  const streetMapLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });
  
  // Google Satellite tile layer
  const satelliteLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: 'Imagery ©2023 Google'
  });

  // Return an object containing the layers
  return {
    streetMapLayer,
    satelliteLayer
  };
}

/**
 * Initialize map with standard configuration
 * @param {string} elementId - ID of the DOM element to contain the map
 * @param {Array} center - Starting center coordinates [lat, lng]
 * @param {number} zoom - Initial zoom level
 * @returns {Object} Object containing the map and its layers
 */
export function createStandardMap(elementId, center, zoom) {
  const map = initializeMap(elementId, center, zoom);
  if (!map) return null;
  
  const baseLayers = createBaseLayers();
  
  // Add default street map layer
  baseLayers.streetMapLayer.addTo(map);
  
  // Create layer groups for GeoJSON data and results
  const geoJsonLayerGroup = new L.FeatureGroup().addTo(map);
  const resultLayerGroup = L.layerGroup().addTo(map);
  
  return {
    map,
    baseLayers,
    geoJsonLayerGroup,
    resultLayerGroup
  };
}