import * as api from '../../shared/api/api-client.js';
import { IVegetationModel } from './veg-contract.js';
import stateManager from '../../core/state-manager.js';

/**
 * Implementation of the Vegetation Model
 */
export class VegetationModel extends IVegetationModel {
  constructor() {
    super();
    
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
        this.notify('stateChanged', this.getState());
      }
    });
    
    // Listen for specific property changes
    stateManager.on('processingStatusChanged', (event) => {
      if (event.source !== 'vegetation') {
        this.notify('processingStatusChanged', event.value);
      }
    });
    
    stateManager.on('jobIdChanged', (event) => {
      if (event.source !== 'vegetation') {
        this.notify('jobIdChanged', event.value);
      }
    });
    
    stateManager.on('vegMapResultsChanged', (event) => {
      if (event.source !== 'vegetation') {
        this.notify('resultsChanged', event.value);
      }
    });
    
    stateManager.on('assetsChanged', (event) => {
      if (event.source !== 'vegetation') {
        this.notify('stateChanged', this.getState());
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
      jobId: sharedState.jobId,
      processingStatus: sharedState.processingStatus,
      cogUrl: sharedState.assets.refined.severityCogUrls[sharedState.activeMetric] || null,
      vegMapResults: sharedState.vegMapResults
    };
  }

  /**
   * Update state from fire model
   * @param {Object} fireState - Fire model state
   */
  updateFromFireState(fireState) {
    // Since we're using shared state, this is mostly a no-op now
    // Just notify that state changed for any components listening to this model
    this.notify('stateChanged', this.getState());
    return this;
  }
  
  /**
   * Set processing status
   * @param {string} status - Processing status
   */
  setProcessingStatus(status) {
    stateManager.updateSharedState('processingStatus', status, 'vegetation');
    this.notify('processingStatusChanged', status);
    return this;
  }
  
  /**
   * Set job ID
   * @param {string} jobId - Job ID
   */
  setJobId(jobId) {
    stateManager.updateSharedState('jobId', jobId, 'vegetation');
    this.notify('jobIdChanged', jobId);
    return this;
  }
  
  /**
   * Set vegetation map results
   * @param {Object} results - Vegetation map results
   */
  setResults(results) {
    stateManager.updateVegMapResults(results, 'vegetation');
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