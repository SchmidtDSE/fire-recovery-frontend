import * as api from '../../shared/api/api-client.js';
import { IFireModel } from './fire-contract.js';
import stateManager from '../../core/state-manager.js';

/**
 * Implementation of the Fire Model
 */
export class FireModel extends IFireModel {
  constructor() {
    super();
    
    // Event listeners
    this.listeners = {
      stateChanged: [],
      fireEventNameChanged: [],
      parkUnitChanged: [],
      fireSeverityMetricChanged: [],
      processingStatusChanged: [],
      assetsChanged: [],
      currentStepChanged: [],
      jobIdChanged: [],
      colorBreaksChanged: [],
      reset: []
    };
    
    // Register with state manager
    stateManager.registerComponent('fire', this);
    
    // Set up listeners for state manager events
    this._setupStateManagerListeners();
  }
  
  /**
   * Setup listeners for state manager events
   * @private
   */
  _setupStateManagerListeners() {
    // Listen for general state changes
    stateManager.on('sharedStateChanged', (event) => {
      if (event.source !== 'fire') {
        this.notify('stateChanged', stateManager.getSharedState());
      }
    });
    
    // Listen for specific property changes
    stateManager.on('fireEventNameChanged', (event) => {
      if (event.source !== 'fire') {
        this.notify('fireEventNameChanged', event.value);
      }
    });
    
    stateManager.on('parkUnitChanged', (event) => {
      if (event.source !== 'fire') {
        this.notify('parkUnitChanged', event.value);
      }
    });
    
    stateManager.on('processingStatusChanged', (event) => {
      if (event.source !== 'fire') {
        this.notify('processingStatusChanged', event.value);
      }
    });
    
    stateManager.on('jobIdChanged', (event) => {
      if (event.source !== 'fire') {
        this.notify('jobIdChanged', event.value);
      }
    });
    
    stateManager.on('activeMetricChanged', (event) => {
      if (event.source !== 'fire') {
        this.notify('fireSeverityMetricChanged', event.value);
      }
    });
    
    stateManager.on('currentStepChanged', (event) => {
      if (event.source !== 'fire') {
        this.notify('currentStepChanged', event.value);
      }
    });
    
    stateManager.on('assetsChanged', (event) => {
      if (event.source !== 'fire') {
        this.notify('assetsChanged', event);
      }
    });

    stateManager.on('colorBreaksChanged', (event) => {
      if (event.source !== 'fire') {
        this.notify('colorBreaksChanged', event.value);
      }
    });
  }
  
  /**
   * Add an event listener
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
    return this;
  }
  
  /**
   * Notify listeners of an event
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  notify(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
    
    // Always notify of state changed
    if (event !== 'stateChanged') {
      console.log("State Change - Event: ", event, "Data: ", data);
      console.log("Current State: ", stateManager.getSharedState());
      this.notify('stateChanged', this.getState());

    }
  }
  
  /**
   * Get the current state
   * @returns {Object} Current state
   */
  getState() {
    const sharedState = stateManager.getSharedState();
    
    // Map shared state to the model's expected state structure
    return {
      fireEventName: sharedState.fireEventName,
      parkUnit: sharedState.parkUnit,
      fireSeverityMetric: sharedState.activeMetric,
      processingStatus: sharedState.processingStatus,
      currentStep: sharedState.currentStep,
      jobId: sharedState.jobId,
      intermediateAssets: {
        cogUrl: sharedState.assets.coarse.severityCogUrls[sharedState.activeMetric] || null,
        geojsonUrl: sharedState.assets.coarse.geojsonUrl
      },
      finalAssets: {
        cogUrl: sharedState.assets.refined.severityCogUrls[sharedState.activeMetric] || null,
        geojsonUrl: sharedState.assets.refined.geojsonUrl
      }
    };
  }
  
  /**
   * Set fire event name
   * @param {string} name - Fire event name
   */
  setFireEventName(name) {
    stateManager.updateSharedState('fireEventName', name, 'fire');
    this.notify('fireEventNameChanged', name);
    return this;
  }
  
