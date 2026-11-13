import { ISeverityView } from './severity-contract.js';
import { createBaseMap, setBasemap, fitToGeometry } from '../../shared/map/base-map.js';
import { DrawTool } from '../../shared/map/draw-tools.js';
import { addOutlineLayer, setOutline, setCogLayer } from '../../shared/map/map-layers.js';
import { createElement as h } from '../../shared/utils/ui-utils.js';
import { SEVERITY_OVERLAY } from '../../core/config.js';

const UPLOAD_LAYER = 'upload';
const SEVERITY_LAYER = 'severity';
const DATE_IDS = ['prefire-start-date', 'prefire-end-date', 'postfire-start-date', 'postfire-end-date'];

/**
 * Fire severity view: the map and the form panel in fireSeverity.html.
 */
export class SeverityView extends ISeverityView {
  constructor() {
    super();
    this.presenter = null; // set by the factory
    this.map = null;
    this.drawTool = null;
    this.form = document.getElementById('severity-form');
    this.perimeterStatus = document.getElementById('perimeter-status');
    this.submitButton = document.getElementById('submit-button');
    this.result = document.getElementById('submit-result');
    this.dates = DATE_IDS.map((id) => document.getElementById(id));
  }

  async initialize() {
    this.map = await createBaseMap('map');
    this.drawTool = new DrawTool(this.map, (geometry) => this.presenter.handleDrawChange(geometry));
    await this.drawTool.init();
    addOutlineLayer(this.map, UPLOAD_LAYER, '#ff6b00');
    this.#bindEvents();
  }

  #bindEvents() {
    const basemapButtons = document.querySelectorAll('[data-basemap]');
    basemapButtons.forEach((button) => button.addEventListener('click', () => {
      basemapButtons.forEach((b) => b.classList.toggle('active', b === button));
      setBasemap(this.map, button.dataset.basemap);
    }));

    document.getElementById('draw-button').addEventListener('click', () => this.presenter.handleDrawStart());

    document.getElementById('upload-perimeter').addEventListener('change', (e) => {
      const [file] = e.target.files;
      e.target.value = ''; // so choosing the same file again still fires
      if (file) this.presenter.handleUpload(file);
    });

    this.dates.forEach((input, index) => input.addEventListener('change', () => this.presenter.handleDateChange(index)));

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.presenter.handleSubmit();
    });
  }

  getFormValues() {
    const value = (id) => document.getElementById(id).value.trim();
    const [prefireStart, prefireEnd, postfireStart, postfireEnd] = this.getDates();
    return {
      fireEventName: value('fire-event-name'),
      sensor: value('sensor'),
      email: value('email'),
      prefire: [prefireStart, prefireEnd],
      postfire: [postfireStart, postfireEnd],
    };
  }

  getDates() {
    return this.dates.map((input) => input.value);
  }

  setDate(index, { min, value }) {
    const input = this.dates[index];
    if (min) input.min = min;
    input.value = value;
  }

  startDrawing() {
    this.drawTool.start();
  }

  clearDrawing() {
    this.drawTool.clear();
  }

  showUploadedPerimeter(geometry) {
    setOutline(this.map, UPLOAD_LAYER, geometry);
    if (geometry) fitToGeometry(this.map, geometry);
  }

  setPerimeterStatus(text) {
    this.perimeterStatus.textContent = text;
  }

  setSubmitting(busy) {
    this.submitButton.disabled = busy;
    if (busy) this.#showMessage('', h('p', {}, 'Submitting…'));
  }

  showQueued({ jobId, state, statusUrl }, email) {
    this.#showMessage('',
      h('h4', {}, 'Submitted'),
      h('p', {}, 'Analysis ', h('code', {}, jobId), ` is ${state}. We will email `, h('strong', {}, email), ' when it finishes.'),
      h('p', {}, externalLink(statusUrl, 'Status (JSON)')));
  }

  showResult({ thumbnail, rasters, catalogUrl }) {
    this.#showMessage('',
      h('h4', {}, 'Results ready'),
      h('p', {}, 'This analysis has already been run. The RBR layer is shown on the map.'),
      thumbnail && h('p', {}, h('img', { src: thumbnail, alt: 'RBR thumbnail' })),
      h('ul', {}, ...Object.entries(rasters).map(([name, url]) =>
        h('li', {}, h('a', { href: url }, `${name.toUpperCase()} (GeoTIFF)`)))),
      h('p', {}, externalLink(catalogUrl, 'STAC catalog')));
  }

  showSeverityOverlay(cogUrl, geometry) {
    setCogLayer(this.map, SEVERITY_LAYER, cogUrl, SEVERITY_OVERLAY.style, UPLOAD_LAYER);
    fitToGeometry(this.map, geometry);
  }

  showError(message, details = []) {
    this.#showMessage('error',
      h('p', {}, message),
      details.length > 0 && h('ul', {}, ...details.map((detail) => h('li', {}, detail))));
  }

  #showMessage(kind, ...children) {
    this.result.className = `results-box ${kind}`.trim();
    this.result.replaceChildren(...children.filter(Boolean));
    this.result.hidden = false;
  }
}

function externalLink(href, text) {
  return h('a', { href, target: '_blank', rel: 'noopener' }, text);
}
