/**
 * Draw Tools
 * Map drawing tools and utilities for handling drawn features
 */

/**
 * Create and setup draw controls for a map
 * @param {L.Map} map - Leaflet map instance
 * @param {L.FeatureGroup} featureGroup - Feature group for drawn features
 * @param {Object} options - Draw options configuration
 * @returns {L.Control.Draw} The draw control instance
 */
export function setupDrawControls(map, featureGroup, options = {}) {
  // Default options for drawing tools
  const defaultOptions = {
    edit: {
      featureGroup: featureGroup
    },
    draw: {
      polyline: false,
      circle: false,
      rectangle: false,
      marker: false,
      circlemarker: false,
      polygon: {
        allowIntersection: false,
        drawError: {
          color: '#e1e100',
          message: '<strong>Error:</strong> Shape cannot intersect itself'
        },
        shapeOptions: {
          color: '#900505',
          weight: 3,
          opacity: 1.0,
          fillColor: '#900505',
          fillOpacity: 0.2
        }
      }
    }
  };
  
  // Merge default options with provided options
  const mergedOptions = {
    edit: { ...defaultOptions.edit, ...(options.edit || {}) },
    draw: { ...defaultOptions.draw, ...(options.draw || {}) }
  };
  
  // Create the draw control
  const drawControl = new L.Control.Draw(mergedOptions);
  
  // Add the control to the map
  map.addControl(drawControl);
  
  return drawControl;
}

/**
 * Get geometry from a layer group
 * @param {L.LayerGroup} layerGroup - Layer group containing GeoJSON features
 * @returns {Object|null} GeoJSON geometry or null if not found
 */
export function getGeometryFromLayerGroup(layerGroup) {
  let geometry = null;
  
  if (layerGroup) {
    layerGroup.eachLayer((layer) => {
      if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
        geometry = layer.toGeoJSON().geometry;
      }
    });
  }
  
  return geometry;
}

/**
 * Create default draw handlers for common drawing actions
 * @param {L.Map} map - Leaflet map instance
 * @param {L.FeatureGroup} featureGroup - Feature group for drawn features
 * @param {Function} onDrawComplete - Callback function when drawing is complete
 * @returns {Object} Object with configured event handlers
 */
export function createDrawHandlers(map, featureGroup, onDrawComplete = null) {
  // Handle created features
  const handleDrawCreated = (event) => {
    // Clear existing features
    featureGroup.clearLayers();
    
    // Add the new layer
    const layer = event.layer;
    featureGroup.addLayer(layer);
    
    // Call callback if provided
    if (typeof onDrawComplete === 'function') {
      const geometry = getGeometryFromLayerGroup(featureGroup);
      onDrawComplete(geometry, layer);
    }
  };

  // Handle draw complete events
  map.on(L.Draw.Event.CREATED, handleDrawCreated);
  
  // Handle draw edited events
  map.on(L.Draw.Event.EDITED, (event) => {
    if (typeof onDrawComplete === 'function') {
      const geometry = getGeometryFromLayerGroup(featureGroup);
      onDrawComplete(geometry);
    }
  });
  
  // Handle deleted events
  map.on(L.Draw.Event.DELETED, (event) => {
    if (typeof onDrawComplete === 'function') {
      onDrawComplete(null);
    }
  });
  
  return {
    handleDrawCreated
  };
}

/**
 * Standard style function for GeoJSON features
 * @param {Object} feature - GeoJSON feature
 * @returns {Object} Style object
 */
export function getDefaultGeoJsonStyle() {
  return {
    color: '#900505', // dark red
    weight: 3,
    opacity: 1.0,
    fillColor: 'transparent'
  };
}

/**
 * Add a GeoJSON feature to the map
 * @param {L.Map} map - Leaflet map instance
 * @param {L.FeatureGroup} featureGroup - Feature group to add the feature to
 * @param {Object} geojson - GeoJSON object to add
 * @param {Object} style - Style object for the feature
 * @returns {L.Layer} The added layer
 */
export function addGeoJSONToMap(map, featureGroup, geojson, style = null) {
  featureGroup.clearLayers();
  
  const layer = L.geoJSON(geojson, { 
    style: style || getDefaultGeoJsonStyle() 
  }).addTo(featureGroup);
  
  // Fit the map to the feature bounds
  if (featureGroup.getBounds().isValid()) {
    map.fitBounds(featureGroup.getBounds());
  }
  
  return layer;
}