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
    
    // Create dispatcher for state events
    this.dispatch = dispatch('state_shared', 'component_registered', 'component_removed');
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
   * @param {string} eventName - Event name to subscribe to ('state_shared', 'component_registered', 'component_removed')
   * @param {Function} callback - Callback function
   */
  on(eventName, callback) {
    this.dispatch.on(eventName, callback);
    return this;
  }
  
  /**
   * Share state from one component to another
   * @param {string} source - Source component name
   * @param {string} target - Target component name
   * @param {Object} state - State to share
   */
  shareState(source, target, state) {
    const sourceComponent = this.components[source];
    const targetComponent = this.components[target];
    
    if (!sourceComponent || !targetComponent) {
      console.error(`Cannot share state: ${source} or ${target} not registered`);
      return;
    }
    
    // If the target has an updateFromState method, call it
    if (typeof targetComponent.updateFromFireState === 'function') {
      targetComponent.updateFromFireState(state);
    }
    
    // Dispatch state_shared event
    this.dispatch.call('state_shared', this, {
      source,
      target,
      state
    });
  }
}

// Create singleton instance
const stateManager = new StateManager();

export default stateManager;