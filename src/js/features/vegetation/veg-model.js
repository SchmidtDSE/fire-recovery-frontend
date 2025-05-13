import * as api from '../../shared/api/api-client.js';
import { IVegetationModel } from './veg-contract.js';
import stateManager from '../../core/state-manager.js';

/**
 * Implementation of the Vegetation Model
 */
export class VegetationModel extends IVegetationModel {
  constructor() {
    super();
    // Initial state - similar to state.js but specific to vegetation
    this.state = {
      fireEventName: null,
      parkUnit: null,
      jobId: null,
      cogUrl: null,
      processingStatus: 'idle',
      vegMapResults: null
    };
    
    // Event listeners
    this.listeners = {
      stateChanged: [],
      processingStatusChanged: [],
      resultsChanged: [],
      jobIdChanged: []
    };
    
    // Register with state manager
    stateManager.registerComponent('vegetation', this);
    
    // Set up state manager listeners
    this._setupStateManagerListeners();
  }
  
  /**
   * Setup listeners for state manager updates
   * @private
   */
  _setupStateManagerListeners() {
    stateManager.on('sharedStateChanged', (event) => {
      if (event.source !== 'vegetation') {
        switch(event.property) {
          case 'fireEventName':
            this.state.fireEventName = event.value;
            break;
          case 'parkUnit':
            this.state.parkUnit = event.value;
            break;
          case 'jobId':
            this.state.jobId = event.value;
            this.notify('jobIdChanged', event.value);
            break;
          case 'processingStatus':
            this.state.processingStatus = event.value;
            this.notify('processingStatusChanged', event.value);
            break;
        }
        this.notify('stateChanged', this.state);
      }
    });
    
    stateManager.on('assetsChanged', (event) => {
      if (event.source !== 'vegetation') {
        if (event.assetType === 'refinedCogUrl') {
          this.state.cogUrl = event.value;
          this.notify('stateChanged', this.state);
        }
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
    this.state.jobId = fireState.jobId || this.state.jobId;
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
    stateManager.updateSharedState('processingStatus', status, 'vegetation');
    this.notify('processingStatusChanged', status);
    return this;
  }
  
  /**
   * Set job ID
   * @param {string} jobId - Job ID
   */
  setJobId(jobId) {
    this.state.jobId = jobId;
    stateManager.updateSharedState('jobId', jobId, 'vegetation');
    this.notify('jobIdChanged', jobId);
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
    // Update processing status
    this.setProcessingStatus('processing');
    
    try {
      // Start the processing job
      const response = await api.resolveAgainstVegMap(data);
      
      // Save the job ID
      this.setJobId(response.job_id);
      
      // Poll until the job completes
      const result = await api.pollUntilComplete(() => 
        api.getVegMapResult(response.fire_event_name, response.job_id)
      );
      
      // Update state with the results
      this.setProcessingStatus('success');
      this.setResults(result);
      
      return result;
    } catch (error) {
      this.setProcessingStatus('error');
      throw error;
    }
  }
}