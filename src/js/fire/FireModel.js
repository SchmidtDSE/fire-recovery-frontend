import * as api from '../shared/api/api-client.js';
import { IFireModel } from './FireContract.js';

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
      reset: []
    };
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
    this.notify('fireEventNameChanged', name);
    return this;
  }
  
  /**
   * Set park unit
   * @param {Object} unit - Park unit data
   */
  setParkUnit(unit) {
    this.state.parkUnit = unit;
    this.notify('parkUnitChanged', unit);
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
    this.notify('assetsChanged', { type: 'intermediate', assets: this.state.intermediateAssets });
    return this;
  }
  
  /**
   * Set final assets
   * @param {Object} assets - Asset URLs
   */
  setFinalAssets(assets) {
    this.state.finalAssets = {...this.state.finalAssets, ...assets};
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
    this.notify('reset');
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