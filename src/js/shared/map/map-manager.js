import { DEFAULT_MAP_CENTER, DEFAULT_ZOOM_LEVEL, MAP_TILES } from '../../core/config.js';
import { switchBaseLayer } from './map-layers.js';

/**
 * Map Manager Singleton
 * Provides a shared map instance for different components
 */
export class MapManager {
  static instance = null;
  map = null;
  baseLayerGroup = null;
  streetMapLayer = null;
  satelliteLayer = null;
  vegetationLayer = null;
  
  /**
   * Get the singleton instance
   */
  static getInstance() {
    if (!MapManager.instance) {
      MapManager.instance = new MapManager();
    }
    return MapManager.instance;
  }

  /**
   * Initialize map if not already initialized
   * @returns {L.Map} The map instance
   */
  getMap(elementId = 'map', center = DEFAULT_MAP_CENTER, zoom = DEFAULT_ZOOM_LEVEL) {
    if (this.map) return this.map;
    
    // Create new map if it doesn't exist
    this.map = L.map(elementId).setView(center, zoom);
    
    // Set up base layers
    this.setupBaseLayers();
    
    return this.map;
  }
  

  /**
   * Switch to specified base layer while preserving feature and result layers
   * @param {L.TileLayer} baseLayer - The base layer to switch to
   * @param {L.LayerGroup} [resultLayerGroup] - Optional result layer group to preserve
   * @param {L.FeatureGroup} [geoJsonLayerGroup] - Optional GeoJSON feature group to preserve
   */
  switchToBaseLayer(baseLayer, resultLayerGroup = null, geoJsonLayerGroup = null) {
    switchBaseLayer(
      this.map,
      baseLayer,
      resultLayerGroup || this.createLayerGroup(),
      geoJsonLayerGroup || this.createFeatureGroup()
    );
  }

  /**
   * Setup standard base layers used across the application
   */
  setupBaseLayers() {
    this.streetMapLayer = L.tileLayer(MAP_TILES.STREET.URL, {
      maxZoom: MAP_TILES.STREET.MAX_ZOOM,
      attribution: MAP_TILES.STREET.ATTRIBUTION
    });
    
    this.satelliteLayer = L.tileLayer(MAP_TILES.SATELLITE.URL, {
      maxZoom: MAP_TILES.SATELLITE.MAX_ZOOM,
      subdomains: MAP_TILES.SATELLITE.SUBDOMAINS,
      attribution: MAP_TILES.SATELLITE.ATTRIBUTION
    });
    
    // Add default layer
    this.streetMapLayer.addTo(this.map);
    
    // Create base layer group for easy switching
    this.baseLayerGroup = {
      "Street Map": this.streetMapLayer,
      "Satellite": this.satelliteLayer
    };
  }
  
  /**
   * Get a new layer group to use for feature-specific layers
   * @returns {L.LayerGroup} A new layer group attached to the map
   */
  createLayerGroup() {
    return L.layerGroup().addTo(this.map);
  }
  
  /**
   * Get a new feature group for editables
   * @returns {L.FeatureGroup} A new feature group attached to the map
   */
  createFeatureGroup() {
    return new L.FeatureGroup().addTo(this.map);
  }
}