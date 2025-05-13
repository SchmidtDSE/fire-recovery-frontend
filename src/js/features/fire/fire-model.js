import * as api from '../../shared/api/api-client.js';
import { IFireModel } from './fire-contract.js';
import stateManager from '../../core/state-manager.js';

/**
 * Implementation of the Fire Model
 */
export class FireModel extends IFireModel {
  constructor() {
    super();
    // Initial state
    this.state = {
      fireEventName: null,
      parkUnit: null,
      fireSeverityMetric: 'RBR',
      processingStatus: 'idle',
      currentStep: 'upload',
      jobId: null,
      intermediateAssets: {
        cogUrl: null,
        geojsonUrl: null,
      },
      finalAssets: {
        cogUrl: null,
        geojsonUrl: null,
      }
    };
    
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
      reset: []
    };
    
    // Register with state manager
    stateManager.registerComponent('fire', this);
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
      console.log("State Change - Event: ", event, "Data: ", data, this.state);
      this.notify('stateChanged', this.state);
    }
  }
  
  /**
   * Get the current state
   * @returns {Object} Current state
   */
  getState() {
    return { ...this.state };
  }
  
  /**
   * Set fire event name
   * @param {string} name - Fire event name
   */
  setFireEventName(name) {
    this.state.fireEventName = name;
    stateManager.updateSharedState('fireEventName', name, 'fire');
    this.notify('fireEventNameChanged', name);
    return this;
  }
  
  /**
   * Set park unit
   * @param {Object} unit - Park unit data
   */
  setParkUnit(unit) {
    this.state.parkUnit = unit;
    stateManager.updateSharedState('parkUnit', unit, 'fire');
    this.notify('parkUnitChanged', unit);
    return this;
  }
  
  /**
   * Set job ID
   * @param {string} jobId - Job ID
   */
  setJobId(jobId) {
    this.state.jobId = jobId;
    stateManager.updateSharedState('jobId', jobId, 'fire');
    this.notify('jobIdChanged', jobId);
    return this;
  }
  
  /**
   * Set fire severity metric
   * @param {string} metric - Metric type
   */
  setFireSeverityMetric(metric) {
    this.state.fireSeverityMetric = metric;
    this.notify('fireSeverityMetricChanged', metric);
    return this;
  }
  
  /**
   * Set processing status
   * @param {string} status - Processing status
   */
  setProcessingStatus(status) {
    this.state.processingStatus = status;
    stateManager.updateSharedState('processingStatus', status, 'fire');
    this.notify('processingStatusChanged', status);
    return this;
  }
  
  /**
   * Set current step
   * @param {string} step - Current step
   */
  setCurrentStep(step) {
    this.state.currentStep = step;
    this.notify('currentStepChanged', step);
    return this;
  }
  
  /**
   * Set intermediate assets
   * @param {Object} assets - Asset URLs
   */
  setIntermediateAssets(assets) {
    this.state.intermediateAssets = {...this.state.intermediateAssets, ...assets};
    
    // Update shared state assets
    if (assets.cogUrl) {
      stateManager.updateAsset('cogUrl', assets.cogUrl, 'fire');
    }
    if (assets.geojsonUrl) {
      stateManager.updateAsset('geojsonUrl', assets.geojsonUrl, 'fire');
    }
    
    this.notify('assetsChanged', { type: 'intermediate', assets: this.state.intermediateAssets });
    return this;
  }
  
  /**
   * Set final assets
   * @param {Object} assets - Asset URLs
   */
  setFinalAssets(assets) {
    this.state.finalAssets = {...this.state.finalAssets, ...assets};
    
    // Update shared state assets
    if (assets.cogUrl) {
      stateManager.updateAsset('refinedCogUrl', assets.cogUrl, 'fire');
    }
    if (assets.geojsonUrl) {
      stateManager.updateAsset('refinedGeojsonUrl', assets.geojsonUrl, 'fire');
    }
    
    this.notify('assetsChanged', { type: 'final', assets: this.state.finalAssets });
    return this;
  }
  
  /**
   * Reset the state
   */
  resetState() {
    this.state.intermediateAssets = { cogUrl: null, geojsonUrl: null };
    this.state.finalAssets = { cogUrl: null, geojsonUrl: null };
    this.state.processingStatus = 'idle';
    this.state.currentStep = 'upload';
    this.state.jobId = null;
    this.notify('reset');
    return this;
  }
  
  /**
   * Reset to refinement step
   * Keeps intermediate assets but clears final assets
   */
  resetToRefinementStep() {
    // Keep intermediate assets, fire event name, and park unit
    this.state.finalAssets = { cogUrl: null, geojsonUrl: null };
    this.state.processingStatus = 'success';
    this.state.currentStep = 'refine';
    this.notify('resetToRefinement');
    this.notify('currentStepChanged', 'refine');
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
      
      // Store the job ID for later use in refinement
      this.setJobId(response.job_id);
      
      // Poll for results
      const result = await api.pollUntilComplete(() => 
        api.getFireAnalysisStatus(response.fire_event_name, response.job_id)
      );
      
      this.setProcessingStatus('success')
        .setCurrentStep('refine')
        .setFireEventName(result.fire_event_name)
        .setIntermediateAssets({
          cogUrl: result.cog_url,
          geojsonUrl: result.geojson_url
        });
        
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

      if (this.state.jobId) {
        data.job_id = this.state.jobId;
      }
      
      const response = await api.submitRefinement(data);
      
      // Poll for results
      const result = await api.pollUntilComplete(() => 
        api.getRefinementStatus(response.fire_event_name, response.job_id)
      );

      this.setProcessingStatus('success')
        .setFinalAssets({
          cogUrl: result.cog_url,
          geojsonUrl: result.refined_geojson_url
        });
        
      return result;
    } catch (error) {
      this.setProcessingStatus('error');
      throw error;
    }
  }
}