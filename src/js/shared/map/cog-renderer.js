import stateManager from '../../core/state-manager.js';

/**
 * COG Renderer
 * Utilities for displaying Cloud Optimized GeoTIFFs on maps
 */


/**
 * Display a COG layer on the map
 * @param {string} cogUrl - URL to the COG file
 * @param {L.Map} map - Leaflet map instance
 * @param {L.LayerGroup} layerGroup - Layer group where the COG layer will be added
 * @returns {Promise<L.Layer|null>} The created layer or null if failed
 */
export async function displayCOGLayer(cogUrl, map, layerGroup) {
  if (!cogUrl) {
    console.warn('No COG URL provided');
    return null;
  }
  
  try {
    const cogResponse = await fetch(cogUrl);
    if (!cogResponse.ok) {
      throw new Error(`COG fetch failed with status: ${cogResponse.status}`);
    }

    const arrayBuffer = await cogResponse.arrayBuffer();
    const georaster = await parseGeoraster(arrayBuffer);
    
    // Get current color breaks from state manager
    const { breaks, colors } = stateManager.getSharedState().colorBreaks;
    
    const resultLayer = new GeoRasterLayer({
      georaster: georaster,
      opacity: .8,
      resolution: 256,
      pixelValuesToColorFn: value => {
        // if (value === null || value === undefined || value <= 0) return 'transparent';
        if (value === null || value === undefined) return 'transparent';
        if (value === -9999.0) return 'transparent'; // Handle NoData value

        // Use the breaks from state to determine colors
        for (let i = 0; i < breaks.length; i++) {
          if (value < breaks[i]) return colors[i];
        }
        
        // If value is higher than all breaks, use the last color
        return colors[colors.length - 1];
      }
    });

    // Clear existing layers in the group
    layerGroup.clearLayers();
    
    // Add the new layer
    resultLayer.addTo(layerGroup);
    
    // Force the result layer to the top
    map.eachLayer(l => {
      if (l === layerGroup) {
        l.eachLayer(resultL => resultL.bringToFront());
      }
    });

    // Check if the layer has valid bounds before fitting
    const bounds = resultLayer.getBounds();
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds);
    }
    
    return resultLayer;
  } catch (error) {
    console.error('Error loading COG:', error);
    throw error;
  }
}

/**
 * Load a vegetation COG layer
 * @param {string} vegMapUrl - URL to the vegetation map COG
 * @param {L.Map} map - Leaflet map instance
 * @param {L.TileLayer} baseLayer - Base map layer
 * @param {number} opacity - Layer opacity
 * @returns {Promise<L.Layer|null>} The created layer or null if failed
 */
export async function loadVegetationCOGLayer(vegMapUrl, map, baseLayer, opacity = 0.5) {
  try {
    // Ensure base layer is added
    if (!map.hasLayer(baseLayer)) {
      baseLayer.addTo(map);
    }
    
    const response = await fetch(vegMapUrl);
    const arrayBuffer = await response.arrayBuffer();
    const georaster = await parseGeoraster(arrayBuffer);
    
    const cogLayer = new GeoRasterLayer({
      georaster: georaster,
      opacity: opacity,
      resolution: 500
    });

    cogLayer.addTo(map);
    map.fitBounds(cogLayer.getBounds());
    
    return cogLayer;
  } catch (error) {
    console.error("Error loading vegetation COG:", error);
    return null;
  }
}

/**
 * Get color function for fire severity visualization based on current state
 * @returns {Function} Function that maps pixel values to colors
 */
export function getFireSeverityColorFunction() {
  // Get current color break settings from state
  const { breaks, colors } = stateManager.getSharedState().colorBreaks;

  return value => {
    if (value === null || value === undefined || value === -9999.0) return 'transparent';
    
    // Find the appropriate color based on breaks
    for (let i = 0; i < breaks.length; i++) {
      if (value < breaks[i]) return colors[i];
    }
    
    // Return the last color if no break matches
    return colors[colors.length - 1];
  };
};

/**
 * Get default color function for general visualization
 * @returns {Function} Function that maps pixel values to colors
 */
export function getDefaultColorFunction() {
  return value => {
    if (value === null || value === undefined || value === 0) return 'transparent';
    // Default grayscale mapping
    const intensity = Math.min(255, Math.max(0, Math.floor(value * 255)));
    return `rgb(${intensity}, ${intensity}, ${intensity})`;
  };
}