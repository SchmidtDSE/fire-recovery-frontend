import { ISeverityPresenter } from './severity-contract.js';
import { ApiError } from '../../shared/api/api-client.js';
import { anchorNextDate } from '../../shared/utils/date-utils.js';
import { DEFAULT_PRODUCT, STATUS_POLL_INTERVAL_MS } from '../../core/config.js';

/**
 * Fire severity presenter: turns user actions into model updates and view changes.
 */
export class SeverityPresenter extends ISeverityPresenter {
  /**
   * @param {import('./severity-contract.js').ISeverityView} view
   * @param {import('./severity-contract.js').ISeverityModel} model
   */
  constructor(view, model) {
    super();
    this.view = view;
    this.model = model;
  }

  async initialize() {
    await this.view.initialize();
  }

  handleDrawStart() {
    this.model.clearPerimeter();
    this.view.showUploadedPerimeter(null);
    this.view.startDrawing();
    this.view.setPerimeterStatus('Drawing: click the map to add corners, then double-click to finish.');
  }

  handleDrawChange(geometry) {
    this.model.setDrawnPerimeter(geometry);
    if (geometry) {
      this.view.showUploadedPerimeter(null);
      this.view.setPerimeterStatus('Perimeter drawn on the map.');
    } else if (!this.model.getPerimeter()) {
      this.view.setPerimeterStatus('No perimeter yet.');
    }
  }

  async handleUpload(file) {
    try {
      const geometry = await this.model.loadPerimeterFile(file);
      this.view.clearDrawing();
      this.view.showUploadedPerimeter(geometry);
      this.view.setPerimeterStatus(`Perimeter loaded from ${file.name}.`);
    } catch (err) {
      this.view.setPerimeterStatus(`Could not read ${file.name}: ${err.message}`);
    }
  }

  handleProductChange(product) {
    this.#mapped.product = product;
    this.#showSeverity();
  }

  handleBreakChange(index, value) {
    this.model.setBreak(this.#mapped.product, index, value);
    this.#showSeverity();
  }

  handleDateChange(index) {
    const dates = this.view.getDates();
    if (index + 1 >= dates.length || !dates[index]) return;
    this.view.setDate(index + 1, anchorNextDate(dates[index], dates[index + 1], index % 2 === 0));
  }

  async handleSubmit() {
    let request;
    try {
      request = this.model.buildRequest(this.view.getFormValues());
    } catch (err) {
      this.view.showError(err.message);
      return;
    }

    this.#watchedJob = null;
    this.view.setSubmitting(true);
    let outcome;
    try {
      outcome = await this.model.submit(request);
      this.#showOutcome(outcome, request);
    } catch (err) {
      this.view.showError(...describeError(err));
      return;
    } finally {
      this.view.setSubmitting(false);
    }
    if (outcome.kind === 'queued') this.#watch(outcome, request);
  }

  /** The job polled by #watch(); a new submission replaces it, which stops the old loop. */
  #watchedJob = null;

  /**
   * Check on a queued analysis until it succeeds or fails, showing each change of state.
   * Failed checks are retried on the next tick: the backend's email is the fallback.
   */
  async #watch(queued, request) {
    const { jobId } = queued;
    this.#watchedJob = jobId;
    let shown = queued;
    while (this.#watchedJob === jobId) {
      await delay(STATUS_POLL_INTERVAL_MS);
      if (this.#watchedJob !== jobId) return;
      let outcome;
      try {
        outcome = await this.model.getStatus(jobId);
      } catch (err) {
        console.warn(`Status check for ${jobId} failed; retrying`, err);
        continue;
      }
      if (this.#watchedJob !== jobId) return;
      if (outcome.kind !== 'queued') this.#watchedJob = null;
      if (outcome.kind !== shown.kind || outcome.state !== shown.state) this.#showOutcome(outcome, request);
      shown = outcome;
    }
  }

  #showOutcome(outcome, request) {
    if (outcome.kind === 'queued') {
      this.view.showQueued(outcome, request.email);
    } else if (outcome.kind === 'failed') {
      this.view.showError(`The analysis failed: ${outcome.error}`);
    } else {
      this.#showResult(outcome, request.geometry);
    }
  }

  /** The result on the map: its rasters, the perimeter they are cropped to, and the product shown. */
  #mapped = null;

  #showResult(outcome, perimeter) {
    this.view.showResult(outcome);
    const products = Object.keys(outcome.rasters);
    if (products.length === 0) return;
    const product = products.includes(DEFAULT_PRODUCT) ? DEFAULT_PRODUCT : products[0];
    this.#mapped = { rasters: outcome.rasters, perimeter, product };
    this.#showSeverity();
    this.view.zoomTo(perimeter);
  }

  #showSeverity() {
    const { rasters, perimeter, product } = this.#mapped;
    const breaks = this.model.getBreaks(product);
    this.view.showSeverityControls(product, breaks);
    this.view.showSeverityOverlay(rasters[product], breaks, perimeter);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** @returns {[string, Array<string>]} A message and its details, for view.showError() */
function describeError(err) {
  if (!(err instanceof ApiError)) return [`Could not reach the service: ${err.message}`, []];
  if (err.status === 422 && Array.isArray(err.detail)) {
    return ['Please fix the following:', err.detail.map((d) => `${(d.loc || []).slice(1).join('.')}: ${d.msg}`)];
  }
  if (err.status === 429) {
    return [`The service is busy. Please try again ${err.retryAfter ? `in ${err.retryAfter} seconds` : 'shortly'}.`, []];
  }
  return [`The service could not take the request (${err.status}). ${err.message}`, []];
}