  /**
   * Set park unit
   * @param {Object} unit - Park unit data
   */
  setParkUnit(unit) {
    stateManager.updateSharedState('parkUnit', unit, 'fire');
    this.notify('parkUnitChanged', unit);
    return this;
  }
  
  /**
   * Set job ID
   * @param {string} jobId - Job ID
   */
  setJobId(jobId) {
    stateManager.updateSharedState('jobId', jobId, 'fire');
    this.notify('jobIdChanged', jobId);
    return this;
  }
  
  /**
   * Set fire severity metric
   * @param {string} metric - Metric type
   */
  setFireSeverityMetric(metric) {
    stateManager.setActiveMetric(metric, 'fire');
    this.notify('fireSeverityMetricChanged', metric);
    return this;
  }
  
  /**
   * Set processing status
   * @param {string} status - Processing status
   */
  setProcessingStatus(status) {
    stateManager.updateSharedState('processingStatus', status, 'fire');
    this.notify('processingStatusChanged', status);
    return this;
  }
  
  /**
   * Set current step
   * @param {string} step - Current step
   */
  setCurrentStep(step) {
    stateManager.updateCurrentStep(step, 'fire');
    this.notify('currentStepChanged', step);
    return this;
  }
  
  /**
   * Set intermediate assets
   * @param {Object} assets - Asset URLs
   */
  setIntermediateAssets(assets) {
    // Update shared state assets
    if (assets.cogUrl) {
      // Update the nested asset structure with current metric
      const metric = stateManager.getSharedState().activeMetric;
      const severityCogUrls = {
        ...stateManager.getSharedState().assets.coarse.severityCogUrls,
        [metric]: assets.cogUrl
      };
      stateManager.updateAsset('coarse.severityCogUrls', severityCogUrls, 'fire');
    }
    
    if (assets.geojsonUrl) {
      stateManager.updateAsset('coarse.geojsonUrl', assets.geojsonUrl, 'fire');
    }
    
    this.notify('assetsChanged', { 
      type: 'intermediate', 
      assets: {
        cogUrl: assets.cogUrl || this.getState().intermediateAssets.cogUrl,
        geojsonUrl: assets.geojsonUrl || this.getState().intermediateAssets.geojsonUrl
      } 
    });
    return this;
  }
  
  /**
   * Set final assets
   * @param {Object} assets - Asset URLs
   */
  setFinalAssets(assets) {
    // Update shared state assets
    if (assets.cogUrl) {
      // Update the nested asset structure with current metric
      const metric = stateManager.getSharedState().activeMetric;
      const severityCogUrls = {
        ...stateManager.getSharedState().assets.refined.severityCogUrls,
        [metric]: assets.cogUrl
      };
      stateManager.updateAsset('refined.severityCogUrls', severityCogUrls, 'fire');
    }
    
    if (assets.geojsonUrl) {
      stateManager.updateAsset('refined.geojsonUrl', assets.geojsonUrl, 'fire');
    }
    
    this.notify('assetsChanged', { 
      type: 'final', 
      assets: {
        cogUrl: assets.cogUrl || this.getState().finalAssets.cogUrl,
        geojsonUrl: assets.geojsonUrl || this.getState().finalAssets.geojsonUrl
      }
    });
    return this;
  }
  
  /**
   * Reset the state
   */
  resetState() {
    // Clear assets
    stateManager.updateAsset('coarse.geojsonUrl', null, 'fire');
    stateManager.updateAsset('coarse.severityCogUrls', {}, 'fire');
    stateManager.updateAsset('refined.geojsonUrl', null, 'fire');
    stateManager.updateAsset('refined.severityCogUrls', {}, 'fire');
    
    // Reset status and step
    stateManager.updateSharedState('processingStatus', 'idle', 'fire');
    stateManager.updateCurrentStep('upload', 'fire');
    stateManager.updateSharedState('jobId', null, 'fire');
    
    this.notify('reset');
    return this;
  }
  
