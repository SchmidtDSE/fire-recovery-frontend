import { ISeverityModel } from './severity-contract.js';
import { getSeverityStatus, submitSeverity } from '../../shared/api/api-client.js';
import { readGeoJSONFile } from '../../shared/utils/file-utils.js';
import { toMultiPolygon } from '../../shared/utils/geojson-utils.js';
import { SEVERITY_PRODUCTS } from '../../core/config.js';

/**
 * The fire perimeter (drawn or uploaded: the last one wins), the severity
 * request, and the colour range each product is drawn with.
 */
export class SeverityModel extends ISeverityModel {
  #perimeter = null;
  #ranges = Object.fromEntries(Object.entries(SEVERITY_PRODUCTS).map(([name, { range }]) => [name, range]));

  getPerimeter() {
    return this.#perimeter;
  }

  setDrawnPerimeter(geometry) {
    if (geometry) this.#perimeter = { geometry, source: 'drawn' };
    else if (this.#perimeter?.source === 'drawn') this.#perimeter = null;
  }

  clearPerimeter() {
    this.#perimeter = null;
  }

  async loadPerimeterFile(file) {
    const geometry = toMultiPolygon(await readGeoJSONFile(file));
    if (!geometry) throw new Error('it contains no polygons');
    this.#perimeter = { geometry, source: 'uploaded' };
    return geometry;
  }

  buildRequest(form) {
    if (!this.#perimeter) throw new Error('Draw or upload a fire perimeter first.');
    return {
      fire_event_name: form.fireEventName,
      geometry: this.#perimeter.geometry,
      prefire_window: form.prefire,
      postfire_window: form.postfire,
      sensor: form.sensor,
      email: form.email,
    };
  }

  async submit(request) {
    return toOutcome(await submitSeverity(request));
  }

  async getStatus(jobId) {
    return toOutcome(await getSeverityStatus(jobId));
  }

  getRange(product) {
    return this.#ranges[product];
  }

  setRange(product, min, max) {
    if (min < max) this.#ranges[product] = [min, max];
  }
}

/** A SeverityResult, SeverityAccepted or SeverityStatus response as a SubmitOutcome. */
function toOutcome(response) {
  const jobId = response.job_id;
  if (response.state === 'failed') {
    return { kind: 'failed', jobId, error: response.error || 'no reason given' };
  }
  if (response.state !== 'succeeded') {
    return { kind: 'queued', jobId, state: response.state };
  }
  return {
    kind: 'ready',
    jobId,
    catalogUrl: response.catalog_url,
    rasters: Object.fromEntries(Object.entries(response.assets).filter(([name]) => name in SEVERITY_PRODUCTS)),
  };
}
