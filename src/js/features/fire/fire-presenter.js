import { IFirePresenter } from './fire-contract.js';
import * as api from '../../shared/api/api-client.js';

/**
 * Implementation of the Fire Presenter
 */
export class FirePresenter extends IFirePresenter {
  /**
   * @param {IFireView} view - The view
   * @param {IFireModel} model - The model
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
        this.view.showErrorState('An error occurred');
      }
    });
    
    this.model.on('currentStepChanged', (step) => {
      if (step === 'refine') {
        this.view.showRefinementUI();
      }
    });
    
    this.model.on('assetsChanged', (data) => {
      // Use state manager to get the current active COG URL instead of direct access
      const useRefined = data.type === 'final';
      const cogUrl = stateManager.getActiveCogUrl(useRefined);
      
      if (cogUrl) {
        this.view.displayCOGLayer(cogUrl);
      }
    });
  }
  
  /**
   * Handle fire event name change
   * @param {string} name - Fire event name
   */
  handleFireEventNameChange(name) {
    this.model.setFireEventName(name);
  }
  
  /**
   * Handle park unit change
   * @param {Object} parkUnit - Park unit data
   */
  handleParkUnitChange(parkUnit) {
    this.model.setParkUnit(parkUnit);
  }
  
  /**
   * Handle metric change
   * @param {string} metric - Metric type
   */
  handleMetricChange(metric) {
    this.model.setFireSeverityMetric(metric);
    this.updateMapVisualization();
  }
  
  
  /**
   * Handle fire analysis submission
   */
  async handleFireAnalysisSubmission() {
    const formValues = this.view.getFormValues();
    const geometry = this.view.getGeometryFromMap();
    
    // Validate inputs
    if (!geometry && this.view.geoJsonLayerGroup.getLayers().length === 0) {
      alert('Please either draw a polygon on the map or upload a shapefile');
      return;
    }

    if (!formValues.prefireStart || !formValues.prefireEnd || 
        !formValues.postfireStart || !formValues.postfireEnd) {
      alert('Please fill in all date fields');
      return;
    }
    
    // Get fire event name or use placeholder
    const fireEventName = formValues.fireEventName || `Fire_${new Date().getTime()}`;
    
    // Update fire event name in model if provided
    if (formValues.fireEventName) {
      this.model.setFireEventName(formValues.fireEventName);
    }
    
    // Format data for API request
    const fireSevData = {
      fire_event_name: fireEventName,
      geometry: geometry || this.view.geoJsonLayerGroup.toGeoJSON().features[0].geometry,
      prefire_date_range: [
        formValues.prefireStart,
        formValues.prefireEnd
      ],
      postfire_date_range: [
        formValues.postfireStart,
        formValues.postfireEnd
      ]
    };
    
    try {
      const result = await this.model.analyzeFire(fireSevData);
      this.handleAnalysisComplete(result, formValues);
    } catch (error) {
      this.view.showErrorState(`Error: ${error.message}`);
    }
  }

  /**
   * Handle analysis completion
   * @param {Object} result - Analysis result
   * @param {Object} formValues - Form values
   */
  handleAnalysisComplete(result, formValues) {
    // The view will automatically update based on model state changes
    this.view.showDateSummary(formValues);
  }
  
  /**
   * Handle refinement submission
   */
  async handleRefinementSubmission() {
    const refinedGeometry = this.view.getGeometryFromMap();
    if (!refinedGeometry) {
      return;
    }
    
    const state = this.model.getState();
    const fireEventName = state.fireEventName;
    
    if (!fireEventName) {
      alert('No fire event name set. Please enter a name for this fire event.');
      return;
    }
    
    const refinementData = {
      fire_event_name: fireEventName,
      refine_geojson: {
        geometry: refinedGeometry
      }
    };
    
    try {
      await this.model.submitRefinement(refinementData);
      // The view will automatically update based on model state changes
    } catch (error) {
      this.view.showErrorState(`Error submitting refinement: ${error.message}`);
    }
  }

  /**
   * Handle refinement acceptance
   */
  handleAcceptRefinement() {
    // Update model state if needed
    const state = this.model.getState();
    
    // Show metrics and table in the view
    this.view.showMetricsAndTable();
    
    // Make sure the "Analyze Vegetation Impact" button is added
    this.addVegetationButton();
  }

  /**
   * Add Vegetation Analysis Button
   */
  addVegetationButton() {
    // Target specifically the button group inside the refinement container
    const buttonGroup = document.querySelector('#refinement-container .button-group');
    if (!buttonGroup) return;
    
    // Check if button already exists
    let resolveButton = document.getElementById('resolve-button');
    if (resolveButton) {
      // Reset it if it exists
      resolveButton.disabled = false;
      resolveButton.innerHTML = '<i class="fas fa-leaf"></i> Analyze Vegetation Impact';
      return;
    }
    
    // Create new button if it doesn't exist
    resolveButton = document.createElement('button');
    resolveButton.id = 'resolve-button';
    resolveButton.className = 'action-button';
    resolveButton.innerHTML = '<i class="fas fa-leaf"></i> Analyze Vegetation Impact';
    
    // Add event listener
    resolveButton.addEventListener('click', () => {
      const vegPresenter = window.app.components.vegetation.presenter;
      if (vegPresenter) {
        vegPresenter.handleVegMapResolution();
      }
    });
    
    // Add to DOM
    buttonGroup.appendChild(resolveButton);
  }


  /**
   * Update map visualization based on selected metric
   */
  updateMapVisualization() {
    const state = this.model.getState();
    const metric = state.activeMetric || 'RBR';
    
    // Get COG URL from state manager instead of direct access
    const useRefined = state.currentStep === 'resolve' || state.currentStep === 'complete';
    const cogUrl = stateManager.getActiveCogUrl(useRefined);
    
    if (cogUrl) {
      // Display the COG layer with the URL
      this.view.displayCOGLayer(cogUrl);
    }
  }

  
  /**
   * Handle shapefile uploaded
   * @param {File} file - Uploaded shapefile
   */
  handleShapefileUploaded(file) {
    const fireEventName = this.model.getState().fireEventName;
    if (fireEventName) {
      api.uploadShapefile(fireEventName, file)
        .then(response => {
          console.log('Shapefile uploaded to server:', response);
        })
        .catch(error => {
          console.error('Error uploading shapefile:', error);
        });
    }
  }
  
  /**
   * Handle reset action
   */
  handleReset() {
    const state = this.model.getState();
    
    // If we have finalized assets, reset to refinement step
    if (state.finalAssets && (state.finalAssets.cogUrl || state.finalAssets.geojsonUrl)) {
      this.model.resetToRefinementStep();
      this.view.resetToRefinementStep();
      
      // Display the intermediate COG
      if (state.intermediateAssets && state.intermediateAssets.cogUrl) {
        this.view.displayCOGLayer(state.intermediateAssets.cogUrl);
      }
    } else {
      // Otherwise do a full reset
      this.model.resetState();
      this.view.resetInterface();
    }
  }

}