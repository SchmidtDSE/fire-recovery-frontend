import { ISeverityModel } from './severity-contract.js';
import { getSeverityStatus, submitSeverity } from '../../shared/api/api-client.js';
import { readGeoJSONFile } from '../../shared/utils/file-utils.js';
import { toMultiPolygon } from '../../shared/utils/geojson-utils.js';
import { SEVERITY_OVERLAY } from '../../core/config.js';

/**
 * The fire perimeter (drawn or uploaded: the last one wins) and the severity request.
 */
export class SeverityModel extends ISeverityModel {
  #perimeter = null;

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
  const { thumbnail = null, ...rasters } = response.assets;
  return {
    kind: 'ready',
    jobId,
    catalogUrl: response.catalog_url,
    thumbnail,
    rasters,
    overlayUrl: rasters[SEVERITY_OVERLAY.asset] ?? null,
  };
}
