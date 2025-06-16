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
      
      // Handle COG URL (existing functionality)
      const useRefined = data.type === 'final';
      const cogUrl = stateManager.getActiveCogUrl(useRefined);
      
      if (cogUrl) {
        this.view.displayCOGLayer(cogUrl);
      }
    });

    this.model.on('colorBreaksChanged', (colorBreaksData) => {
      // Update visualization when color breaks change
      this.updateMapVisualization();
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
  async handleAcceptRefinement() {
    const state = this.model.getState();
    const fireEventName = state.fireEventName;
    
    if (!fireEventName) {
      alert('No fire event name set');
      return;
    }

    // Check if user has drawn a refinement
    const drawnGeometry = this.view.getGeometryFromMap();
    
    try {
      // If no new refinement was drawn, use the coarse boundary as the refined boundary
      if (!drawnGeometry) {
        // Get the coarse boundary URL from state
        const coarseGeojsonUrl = state.assets?.coarse?.geojsonUrl;
        
        if (!coarseGeojsonUrl) {
          alert('No boundary available to accept');
          return;
        }
        
        // Show loading state
        this.view.showLoadingState();
        
        try {
          // Fetch the coarse boundary
          const response = await fetch(coarseGeojsonUrl);
          const geojsonData = await response.json();
          
          // Extract the geometry from the GeoJSON
          let geometry;
          if (geojsonData.features && geojsonData.features.length > 0) {
            geometry = geojsonData.features[0].geometry;
          } else if (geojsonData.geometry) {
            geometry = geojsonData.geometry;
          } else {
            geometry = geojsonData; // If it's already just the geometry
          }
          
          // Submit the coarse geometry as the refined boundary
          const refinementData = {
            fire_event_name: fireEventName,
            refine_geojson: {
              geometry: geometry
            }
          };
          
          await this.model.submitRefinement(refinementData);
        } catch (error) {
          console.error('Error processing coarse boundary:', error);
          this.view.showErrorState(`Error accepting boundary: ${error.message}`);
          return;
        }
      } 
      // If a new refinement was drawn, we assume it has been handled already
      // using the normal refinement submission flow
      
      // Handle successful acceptance (same for both paths)
      stateManager.updateCurrentStep('resolve', 'fire');
      this.view.showMetricsAndTable();
      
      // Display the refined boundary
      const refinedGeojsonUrl = stateManager.getSharedState().assets?.refined?.geojsonUrl;
      if (refinedGeojsonUrl) {
        this.view.displayGeoJSONFromUrl(refinedGeojsonUrl, {
          clearExisting: true
        });
      }
      
      // Add vegetation button
      this.addVegetationButton();
      
    } catch (error) {
      console.error('Error accepting boundary:', error);
      this.view.showErrorState(`Error accepting boundary: ${error.message}`);
    }
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