import stateManager from './state-manager.js';
import { FireFactory } from '../features/fire/fire-factory.js';
import { VegetationFactory } from '../features/vegetation/veg-factory.js';

/**
 * Main application class
 */
class App {
  constructor() {
    this.initialized = false;
    this.components = {};
  }
  
  /**
   * Initialize the application
   */
  initialize() {
    if (this.initialized) return;
    
    // Initialize fire severity components first
    const fireComponents = FireFactory.create();
    this.components.fire = fireComponents;
    
    // Initialize fire presenter first to ensure map is created
    fireComponents.presenter.initialize();
    
    // Now initialize vegetation components
    const vegComponents = VegetationFactory.create();
    this.components.vegetation = vegComponents;
    
    // Register components with state manager
    stateManager.registerComponent('fire', fireComponents.presenter);
    stateManager.registerComponent('vegetation', vegComponents.presenter);
    
    // Initialize vegetation presenter
    vegComponents.presenter.initialize();

    this.initialized = true;
  }
}

// Create and initialize app on document load
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.initialize();
  
  // Make app available globally for debugging
  window.app = app;
});

export default App;