  /**
   * Reset to refinement step
   * Keeps intermediate assets but clears final assets
   */
  resetToRefinementStep() {
    // Clear final assets
    stateManager.updateAsset('refined.geojsonUrl', null, 'fire');
    stateManager.updateAsset('refined.severityCogUrls', {}, 'fire');
    
    // Set status and step
    stateManager.updateSharedState('processingStatus', 'success', 'fire');
    stateManager.updateCurrentStep('refine', 'fire');
    
    this.notify('resetToRefinement');
    return this;
  }

  /**
   * Set fire date ranges
   * @param {Array} prefireDateRange - [startDate, endDate] for prefire period
   * @param {Array} postfireDateRange - [startDate, endDate] for postfire period
   */
  setFireDateRanges(prefireDateRange, postfireDateRange) {
    stateManager.updateSharedState('prefireStartDate', prefireDateRange[0], 'fire');
    stateManager.updateSharedState('prefireEndDate', prefireDateRange[1], 'fire');
    stateManager.updateSharedState('postfireStartDate', postfireDateRange[0], 'fire');
    stateManager.updateSharedState('postfireEndDate', postfireDateRange[1], 'fire');

    return this;
  }

  /**
   * Analyze fire severity
   * @param {Object} data - Request data
   */
  async analyzeFire(data) {
    this.setProcessingStatus('processing');
    
    try {
      const response = await api.analyzeFire(data);

      // Update shared state with fire event dates
      this.setFireDateRanges(data.prefire_date_range, data.postfire_date_range);

      // Store the job ID for later use in refinement
      this.setJobId(response.job_id);
      
      // Poll for results
      const result = await api.pollUntilComplete(() => 
        api.getFireAnalysisStatus(response.fire_event_name, response.job_id)
      );
      
      // Get the current active metric
      const metric = stateManager.getSharedState().activeMetric;
      
      this.setProcessingStatus('success')
        .setCurrentStep('refine')
        .setFireEventName(result.fire_event_name);
      
      // Update all severity COG URLs at once
      if (result.coarse_severity_cog_urls) {
        stateManager.updateAsset('coarse.severityCogUrls', result.coarse_severity_cog_urls, 'fire');
        
        // Notify of asset change
        this.notify('assetsChanged', { 
          type: 'intermediate', 
          assets: {
            cogUrl: result.coarse_severity_cog_urls[metric] || null,
            geojsonUrl: result.geojson_url || null
          } 
        });
      }
      
      // Set geojson URL separately
      if (result.geojson_url) {
        stateManager.updateAsset('coarse.geojsonUrl', result.geojson_url, 'fire');
      }
        
      return result;
    } catch (error) {
      this.setProcessingStatus('error');
      throw error;
    }
  }
  
  /**
   * Submit refinement
   * @param {Object} data - Refinement data
   */
  async submitRefinement(data) {
    this.setProcessingStatus('processing');
    
    try {
      const jobId = stateManager.getSharedState().jobId;
      if (jobId) {
        data.job_id = jobId;
      }
      
      const response = await api.submitRefinement(data);
      
      // Poll for results
      const result = await api.pollUntilComplete(() => 
        api.getRefinementStatus(response.fire_event_name, response.job_id)
      );

      this.setProcessingStatus('success');
      
      // Get the current active metric
      const metric = stateManager.getSharedState().activeMetric;
      
      // Update all severity COG URLs at once
      if (result.refined_severity_cog_urls) {
        stateManager.updateAsset('refined.severityCogUrls', result.refined_severity_cog_urls, 'fire');
        
        // Notify of asset change
        this.notify('assetsChanged', { 
          type: 'final', 
          assets: {
            cogUrl: result.refined_severity_cog_urls[metric] || null,
            geojsonUrl: result.refined_geojson_url || null
          } 
        });
      }
      
      // Set geojson URL separately
      if (result.refined_boundary_geojson_url) {
        stateManager.updateAsset('refined.geojsonUrl', result.refined_boundary_geojson_url, 'fire');
      }
        
      return result;
    } catch (error) {
      this.setProcessingStatus('error');
      throw error;
    }
  }
}