import { dispatch } from 'https://cdn.jsdelivr.net/npm/d3-dispatch@3.0.1/+esm';

/**
 * Application state manager to coordinate between different features
 * Uses d3-dispatch for event handling
 */
class StateManager {
  constructor() {
    // Registry of feature components
    this.components = {
      fire: null,
      vegetation: null,
      resources: null
    };
    
    // Shared application state that's common across components
    this.sharedState = {
      fireEventName: null,
      parkUnit: null,
      jobId: null,
      processingStatus: 'idle',
      activeMetric: 'RBR', // Default active metric
      assets: {
        coarse: {
          geojsonUrl: null,
          severityCogUrls: {} // Map of metrics (RBR, dNBR, RdNBR) to URLs
        },
        refined: {
          geojsonUrl: null,
          severityCogUrls: {} // Map of metrics to URLs
        }
      }
    };
    
    // Create dispatcher for state events
    this.dispatch = dispatch(
      'sharedStateChanged',
      'component_registered', 
      'component_removed',
      'fireEventNameChanged',
      'parkUnitChanged',
      'jobIdChanged',
      'processingStatusChanged',
      'assetsChanged',
      'activeMetricChanged'
    );
  }
  
  /**
   * Register a feature component
   * @param {string} name - Feature name
   * @param {Object} component - Feature component (typically a presenter)
   */
  registerComponent(name, component) {
    if (this.components.hasOwnProperty(name)) {
      this.components[name] = component;
      this.dispatch.call('component_registered', this, { name, component });
      
      // Initialize component with current shared state
      if (typeof component.initializeWithSharedState === 'function') {
        component.initializeWithSharedState(this.sharedState);
      }
    }
    return this;
  }
  
  /**
   * Get a registered component
   * @param {string} name - Feature name
   * @returns {Object} The component or null if not found
   */
  getComponent(name) {
    return this.components[name] || null;
  }
  
  /**
   * Subscribe to state events
   * @param {string} eventName - Event name to subscribe to
   * @param {Function} callback - Callback function
   */
  on(eventName, callback) {
    this.dispatch.on(eventName, callback);
    return this;
  }
  
  /**
   * Update shared state
   * @param {string} property - State property name
   * @param {any} value - New value
   * @param {string} source - Source component name
   */
  updateSharedState(property, value, source) {
    // Update the shared state
    if (property in this.sharedState) {
      this.sharedState[property] = value;
      
      // Dispatch the specific property change event
      const eventName = property + 'Changed';
      if (this.dispatch.on(eventName)) {
        this.dispatch.call(eventName, this, { value, source });
      }
      
      // Dispatch general state changed event
      this.dispatch.call('sharedStateChanged', this, {
        property,
        value,
        source,
        state: this.sharedState
      });
    }
    return this;
  }
  
  /**
   * Update asset state for nested properties
   * @param {string} assetGroup - Asset group ('coarse' or 'refined')
   * @param {string} assetType - Asset type ('geojsonUrl' or 'severityCogUrls')
   * @param {any} value - New value (string for geojson, object for severity cogs)
   * @param {string} source - Source component name
   */
  updateNestedAsset(assetGroup, assetType, value, source) {
    if (this.sharedState.assets[assetGroup] && 
        assetType in this.sharedState.assets[assetGroup]) {
      this.sharedState.assets[assetGroup][assetType] = value;
      
      this.dispatch.call('assetsChanged', this, {
        assetGroup,
        assetType,
        value,
        source,
        assets: this.sharedState.assets
      });
      
      // Also dispatch general state changed
      this.dispatch.call('sharedStateChanged', this, {
        property: 'assets',
        value: this.sharedState.assets,
        source,
        state: this.sharedState
      });
    }
    return this;
  }
  
  /**
   * Update asset state directly (without legacy mapping)
   * @param {string} assetType - Asset type in new format 'coarse.severityCogUrls' or 'refined.geojsonUrl'
   * @param {any} value - New value
   * @param {string} source - Source component name
   */
  updateAsset(assetType, value, source) {
    // Parse the asset type to get the group and property
    const [assetGroup, assetProperty] = assetType.split('.');
    
    // Validate that we have a proper format
    if (!assetGroup || !assetProperty || 
        !this.sharedState.assets[assetGroup] ||
        !(assetProperty in this.sharedState.assets[assetGroup])) {
      console.warn(`Invalid asset type: ${assetType}. Expected format: 'group.property'`);
      return this;
    }
    
    // Use updateNestedAsset with the parsed components
    this.updateNestedAsset(assetGroup, assetProperty, value, source);
    
    return this;
  }
  
  /**
   * Set the active severity metric
   * @param {string} metric - Metric name (RBR, dNBR, or RdNBR)
   * @param {string} source - Source component name
   */
  setActiveMetric(metric, source) {
    if (this.sharedState.activeMetric !== metric) {
      this.sharedState.activeMetric = metric;
      
      this.dispatch.call('activeMetricChanged', this, {
        value: metric,
        source,
      });
      
      // Also dispatch general state changed
      this.dispatch.call('sharedStateChanged', this, {
        property: 'activeMetric',
        value: metric,
        source,
        state: this.sharedState
      });
    }
    return this;
  }
  
  /**
   * Get the active COG URL based on current metric and refinement status
   * @param {boolean} useRefined - Whether to use refined COG URLs
   * @returns {string|null} The active COG URL
   */
  getActiveCogUrl(useRefined = false) {
    const metric = this.sharedState.activeMetric;
    const assetGroup = useRefined ? 'refined' : 'coarse';
    
    return this.sharedState.assets[assetGroup].severityCogUrls[metric] || null;
  }
  
  /**
   * Get all available metrics for a given refinement status
   * @param {boolean} useRefined - Whether to check refined COG URLs
   * @returns {string[]} Array of available metric names
   */
  getAvailableMetrics(useRefined = false) {
    const assetGroup = useRefined ? 'refined' : 'coarse';
    return Object.keys(this.sharedState.assets[assetGroup].severityCogUrls);
  }
  
  /**
   * Get the shared state
   * @returns {Object} Current shared state
   */
  getSharedState() {
    return { ...this.sharedState };
  }
}

// Create singleton instance
const stateManager = new StateManager();

export default stateManager;