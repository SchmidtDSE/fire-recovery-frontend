import { ISeverityPresenter } from './severity-contract.js';
import { ApiError } from '../../shared/api/api-client.js';
import { anchorNextDate } from '../../shared/utils/date-utils.js';

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

    this.view.setSubmitting(true);
    try {
      const outcome = await this.model.submit(request);
      if (outcome.kind === 'queued') {
        this.view.showQueued(outcome, request.email);
      } else {
        this.view.showResult(outcome);
        if (outcome.overlayUrl) this.view.showSeverityOverlay(outcome.overlayUrl, request.geometry);
      }
    } catch (err) {
      this.view.showError(...describeError(err));
    } finally {
      this.view.setSubmitting(false);
    }
  }
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
