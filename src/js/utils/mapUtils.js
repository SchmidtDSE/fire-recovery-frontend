/**
 * Utility functions for map operations
 */

/**
 * Switch to a different map layer while preserving other layers
 * @param {L.Map} map - Leaflet map instance
 * @param {L.Layer} newBaseLayer - New base layer to display
 * @param {L.LayerGroup} resultLayerGroup - Layer group for results that should stay on top
 * @param {L.LayerGroup} geoJsonLayerGroup - Layer group for GeoJSON data
 */
export function switchToLayer(map, newBaseLayer, resultLayerGroup, geoJsonLayerGroup) {
  // Remove existing base layers but keep result layers
  map.eachLayer(l => {
    if (l !== resultLayerGroup && l !== geoJsonLayerGroup) {
      map.removeLayer(l);
    }
  });

  // Add the new base layer
  newBaseLayer.addTo(map);

  // Ensure result layers stay on top
  resultLayerGroup.eachLayer(l => {
    if (l instanceof L.Layer) {
      l.bringToFront();
    }
  });
}

/**
 * Style function for GeoJSON features
 * @param {Object} feature - GeoJSON feature
 * @returns {Object} Style object
 */
export function geoJsonStyle() {
  return {
    color: '#900505', // dark red
    weight: 3,
    opacity: 1.0,
    fillColor: 'transparent',
  };
}

/**
 * Get geometry from a layer group
 * @param {L.LayerGroup} layerGroup - Layer group containing GeoJSON features
 * @returns {Object|null} GeoJSON geometry or null if not found
 */
export function getGeometryFromLayerGroup(layerGroup) {
  let geometry = null;
  layerGroup.eachLayer((layer) => {
    if (layer instanceof L.Polygon) {
      geometry = layer.toGeoJSON().geometry;
    }
  });
  return geometry;
}

/**
 * Create and setup draw controls for a map
 * @param {L.Map} map - Leaflet map instance
 * @param {L.LayerGroup} layerGroup - Layer group for drawn features 
 * @returns {L.Control.Draw} The draw control instance
 */
export function setupDrawControls(map, layerGroup) {
  const drawControl = new L.Control.Draw({
    edit: {
      featureGroup: layerGroup
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
  return drawControl;
}