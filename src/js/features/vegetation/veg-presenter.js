import { IVegetationPresenter } from './veg-contract.js';
import { vegMapCOG } from '../../core/config.js';

/**
 * Implementation of the Vegetation Presenter
 */
export class VegetationPresenter extends IVegetationPresenter {
  /**
   * @param {IVegetationView} view - The view
   * @param {IVegetationModel} model - The model
   */
  constructor(view, model) {
    super();
    this.view = view;
    this.model = model;
    
    // Subscribe to model events
    this.setupModelSubscriptions();
  }
  
  /**
   * Initialize the presenter
   */
  initialize() {
    this.view.initializeView();
    this.view.setupEventListeners();
  }
  
  /**
   * Set up model subscriptions
   */
  setupModelSubscriptions() {
    this.model.on('processingStatusChanged', (status) => {
      if (status === 'processing') {
        this.view.showLoadingState();
      } else if (status === 'success') {
        this.view.showSuccessState();
      } else if (status === 'error') {
        this.view.showErrorState('An error occurred analyzing vegetation impact');
      }
    });
    
    this.model.on('resultsChanged', (results) => {
      if (results && results.fire_veg_matrix) {
        this.view.updateVegMapTable(results.fire_veg_matrix);
      }
    });
  }
  
  /**
   * Update from fire model state
   * @param {Object} fireState - Fire model state
   */
  updateFromFireState(fireState) {
    this.model.updateFromFireState(fireState);
  }
  
  /**
   * Handle vegetation map resolution
   */
  async handleVegMapResolution() {
    const state = this.model.getState();
    const fireEventName = state.fireEventName;
    const parkUnit = state.parkUnit;
    const cogUrl = state.cogUrl;
    
    if (!fireEventName || !cogUrl) {
      this.view.showErrorState('Fire event name or fire analysis data not available');
      return;
    }
    
    // Get correct vegetation map URL based on park unit or use default
    const vegMapUrl = parkUnit?.veg_cog_url || vegMapCOG;
    
    const resolveData = {
      fire_event_name: fireEventName,
      veg_cog_url: vegMapUrl,
      fire_cog_url: cogUrl
    };
    
    try {
      await this.model.resolveAgainstVegMap(resolveData);
      // View will automatically update based on model events
    } catch (error) {
      this.view.showErrorState(`Error resolving against vegetation map: ${error.message}`);
    }
  }
}