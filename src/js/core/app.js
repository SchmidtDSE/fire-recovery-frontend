import stateManager from './state-manager.js';
import { FireFactory } from '../fire/FireFactory.js';
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
    
    // Initialize fire severity components
    const fireComponents = FireFactory.create();
    this.components.fire = fireComponents;
    
    // Initialize vegetation impact components
    const vegComponents = VegetationFactory.create({
      // We'll implement a concrete view adapter later
      // For now, use a minimal implementation
      initializeView() {},
      setupEventListeners() {},
      updateVegMapTable() {},
      showLoadingState() {},
      showSuccessState() {},
      showErrorState() {},
      setPresenter(presenter) { this.presenter = presenter; }
    });
    this.components.vegetation = vegComponents;
    
    // Register components with state manager
    stateManager.registerComponent('fire', fireComponents.presenter);
    stateManager.registerComponent('vegetation', vegComponents.presenter);
    
    // Initialize presenters
    fireComponents.presenter.initialize();
    vegComponents.presenter.initialize();
    
    // Set up inter-component communication
    this.setupStateSharing();
    
    this.initialized = true;
  }
  
  /**
   * Set up state sharing between components
   */
  setupStateSharing() {
    // Listen for state changes in fire component to update vegetation component
    this.components.fire.model.on('stateChanged', (state) => {
      // When fire model state changes, share it with vegetation component
      stateManager.shareState('fire', 'vegetation', state);
    });
    
    // Add button to fire view to trigger vegetation analysis
    this.addVegetationButton();
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