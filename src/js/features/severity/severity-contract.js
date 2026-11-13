/**
 * Contract for the fire severity MVP: collect a perimeter, dates, sensor and
 * email, and submit one batch analysis (POST /v2/severity). While the page is
 * open it checks on a queued analysis and maps the result on a colour ramp whose
 * range the user can set; the backend also emails the requester when it finishes.
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
 * @typedef {{kind: 'queued', jobId: string, state: 'pending'|'running'}
 *   | {kind: 'failed', jobId: string, error: string}
 *   | {kind: 'ready', jobId: string, catalogUrl: string,
 *      rasters: Object<string, string>}} SubmitOutcome - `rasters` maps product names (keys of
 *      SEVERITY_PRODUCTS) to GeoTIFF URLs
 */

/**
 * Model: the perimeter, the request and each product's colour range. Talks to the API; knows nothing of the DOM.
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

  /**
   * @param {string} jobId
   * @returns {Promise<SubmitOutcome>}
   * @throws {ApiError} on a failed check
   */
  getStatus(jobId) {}

  /**
   * @param {string} product - A key of SEVERITY_PRODUCTS
   * @returns {[number, number]} The values at the ends of the product's colour ramp
   */
  getRange(product) {}

  /**
   * Set a product's colour range; ignored unless min < max.
   * @param {string} product
   * @param {number} min
   * @param {number} max
   */
  setRange(product, min, max) {}
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

  /** @param {SubmitOutcome} outcome - A 'ready' outcome; its products get a toggle and links */
  showResult(outcome) {}

  /**
   * Mark the selected product and show its colour range.
   * @param {string} product
   * @param {[number, number]} range
   */
  showSeverityControls(product, range) {}

  /**
   * Map a severity raster on the colour ramp, from range[0] to range[1].
   * @param {string} cogUrl
   * @param {[number, number]} range
   */
  showSeverityOverlay(cogUrl, range) {}

  /** @param {Object} geometry */
  zoomTo(geometry) {}

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

  /** @param {string} product - A product of the shown result */
  handleProductChange(product) {}

  /**
   * @param {number} min - NaN if left empty
   * @param {number} max - NaN if left empty
   */
  handleRangeChange(min, max) {}
}
