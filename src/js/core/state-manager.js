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
      assets: {
        cogUrl: null,
        geojsonUrl: null,
        refinedCogUrl: null,
        refinedGeojsonUrl: null
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
      'assetsChanged'
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
   * Update asset state
   * @param {string} assetType - Asset type (cogUrl, geojsonUrl, etc.)
   * @param {string} value - New value
   * @param {string} source - Source component name
   */
  updateAsset(assetType, value, source) {
    if (assetType in this.sharedState.assets) {
      this.sharedState.assets[assetType] = value;
      this.dispatch.call('assetsChanged', this, {
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