import { dispatch } from 'https://cdn.jsdelivr.net/npm/d3-dispatch@3.0.1/+esm';

/**
 * Application state manager to coordinate between different features
 * Uses d3-dispatch for event handling
 */
class StateManager {
  constructor() {
    this.components = {
      fire: null,
      vegetation: null,
      resources: null
    };
    
    this.sharedState = {
      fireEventName: null,
      parkUnit: null,
      jobId: null,
      processingStatus: 'idle',
      activeMetric: 'RBR',
      currentStep: 'upload',
      vegMapResults: null,
      prefireStartDate: null,
      prefireEndDate: null,
      postfireStartDate: null,
      postfireEndDate: null,
      assets: {
        coarse: {
          geojsonUrl: null,
          severityCogUrls: {} 
        },
        refined: {
          geojsonUrl: null,
          severityCogUrls: {} 
        }
      },
      colorBreaks: {
        breaks: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
        colors: ['#F0F921', '#FDC328', '#F89441', '#E56B5D', '#CB4679', '#A82296', '#7D03A8', '#4B03A1', '#0D0887', '#0D0887']
      }
    };
    
    this.dispatch = dispatch(
      'sharedStateChanged',
      'component_registered', 
      'component_removed',
      'fireEventNameChanged',
      'parkUnitChanged',
      'jobIdChanged',
      'processingStatusChanged',
      'assetsChanged',
      'activeMetricChanged',
      'colorBreaksChanged',
      'currentStepChanged',
      'vegMapResultsChanged',
      'stateImported',
      'prefireStartDateChanged',
      'prefireEndDateChanged',
      'postfireStartDateChanged',
      'postfireEndDateChanged'
    );
  }
  
  updateCurrentStep(step, source) {
    this.sharedState.currentStep = step;
    
    this.dispatch.call('currentStepChanged', this, {
      value: step,
      source
    });
    
    this.dispatch.call('sharedStateChanged', this, {
      property: 'currentStep',
      value: step,
      source,
      state: this.sharedState
    });
    
    return this;
  }
  
  updateVegMapResults(results, source) {
    this.sharedState.vegMapResults = results;
    
    this.dispatch.call('vegMapResultsChanged', this, {
      value: results,
      source
    });
    
    this.dispatch.call('sharedStateChanged', this, {
      property: 'vegMapResults',
      value: results,
      source,
      state: this.sharedState
    });
    
    return this;
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
    const metric = this.sharedState.activeMetric.toLowerCase();
    const assetGroup = useRefined ? 'refined' : 'coarse';

    return this.sharedState.assets[assetGroup]['severityCogUrls'][metric] || null;
  }
  
  /**
   * Get the active GeoJSON URL based on refinement status
   * @param {boolean} useRefined - Whether to use refined GeoJSON URLs
   * @returns {string|null} The active GeoJSON URL
   */
  getActiveGeojsonUrl(useRefined = false) {
    const assetGroup = useRefined ? 'refined' : 'coarse';
    return this.sharedState.assets[assetGroup]['geojsonUrl'] || null;
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
   * Update color breaks and colors.
   * @param {Array} breaks - Array of break values
   * @param {Array} colors - Array of color values
   */

  updateColorBreaks(breaks, colors, source) {
    this.sharedState.colorBreaks = { breaks, colors };
    
    this.dispatch.call('colorBreaksChanged', this, {
      value: { breaks, colors },
      source
    });
    
    // Also dispatch general state changed
    this.dispatch.call('sharedStateChanged', this, {
      property: 'colorBreaks',
      value: { breaks, colors },
      source,
      state: this.sharedState
    });
    
    return this;
  }
  
  /**
   * Get the shared state
   * @returns {Object} Current shared state
   */
  getSharedState() {
    return { ...this.sharedState };
  }

  /**
   * Export the current state to a JSON object
   * @returns {Object} JSON-serializable state object
   */
  exportState() {

    const exportedState = JSON.parse(JSON.stringify(this.sharedState));
    
    exportedState._metadata = {
      exportDate: new Date().toISOString(),
      version: '1.0' // For now, just a placeholder
    };
    
    return exportedState;
  }
  
  /**
   * Import state from a JSON object, completely replacing current state
   * @param {Object} importedState - State object to import
   * @param {string} source - Source component triggering the import
   * @returns {boolean} Success status
   */
  importState(importedState, source) {
    // Validate the imported state
    if (!this._validateImportedState(importedState)) {
      console.error('Invalid state format for import');
      return false;
    }
    
    try {
      // Store metadata if present before replacing state
      const metadata = importedState._metadata;
      
      // Create a clean copy without metadata
      const cleanImport = { ...importedState };
      delete cleanImport._metadata;
      
      // Completely replace the current state
      this.sharedState = JSON.parse(JSON.stringify(cleanImport));
      
      // Notify all properties that have changed
      this._notifyStateReplaced(source);
      
      // Dispatch a special event to notify all components of the state import
      this.dispatch.call('stateImported', this, {
        source,
        state: this.sharedState,
        metadata
      });
      
      return true;
    } catch (error) {
      console.error('Error importing state:', error);
      return false;
    }
  }

  /**
   * Notify all components that the entire state has been replaced
   * @private
   * @param {string} source - Source component name
   */
  _notifyStateReplaced(source) {
    // Dispatch events for all top-level properties
    Object.entries(this.sharedState).forEach(([property, value]) => {
      // Dispatch specific property changed event if listeners exist
      const eventName = property + 'Changed';
      if (this.dispatch.on(eventName)) {
        this.dispatch.call(eventName, this, { value, source });
      }
      
      // Special handling for certain properties
      if (property === 'assets') {
        this.dispatch.call('assetsChanged', this, {
          assets: value,
          source
        });
      } else if (property === 'colorBreaks') {
        this.dispatch.call('colorBreaksChanged', this, {
          value,
          source
        });
      }
    });
    
    // Dispatch the general state changed event
    this.dispatch.call('sharedStateChanged', this, {
      property: '*',  // Indicate complete state replacement
      value: this.sharedState,
      source,
      state: this.sharedState
    });
  }
  
  /**
   * Validate an imported state object
   * @private
   * @param {Object} state - State object to validate
   * @returns {boolean} Is the state valid
   */
  _validateImportedState(state) {
    // Basic validation
    if (!state || typeof state !== 'object') {
      return false;
    }
    
    // Check for required structure - adjust based on what you consider essential
    const requiredProperties = ['assets']; // Add other must-have properties
    for (const prop of requiredProperties) {
      if (!(prop in state)) {
        console.warn(`Imported state missing required property: ${prop}`);
        return false;
      }
    }
    
    return true;
  }
}

// Create singleton instance
const stateManager = new StateManager();

export default stateManager;