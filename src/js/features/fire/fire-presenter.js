import { IFirePresenter } from './fire-contract.js';
import * as api from '../../shared/api/api-client.js';
import stateManager from '../../core/state-manager.js';

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
      // Check if there's a GeoJSON URL to display
      if (data.assets && data.assets.geojsonUrl) {
        // Tell the view to display the GeoJSON
        this.view.displayGeoJSONFromUrl(data.assets.geojsonUrl, {
          clearExisting: true  // Clear user drawings when showing the refined boundary
        });
      }

      // Refresh the map visualization to show the latest COG
      // This handles both coarse and refined COGs correctly
      this.view.refreshMapVisualization();

      // Update vegetation button state when assets change
      // This ensures the button enables/disables based on available data
      this.addVegetationButton();
    });

    this.model.on('colorBreaksChanged', (colorBreaksData) => {
      // Refresh the map visualization when color breaks change
      this.view.refreshMapVisualization();
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
    const drawnGeometry = this.view.getGeometryFromMap();
    const geoJsonGeometry = this.view.getActiveGeoJson();
    
    // Use the manually drawn geometry if available, otherwise use the geometry from the layer group
    const geometry = drawnGeometry || geoJsonGeometry;
    
    // Validate inputs
    if (!geometry) {
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
      this.model.setFireEventName(fireEventName);
    }

    try {
      // First, upload the coarse boundary as GeoJSON
      await this.model.submitCoarseGeojson(fireEventName, geometry);
      
      // Format data for fire analysis API request
      const fireSevData = {
        fire_event_name: fireEventName,
        coarse_geojson: geometry,
        prefire_date_range: [
          formValues.prefireStart,
          formValues.prefireEnd
        ],
        postfire_date_range: [
          formValues.postfireStart,
          formValues.postfireEnd
        ]
      };
      
      // Then analyze the fire
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

    // Check if refined boundary was already set (e.g., from shapefile upload)
    // If so, automatically copy coarse COGs to refined and move to resolve step
    const sharedState = stateManager.getSharedState();
    const coarseGeojsonUrl = sharedState.assets?.coarse?.geojsonUrl;
    const refinedGeojsonUrl = sharedState.assets?.refined?.geojsonUrl;

    // If both URLs exist and are the same, shapefile was uploaded
    if (coarseGeojsonUrl && refinedGeojsonUrl && coarseGeojsonUrl === refinedGeojsonUrl) {
      // Copy coarse COG URLs to refined
      const coarseCogUrls = sharedState.assets?.coarse?.severityCogUrls || {};
      if (Object.keys(coarseCogUrls).length > 0) {
        stateManager.updateAsset('refined.severityCogUrls', coarseCogUrls, 'fire');

        // Move to resolve step
        stateManager.updateCurrentStep('resolve', 'fire');

        // Show metrics and table
        this.view.showMetricsAndTable();

        // Show accept button as already accepted
        this.view.showAcceptSuccessState();

        // Add vegetation button (will be enabled since both boundary and COGs exist)
        this.addVegetationButton();
      }
    }
    this.view.refreshMapVisualization();
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
      refined_geojson: refinedGeometry
    };
    
    try {
      await this.model.submitRefinement(refinementData);
      // The view will automatically update based on model state changes
    } catch (error) {
      this.view.showErrorState(`Error submitting refinement: ${error.message}`);
    }
  }


  /**
   * Submit the coarse boundary as the refined boundary
   * Uses the existing coarse geometry from state manager
   * @returns {Promise<Object>} Result of the refinement
   */
  async submitCoarseAsRefined() {
    const state = this.model.getState();
    const fireEventName = state.fireEventName;
    
    if (!fireEventName) {
      throw new Error('No fire event name set');
    }
    
    // Get the coarse geometry - either from the map or from the state
    let geometry = this.view.getActiveGeoJson();
    
    if (!geometry) {
      throw new Error('No boundary available to accept');
    }
    
    // Submit the coarse geometry as the refined boundary
    const refinementData = {
      fire_event_name: fireEventName,
      refined_geojson: geometry
    };
    
    return await this.model.submitRefinement(refinementData);
  }

  /**
   * Handle refinement acceptance
   */
  async handleAcceptRefinement() {
    try {
      const state = this.model.getState();

      // If we don't already have refined assets, create them and wait for completion
      if (!state.finalAssets.geojsonUrl || !state.finalAssets.cogUrl) {
        await this.submitCoarseAsRefined();

        // Wait for the state to be updated with the new refined assets
        // The submitRefinement in submitCoarseAsRefined() will trigger model events
        // when the polling completes, so we need to get the updated state
        const updatedState = this.model.getState();
        if (!updatedState.finalAssets.geojsonUrl) {
          throw new Error('Failed to create refined boundary assets');
        }
      }

      // Move to resolve step and update UI
      stateManager.updateCurrentStep('resolve', 'fire');
      this.view.showMetricsAndTable();

      // Display the refined boundary - get fresh URL from state
      const refinedGeojsonUrl = stateManager.getActiveGeojsonUrl(true);
      if (refinedGeojsonUrl) {
        this.view.displayGeoJSONFromUrl(refinedGeojsonUrl, {
          clearExisting: true
        });
      }

      // Show success state for accept button
      this.view.showAcceptSuccessState();

      // Add vegetation button
      this.addVegetationButton();

    } catch (error) {
      console.error('Error accepting boundary:', error);
      this.view.showErrorState(`Error accepting boundary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle shapefile upload completion
   * When a user uploads a shapefile, treat it as BOTH coarse and refined boundary
   * User still needs to run fire severity analysis to generate COG data
   * @param {Object} response - API response from shapefile upload
   * @param {string} fireEventName - Fire event name
   */
  async handleShapefileUploadComplete(response, fireEventName) {
    try {
      // Update fire event name if provided
      if (fireEventName) {
        stateManager.updateSharedState('fireEventName', fireEventName, 'fire');
      }

      // Update state with the boundary GeoJSON URL
      // Set it as BOTH coarse and refined since shapefile is the final boundary
      // The backend returns the URL where the shapefile was stored as GeoJSON
      if (response.geojson_url) {
        // Set as coarse boundary so fire severity analysis can use it
        stateManager.updateNestedAsset('coarse', 'geojsonUrl', response.geojson_url, 'fire');
        // Also set as refined boundary since this is the user's final boundary
        stateManager.updateNestedAsset('refined', 'geojsonUrl', response.geojson_url, 'fire');
      }

      // NOTE: We do NOT update currentStep to 'resolve' here
      // User still needs to fill out dates and run fire severity analysis
      // Once that completes and creates COGs, THEN we can move to 'resolve'

    } catch (error) {
      console.error('Error processing shapefile upload:', error);
      this.view.showErrorState(`Error processing shapefile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add Vegetation Analysis Button
   * Button is only enabled if BOTH refined boundary AND fire severity data exist
   */
  addVegetationButton() {
    // Target specifically the button group inside the refinement container
    const buttonGroup = document.querySelector('#refinement-container .button-group');
    if (!buttonGroup) return;

    // Check if we have both requirements:
    // 1. Refined boundary (geojsonUrl)
    // 2. Fire severity data (at least one COG URL)
    const sharedState = stateManager.getSharedState();
    const hasRefinedBoundary = sharedState.assets?.refined?.geojsonUrl != null;
    const refinedMetrics = stateManager.getAvailableMetrics(true); // true = refined
    const hasSeverityData = refinedMetrics.length > 0;

    // Button should only be enabled when BOTH conditions are met
    const canAnalyzeVegetation = hasRefinedBoundary && hasSeverityData;

    // Determine appropriate tooltip message
    let tooltipMessage = '';
    if (!hasRefinedBoundary && !hasSeverityData) {
      tooltipMessage = 'Please complete fire severity analysis and boundary refinement first';
    } else if (!hasSeverityData) {
      tooltipMessage = 'Please complete fire severity analysis before analyzing vegetation impact';
    } else if (!hasRefinedBoundary) {
      tooltipMessage = 'Please complete boundary refinement before analyzing vegetation impact';
    }

    // Check if button already exists
    let resolveButton = document.getElementById('resolve-button');
    if (resolveButton) {
      // Update existing button state
      resolveButton.disabled = !canAnalyzeVegetation;
      resolveButton.innerHTML = '<i class="fas fa-leaf"></i> Analyze Vegetation Impact';

      if (!canAnalyzeVegetation) {
        resolveButton.title = tooltipMessage;
        resolveButton.style.opacity = '0.5';
        resolveButton.style.cursor = 'not-allowed';
      } else {
        resolveButton.title = '';
        resolveButton.style.opacity = '1';
        resolveButton.style.cursor = 'pointer';
      }
      return;
    }

    // Create new button if it doesn't exist
    resolveButton = document.createElement('button');
    resolveButton.id = 'resolve-button';
    resolveButton.className = 'action-button';
    resolveButton.innerHTML = '<i class="fas fa-leaf"></i> Analyze Vegetation Impact';

    // Set initial state based on whether both requirements are met
    resolveButton.disabled = !canAnalyzeVegetation;

    if (!canAnalyzeVegetation) {
      resolveButton.title = tooltipMessage;
      resolveButton.style.opacity = '0.5';
      resolveButton.style.cursor = 'not-allowed';
    }

    // Add event listener
    resolveButton.addEventListener('click', async () => {
      // Show loading state on the button
      const originalText = resolveButton.innerHTML;
      resolveButton.disabled = true;
      resolveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';

      try {
        const vegPresenter = window.app.components.vegetation.presenter;
        if (vegPresenter) {
          await vegPresenter.handleVegMapResolution();
        }
      } catch (error) {
        console.error('Vegetation analysis failed:', error);
      } finally {
        // Reset button state
        resolveButton.disabled = false;
        resolveButton.innerHTML = originalText;
      }
    });

    // Add to DOM
    buttonGroup.appendChild(resolveButton);
  }


  /**
   * Update map visualization based on selected metric
   */
  updateMapVisualization() {
    // Delegate to view's refreshMapVisualization which handles all the logic
    // for selecting the correct COG (coarse vs refined) based on state
    this.view.refreshMapVisualization();
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

  refreshFromImportedState(state) {
    console.log('Refreshing Fire UI from imported state');
    
    // First disable all action buttons except Reset
    this.view.disableActionButtons(['refine', 'accept', 'analyze-vegetation']);
    this.view.enableActionButtons(['reset']);

    // Reset the UI elements from input
    if (state.fireEventName) {
      this.model.setFireEventName(state.fireEventName);
    }

    if (state.parkUnit) {
      this.model.setParkUnit(state.parkUnit);
    }
    
    if (state.jobId) {
      this.model.setJobId(state.jobId);
    }
    
    if (state.activeMetric) {
      this.model.setFireSeverityMetric(state.activeMetric);
    }
  
    if (state.colorBreaks && state.colorBreaks.breaks) {
      this.view.updateColorBreakUI(state.colorBreaks.breaks);
    }

    // Update view based on current step
    switch(state.currentStep) {
      case 'upload':
        // In upload step, all refinement buttons should be disabled
        break;
        
      case 'refine':
        // In refinement step, enable refine button when a shape is drawn
        this.view.showRefinementUI();
        
        // Show the intermediate COG (coarse boundary)
        const coarseCogUrl = stateManager.getActiveCogUrl(false);
        if (coarseCogUrl) {
          this.view.displayCOGLayer(coarseCogUrl);
        }
        
        // Display coarse GeoJSON if available
        if (state.assets?.coarse?.geojsonUrl) {
          this.view.displayGeoJSONFromUrl(state.assets.coarse.geojsonUrl);
        }

        break;
        
      case 'resolve':
        // In resolve step, show refined results and vegetation button
        this.view.showRefinementUI();
        this.view.enableActionButtons(['analyze-vegetation']);
        
        // Display refined COG layer
        const refinedCogUrl = stateManager.getActiveCogUrl(true);
        if (refinedCogUrl) {
          this.view.displayCOGLayer(refinedCogUrl);
          this.view.showMetricsAndTable();
        }
        
        // Display refined GeoJSON if available
        if (state.assets?.refined?.geojsonUrl) {
          this.view.displayGeoJSONFromUrl(state.assets.refined.geojsonUrl);
        }

        break;
    }
    
    // Update date information if available from state
    if (state.prefireStartDate && state.prefireEndDate && 
        state.postfireStartDate && state.postfireEndDate) {
      this.view.showDateSummary({
        prefireStart: state.prefireStartDate,
        prefireEnd: state.prefireEndDate,
        postfireStart: state.postfireStartDate,
        postfireEnd: state.postfireEndDate
      });
    }
    
    // Update fire event name in UI
    if (state.fireEventName) {
      const nameInput = document.getElementById('fire-event-name');
      if (nameInput) nameInput.value = state.fireEventName;
    }
    
    // Update active metric selector
    if (state.activeMetric) {
      const metricSelect = document.getElementById('fire-severity-metric-select');
      if (metricSelect) metricSelect.value = state.activeMetric;
    }
    
    // Update park unit dropdown
    if (state.parkUnit && state.parkUnit.id) {
      const parkSelect = document.getElementById('park-unit');
      if (parkSelect) parkSelect.value = state.parkUnit.id;
    }
  }
}