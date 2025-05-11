/**
 * Contract interfaces for the Fire Severity MVP implementation
 */

/**
 * Model interface - handles data and backend API interactions
 */
export class IFireModel {
  /**
   * Get the current application state
   * @returns {Object} Current state
   */
  getState() {}
  
  /**
   * Set fire event name
   * @param {string} name - The fire event name
   */
  setFireEventName(name) {}
  
  /**
   * Set park unit
   * @param {Object} unit - The park unit data
   */
  setParkUnit(unit) {}
  
  /**
   * Set fire severity metric
   * @param {string} metric - The metric type (RBR, dNBR, RdNBR)
   */
  setFireSeverityMetric(metric) {}
  
  /**
   * Analyze fire severity
   * @param {Object} data - The request data
   * @returns {Promise} API response
   */
  analyzeFire(data) {}
  
  /**
   * Submit boundary refinement
   * @param {Object} data - The refinement request
   * @returns {Promise} API response
   */
  submitRefinement(data) {}
  
  /**
   * Resolve fire against vegetation map
   * @param {Object} data - Resolution request data
   * @returns {Promise} API response
   */
  resolveAgainstVegMap(data) {}
}

/**
 * View interface - handles UI rendering and event capture
 */
export class IFireView {
  /**
   * Initialize the view
   */
  initializeView() {}
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {}
  
  /**
   * Get input values from form
   * @returns {Object} Form values
   */
  getFormValues() {}
  
  /**
   * Get geometry from map
   * @returns {Object} GeoJSON geometry
   */
  getGeometryFromMap() {}
  
  /**
   * Display loading state
   */
  showLoadingState() {}
  
  /**
   * Display success state
   */
  showSuccessState() {}
  
  /**
   * Display error state
   * @param {string} message - Error message
   */
  showErrorState(message) {}
  
  /**
   * Display COG layer on map
   * @param {string} url - COG URL
   */
  displayCOGLayer(url) {}
  
  /**
   * Update the interface for refinement phase
   */
  showRefinementUI() {}
  
  /**
   * Show metrics and vegetation table
   */
  showMetricsAndTable() {}
  
  /**
   * Reset the interface
   */
  resetInterface() {}

  /**
   * Reset to refinement step
   * Keeps intermediate assets but clears final assets
   */
  resetToRefinementStep() {}
}

/**
 * Presenter interface - handles application logic
 */
export class IFirePresenter {
  /**
   * Initialize the presenter
   */
  initialize() {}
  
  /**
   * Handle fire analysis form submission
   */
  handleFireAnalysisSubmission() {}
  
  /**
   * Handle refinement submission
   */
  handleRefinementSubmission() {}
  
  /**
   * Handle vegetation resolution submission
   */
  handleVegMapResolution() {}
  
  /**
   * Handle metric change
   * @param {string} metric - The selected metric
   */
  handleMetricChange(metric) {}
  
  /**
   * Handle park unit change
   * @param {Object} parkUnit - The selected park unit
   */
  handleParkUnitChange(parkUnit) {}
  
  /**
   * Handle reset action
   */
  handleReset() {}

  /**
   * Reset to refinement step
   * Prepares the interface for a new refinement attempt
   */
  resetToRefinementStep() {}
}