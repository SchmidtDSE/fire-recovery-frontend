/**
 * Utility functions for Cloud Optimized GeoTIFF (COG) handling
 */

/**
 * Display a COG layer on the map
 * @param {string} cogUrl - URL to the COG file
 * @param {L.Map} map - Leaflet map instance
 * @param {L.LayerGroup} resultLayerGroup - Layer group where the COG layer will be added
 * @returns {Promise<L.Layer|null>} The created layer or null if failed
 */
export async function displayCOGLayer(cogUrl, map, resultLayerGroup) {
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
    
    const resultLayer = new GeoRasterLayer({
      georaster: georaster,
      opacity: 0.8,
      resolution: 256,
      pixelValuesToColorFn: getFireSeverityColorFunction()
    });

    resultLayerGroup.clearLayers();
    resultLayer.addTo(resultLayerGroup);
    
    // Force the result layer to the top
    map.eachLayer(l => {
      if (l === resultLayerGroup) {
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
    return null;
  }
}

/**
 * Load a vegetation COG layer
 * @param {string} vegMapUrl - URL to the vegetation map COG
 * @param {L.Map} map - Leaflet map instance
 * @param {L.TileLayer} baseLayer - Base map layer
 * @returns {Promise<L.Layer|null>} The created layer or null if failed
 */
export async function loadVegetationCOGLayer(vegMapUrl, map, baseLayer) {
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
      opacity: 0.5,
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
 * Get color function for fire severity visualization
 * @returns {Function} Function that maps pixel values to colors
 */
export function getFireSeverityColorFunction() {
  return value => {
    if (value === null || value === undefined || value === 0) return 'transparent';
    if (value < 0.1) return '#F0F921'; // bright yellow
    if (value < 0.2) return '#FDC328';
    if (value < 0.3) return '#F89441';
    if (value < 0.4) return '#E56B5D';
    if (value < 0.5) return '#CB4679';
    if (value < 0.6) return '#A82296';
    if (value < 0.7) return '#7D03A8';
    if (value < 0.8) return '#4B03A1';
    if (value < 0.9) return '#0D0887'; // darkest purple
    return '#0D0887';
  };
}