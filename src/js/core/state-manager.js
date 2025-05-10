/**
 * Application state manager to coordinate between different features
 */
class StateManager {
  constructor() {
    // Registry of feature components
    this.components = {
      fire: null,
      vegetation: null,
      resources: null
    };
    
    // Listeners for state changes
    this.listeners = [];
  }
  
  /**
   * Register a feature component
   * @param {string} name - Feature name
   * @param {Object} component - Feature component (typically a presenter)
   */
  registerComponent(name, component) {
    if (this.components.hasOwnProperty(name)) {
      this.components[name] = component;
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
   * Subscribe to state changes
   * @param {Function} callback - Callback function
   */
  subscribe(callback) {
    this.listeners.push(callback);
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
    
    // Notify listeners
    this.listeners.forEach(listener => {
      listener({
        type: 'state_shared',
        source,
        target,
        state
      });
    });
  }
}

// Create singleton instance
const stateManager = new StateManager();

export default stateManager;