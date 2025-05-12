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
    
    // Add the vegetation analysis button to the UI
    this.addVegetationButton();
    
    this.initialized = true;
  }
  
  /**
   * Add a button to the fire view to trigger vegetation analysis
   */
  addVegetationButton() {
    const button = document.getElementById('resolve-button');
    if (!button) {
      const refinementContainer = document.getElementById('refinement-container');
      if (refinementContainer) {
        const buttonGroup = refinementContainer.querySelector('.button-group');
        if (buttonGroup) {
          const newResolveButton = document.createElement('button');
          newResolveButton.id = 'resolve-button';
          newResolveButton.className = 'action-button';
          newResolveButton.textContent = 'Analyze Vegetation Impact';
          newResolveButton.addEventListener('click', () => {
            const vegPresenter = stateManager.getComponent('vegetation');
            if (vegPresenter) {
              vegPresenter.handleVegMapResolution();
            }
          });
          
          buttonGroup.appendChild(newResolveButton);
        }
      }
    }
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