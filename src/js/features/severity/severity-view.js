import { ISeverityView } from './severity-contract.js';
import { createBaseMap, setBasemap, fitToGeometry } from '../../shared/map/base-map.js';
import { DrawTool } from '../../shared/map/draw-tools.js';
import { addOutlineLayer, setOutline, setCogLayer } from '../../shared/map/map-layers.js';
import { createElement as h } from '../../shared/utils/ui-utils.js';
import { SEVERITY_COLORMAP, SEVERITY_NODATA, SEVERITY_PRODUCTS } from '../../core/config.js';

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

    // The result's controls are rebuilt with each result, so listen on the box
    this.result.addEventListener('click', (e) => {
      const button = e.target.closest('.product-toggle button');
      if (button) this.presenter.handleProductChange(button.value);
    });
    this.result.addEventListener('change', (e) => {
      if (!e.target.matches('.color-range input')) return;
      const [min, max] = this.result.querySelectorAll('.color-range input');
      this.presenter.handleRangeChange(min.valueAsNumber, max.valueAsNumber);
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

  showQueued({ jobId, state }, email) {
    this.#showMessage('',
      h('h4', {}, 'Submitted'),
      h('p', {}, 'Analysis ', h('code', {}, jobId), ` is ${state}.`),
      h('p', {}, 'This page updates when it finishes, and we will also email ', h('strong', {}, email), '.'));
  }

  showResult({ rasters, catalogUrl }) {
    const products = Object.keys(rasters);
    this.#showMessage('',
      h('h4', {}, 'Results ready'),
      products.length > 0 && h('p', {}, 'Shown on the map from yellow to red. Set the values at either end to stretch the colours.'),
      products.length > 0 && h('div', { className: 'toggle-group product-toggle', role: 'group', ariaLabel: 'Severity product' },
        ...products.map((name) => h('button', { type: 'button', value: name }, SEVERITY_PRODUCTS[name].label))),
      products.length > 0 && colorRange(),
      h('ul', {}, ...products.map((name) =>
        h('li', {}, h('a', { href: rasters[name] }, `${SEVERITY_PRODUCTS[name].label} (GeoTIFF)`)))),
      h('p', {}, externalLink(catalogUrl, 'STAC catalog')));
  }

  showSeverityControls(product, range) {
    for (const button of this.result.querySelectorAll('.product-toggle button')) {
      button.classList.toggle('active', button.value === product);
      button.ariaPressed = String(button.value === product);
    }
    this.result.querySelectorAll('.color-range input').forEach((input, i) => {
      input.value = range[i];
    });
  }

  showSeverityOverlay(cogUrl, [min, max]) {
    const style = { colormap: SEVERITY_COLORMAP, rescale: `${min},${max}`, nodata: SEVERITY_NODATA };
    setCogLayer(this.map, SEVERITY_LAYER, cogUrl, style, UPLOAD_LAYER);
  }

  zoomTo(geometry) {
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
    this.result.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

/** The colour ramp between number inputs for the values at its ends. */
function colorRange() {
  return h('div', { className: 'color-range' },
    h('input', { type: 'number', step: 'any', name: 'range-min', ariaLabel: 'Value shown as yellow' }),
    h('span', { className: 'color-ramp' }),
    h('input', { type: 'number', step: 'any', name: 'range-max', ariaLabel: 'Value shown as red' }));
}

function externalLink(href, text) {
  return h('a', { href, target: '_blank', rel: 'noopener' }, text);
}
