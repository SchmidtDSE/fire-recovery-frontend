import { IVegetationPresenter } from './veg-contract.js';
import { vegMapCOG } from '../../core/config.js';
import stateManager from '../../core/state-manager.js';

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
  
  async handleVegMapResolution() {

    // Get the current application state
    const fireState = stateManager.getSharedState('fire');
    const vegState = this.model.getState();
    
    // Check for required data
    const fireEventName = fireState.fireEventName || vegState.fireEventName;
    const refinedCogUrl = fireState.assets.refinedCogUrl; // This should be the final severity COG
    const parkUnit = vegState.parkUnit || fireState.parkUnit;
    
    if (!fireEventName || !refinedCogUrl) {
      this.view.showMessage('Error: Missing fire event name or severity data. Complete fire analysis first.', 'error');
      return;
    }
    
    // Get vegetation geopackage URL from park unit
    const vegGpkgUrl = parkUnit?.veg_geopkg_url;
    
    if (!vegGpkgUrl) {
      this.view.showMessage('Error: No vegetation data available for this park unit', 'error');
      return;
    }
    
    // Prepare data for API request
    const resolveData = {
      fire_event_name: fireEventName,
      job_id: vegState.jobId,
      veg_gpkg_url: vegGpkgUrl,
      fire_cog_url: refinedCogUrl
    };
    
    try {
      // Show loading state
      this.view.showLoadingState('Analyzing vegetation impact...');
      
      // Start processing
      const result = await this.model.resolveAgainstVegMap(resolveData);
      
      // Show the vegetation impact results
      if (result.status === 'complete') {
        this.view.showVegetationImpact(result.fire_veg_matrix);
      } else {
        this.view.showMessage('Error processing vegetation data', 'error');
      }
    } catch (error) {
      console.error('Vegetation analysis error:', error);
      this.view.showMessage(`Error: ${error.message}`, 'error');
    }
  }
}