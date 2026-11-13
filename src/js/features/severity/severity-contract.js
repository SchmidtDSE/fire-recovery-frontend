/**
 * Contract for the fire severity MVP: collect a perimeter, dates, sensor and
 * email, and submit one batch analysis (POST /v2/severity). No polling: the
 * backend emails the requester when the analysis finishes.
 */

/**
 * @typedef {Object} SeverityForm
 * @property {string} fireEventName
 * @property {string} sensor - 'sentinel-2' | 'landsat'
 * @property {string} email
 * @property {[string, string]} prefire - [start, end] ISO dates
 * @property {[string, string]} postfire - [start, end] ISO dates
 */

/**
 * @typedef {{kind: 'queued', jobId: string, state: string, statusUrl: string}
 *   | {kind: 'ready', jobId: string, catalogUrl: string, thumbnail: string|null,
 *      rasters: Object<string, string>, overlayUrl: string|null}} SubmitOutcome
 */

/**
 * Model: the perimeter and the request. Talks to the API; knows nothing of the DOM.
 */
export class ISeverityModel {
  /** @returns {{geometry: Object, source: 'drawn'|'uploaded'}|null} */
  getPerimeter() {}

  /**
   * Record the drawn polygon. Null (drawing deleted) only clears a drawn perimeter, not an uploaded one.
   * @param {Object|null} geometry
   */
  setDrawnPerimeter(geometry) {}

  /** Forget the perimeter. */
  clearPerimeter() {}

  /**
   * Read a perimeter file and make it the perimeter.
   * @param {File} file - Zipped shapefile or GeoJSON
   * @returns {Promise<Object>} The MultiPolygon read
   */
  loadPerimeterFile(file) {}

  /**
   * @param {SeverityForm} form
   * @returns {Object} SeverityRequest
   * @throws {Error} if there is no perimeter
   */
  buildRequest(form) {}

  /**
   * @param {Object} request - SeverityRequest
   * @returns {Promise<SubmitOutcome>}
   * @throws {ApiError} on a rejected request
   */
  submit(request) {}
}

/**
 * View: renders and captures input. Forwards every user action to the presenter; makes no decisions.
 */
export class ISeverityView {
  /** Build the map and wire inputs to the presenter. */
  initialize() {}

  /** @returns {SeverityForm} */
  getFormValues() {}

  /** @returns {Array<string>} The date inputs' values, in chain order */
  getDates() {}

  /**
   * @param {number} index - Position in the date chain
   * @param {{min: string|null, value: string}} constraint
   */
  setDate(index, constraint) {}

  startDrawing() {}

  clearDrawing() {}

  /** @param {Object|null} geometry - Uploaded perimeter to outline and zoom to, or null to clear */
  showUploadedPerimeter(geometry) {}

  /** @param {string} text */
  setPerimeterStatus(text) {}

  /** @param {boolean} busy */
  setSubmitting(busy) {}

  /**
   * @param {SubmitOutcome} outcome - A 'queued' outcome
   * @param {string} email
   */
  showQueued(outcome, email) {}

  /** @param {SubmitOutcome} outcome - A 'ready' outcome */
  showResult(outcome) {}

  /**
   * @param {string} cogUrl
   * @param {Object} geometry - Perimeter to zoom to
   */
  showSeverityOverlay(cogUrl, geometry) {}

  /**
   * @param {string} message
   * @param {Array<string>} [details]
   */
  showError(message, details) {}
}

/**
 * Presenter: handles user actions, updates the model, and tells the view what to show.
 */
export class ISeverityPresenter {
  initialize() {}

  handleDrawStart() {}

  /** @param {Object|null} geometry */
  handleDrawChange(geometry) {}

  /** @param {File} file */
  handleUpload(file) {}

  /** @param {number} index - Position in the date chain of the date that changed */
  handleDateChange(index) {}

  handleSubmit() {}
}
