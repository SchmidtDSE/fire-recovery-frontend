import * as api from '../../shared/api/api-client.js';
import { IVegetationModel } from './veg-contract.js';

/**
 * Implementation of the Vegetation Model
 */
export class VegetationModel extends IVegetationModel {
  constructor() {
    super();
    // Initial state
    this.state = {
      fireEventName: null,
      parkUnit: null,
      cogUrl: null,
      processingStatus: 'idle',
      vegMapResults: null
    };
    
    // Event listeners
    this.listeners = {
      stateChanged: [],
      processingStatusChanged: [],
      resultsChanged: []
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
   * Update state from fire model
   * @param {Object} fireState - Fire model state
   */
  updateFromFireState(fireState) {
    this.state.fireEventName = fireState.fireEventName || this.state.fireEventName;
    this.state.parkUnit = fireState.parkUnit || this.state.parkUnit;
    this.state.cogUrl = fireState.finalAssets?.cogUrl || this.state.cogUrl;
    this.notify('stateChanged', this.state);
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
   * Set vegetation map results
   * @param {Object} results - Vegetation map results
   */
  setResults(results) {
    this.state.vegMapResults = results;
    this.notify('resultsChanged', results);
    return this;
  }
  
  /**
   * Resolve against vegetation map
   * @param {Object} data - Resolution data
   */
  async resolveAgainstVegMap(data) {
    this.setProcessingStatus('processing');
    
    try {
      const response = await api.resolveAgainstVegMap(data);
      
      // Poll for results
      const result = await api.pollUntilComplete(() => 
        api.getVegMapResult(response.fire_event_name, response.job_id)
      );
      
      this.setProcessingStatus('success')
        .setResults(result);
        
      return result;
    } catch (error) {
      this.setProcessingStatus('error');
      throw error;
    }
  }
}