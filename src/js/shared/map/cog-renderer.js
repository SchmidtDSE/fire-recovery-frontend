import stateManager from '../../core/state-manager.js';

/**
 * COG Renderer
 * Utilities for displaying Cloud Optimized GeoTIFFs on maps
 */

// Module-level state to track the current fire severity COG layer
let currentCOGLayer = null;
let currentCOGUrl = null;
let cachedGeoraster = null;

/**
 * Get a color function that dynamically reads breaks from state
 * @returns {Function} Function that maps pixel values to colors
 */
function getDynamicColorFunction() {
  return value => {
    if (value === null || value === undefined || value <= -1) return 'transparent';
    const { breaks, colors } = stateManager.getSharedState().colorBreaks;
    for (let i = 0; i < breaks.length; i++) {
      if (value < breaks[i]) return colors[i];
    }
    return colors[colors.length - 1];
  };
}

/**
 * Clear the current COG layer's tile caches
 * @param {boolean} clearGeoraster - Also clear cached georaster data (for URL changes)
 */
export function clearCOGLayerCaches(clearGeoraster = false) {
  if (currentCOGLayer) {
    // Clear GeoRasterLayer's internal caches
    if (currentCOGLayer.cache) {
      currentCOGLayer.cache = {};
    }
    if (currentCOGLayer._cache) {
      currentCOGLayer._cache = { innerTile: {}, tile: {} };
    }
    if (currentCOGLayer._tiles) {
      currentCOGLayer._tiles = {};
    }
  }

  if (clearGeoraster) {
    cachedGeoraster = null;
    currentCOGUrl = null;
  }
}

/**
 * Update the colors on the current COG layer without recreating it
 * @returns {boolean} True if colors were updated, false if no layer exists
 */
export function updateCOGLayerColors() {
  if (!currentCOGLayer) {
    console.warn('No COG layer to update colors on');
    return false;
  }

  try {
    // Update the color function
    currentCOGLayer.options.pixelValuesToColorFn = getDynamicColorFunction();

    // Clear tile caches (but keep georaster since URL is same)
    clearCOGLayerCaches(false);

    // Force a complete redraw
    if (currentCOGLayer.redraw) {
      currentCOGLayer.redraw();
    }

    console.log('COG layer colors updated with new breaks');
    return true;
  } catch (error) {
    console.error('Error updating COG layer colors:', error);
    return false;
  }
}

/**
 * Check if we can update colors on the existing layer (same URL)
 * @param {string} cogUrl - The URL to check
 * @returns {boolean} True if the URL matches current layer
 */
export function canUpdateExistingLayer(cogUrl) {
  return currentCOGLayer !== null && currentCOGUrl === cogUrl;
}

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
    let georaster;

    // Reuse cached georaster if URL matches (avoids re-fetching for color changes)
    if (cachedGeoraster && currentCOGUrl === cogUrl) {
      console.log('Reusing cached georaster');
      georaster = cachedGeoraster;
    } else {
      // Fetch and parse new COG
      const cacheBuster = `_cb=${Date.now()}`;
      const urlWithCacheBuster = cogUrl.includes('?')
        ? `${cogUrl}&${cacheBuster}`
        : `${cogUrl}?${cacheBuster}`;

      console.log('Fetching COG from server...');
      const cogResponse = await fetch(urlWithCacheBuster);
      if (!cogResponse.ok) {
        throw new Error(`COG fetch failed with status: ${cogResponse.status}`);
      }

      const arrayBuffer = await cogResponse.arrayBuffer();
      georaster = await parseGeoraster(arrayBuffer);
      cachedGeoraster = georaster;
    }

    const resultLayer = new GeoRasterLayer({
      georaster: georaster,
      opacity: .8,
      resolution: 256,
      pixelValuesToColorFn: getDynamicColorFunction()
    });

    // Store reference for later updates
    currentCOGLayer = resultLayer;
    currentCOGUrl = cogUrl;

    // Remove layer group from map temporarily
    const wasOnMap = map.hasLayer(layerGroup);
    if (wasOnMap) {
      map.removeLayer(layerGroup);
    }

    // Clear existing layers in the group
    layerGroup.clearLayers();

    // Add the new layer to the group
    resultLayer.addTo(layerGroup);

    // Re-add layer group to map if it was previously on the map
    if (wasOnMap) {
      layerGroup.addTo(map);
    }

    // Force all layers in the group to the front
    // LayerGroup doesn't have bringToFront, so we iterate its layers
    layerGroup.eachLayer(layer => {
      if (layer.bringToFront) {
        layer.bringToFront();
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
    // NoData values should be transparent
    if (value === null || value === undefined || value <= -1) return 'transparent';

    // Find the appropriate color based on breaks
    // Values from -1 to break[0] are "unburned" (colors[0])
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