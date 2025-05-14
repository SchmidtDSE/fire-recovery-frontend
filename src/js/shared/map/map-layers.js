/**
 * Map layers management functionality
 * Handle addition, removal, and switching of map layers
 */

/**
 * Switch to a different base layer while preserving result layers
 * @param {L.Map} map - Leaflet map instance
 * @param {L.TileLayer} newBaseLayer - New base layer to display
 * @param {L.LayerGroup} resultLayerGroup - Layer group containing result layers
 * @param {L.FeatureGroup} geoJsonLayerGroup - Feature group containing GeoJSON data
 */
export function switchBaseLayer(map, newBaseLayer, resultLayerGroup, geoJsonLayerGroup) {
  // Remove all existing base layers but keep result and GeoJSON layers
  map.eachLayer(layer => {
    if (layer !== resultLayerGroup && layer !== geoJsonLayerGroup) {
      map.removeLayer(layer);
    }
  });

  // Add the new base layer at the bottom
  newBaseLayer.addTo(map);
  newBaseLayer.bringToBack();

  // Ensure result layers stay on top
  if (resultLayerGroup) {
    resultLayerGroup.eachLayer(layer => {
      if (layer instanceof L.Layer) {
        layer.bringToFront();
      }
    });
  }
}

/**
 * Toggle layer visibility
 * @param {L.Map} map - Leaflet map instance
 * @param {L.Layer} layer - Layer to toggle
 * @returns {boolean} New visibility state (true if visible)
 */
export function toggleLayerVisibility(map, layer) {
  if (map.hasLayer(layer)) {
    map.removeLayer(layer);
    return false;
  } else {
    layer.addTo(map);
    return true;
  }
}


/**
 * Remove all layers from the map.
 * 
 * @param {L.Map} map - Leaflet map instance
 */
export function clearLayers(map) {
  if (map) {
    map.eachLayer(layer => {
      if (layer instanceof L.Layer) {
        map.removeLayer(layer);
      }
    });
  }
}

/**
 * Set layer opacity
 * @param {L.Layer} layer - Layer to adjust
 * @param {number} opacity - Opacity value (0-1)
 */
export function setLayerOpacity(layer, opacity) {
  if (layer && typeof layer.setOpacity === 'function') {
    layer.setOpacity(opacity);
  }
}

/**
 * Clear all layers from a layer group
 * @param {L.LayerGroup} layerGroup - Layer group to clear
 */
export function clearLayerGroup(layerGroup) {
  if (layerGroup) {
    layerGroup.clearLayers();
  }
}

/**
 * Create a layer control for the map
 * @param {L.Map} map - Leaflet map instance
 * @param {Object} baseLayers - Object containing base layers
 * @param {Object} overlays - Object containing overlay layers
 * @returns {L.Control.Layers} Layer control
 */
export function createLayerControl(map, baseLayers, overlays) {
  return L.control.layers(baseLayers, overlays).addTo(map);
}