/**
 * Contract interfaces for the Vegetation Impact MVP implementation
 */

/**
 * Model interface - handles vegetation data and backend API interactions
 */
export class IVegetationModel {
  /**
   * Get the current application state
   * @returns {Object} Current state
   */
  getState() {}
  
  /**
   * Resolve fire analysis against vegetation map
   * @param {Object} data - Resolution request data
   * @returns {Promise} API response
   */
  resolveAgainstVegMap(data) {}
}

/**
 * View interface - handles UI rendering and event capture
 */
export class IVegetationView {
  /**
   * Initialize the view
   */
  initializeView() {}
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {}
  
  /**
   * Show vegetation impact analysis results
   */
  showVegetationImpact() {}
  
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
}

/**
 * Presenter interface - handles vegetation impact application logic
 */
export class IVegetationPresenter {
  /**
   * Initialize the presenter
   */
  initialize() {}
  
  /**
   * Handle vegetation map resolution
   */
  handleVegMapResolution() {}
}