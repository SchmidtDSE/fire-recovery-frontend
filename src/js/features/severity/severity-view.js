import { ISeverityView } from './severity-contract.js';
import { createBaseMap, setBasemap, fitToGeometry } from '../../shared/map/base-map.js';
import { DrawTool } from '../../shared/map/draw-tools.js';
import { addOutlineLayer, setOutline, setClippedRasterLayer } from '../../shared/map/map-layers.js';
import { classifiedTileUrl } from '../../shared/map/titiler.js';
import { createElement as h } from '../../shared/utils/ui-utils.js';
import { SEVERITY_CLASSES, SEVERITY_NODATA, SEVERITY_PRODUCTS } from '../../core/config.js';

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
    this.result.addEventListener('input', (e) => {
      if (e.target.matches('.severity-classes input')) showBreakValue(e.target);
    });
    this.result.addEventListener('change', (e) => {
      if (e.target.matches('.severity-classes input')) {
        this.presenter.handleBreakChange(Number(e.target.dataset.index), Number(e.target.value));
      }
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
      products.length > 0 && h('p', {}, 'Shown on the map within the perimeter. Drag a slider to change where a class starts.'),
      products.length > 0 && h('div', { className: 'toggle-group product-toggle', role: 'group', ariaLabel: 'Severity product' },
        ...products.map((name) => h('button', { type: 'button', value: name }, SEVERITY_PRODUCTS[name].label))),
      products.length > 0 && severityClasses(),
      h('ul', {}, ...products.map((name) =>
        h('li', {}, h('a', { href: rasters[name] }, `${SEVERITY_PRODUCTS[name].label} (GeoTIFF)`)))),
      h('p', {}, externalLink(catalogUrl, 'STAC catalog')));
  }

  showSeverityControls(product, breaks) {
    for (const button of this.result.querySelectorAll('.product-toggle button')) {
      button.classList.toggle('active', button.value === product);
      button.ariaPressed = String(button.value === product);
    }
    this.result.querySelectorAll('.severity-classes input').forEach((input, i) => {
      input.max = SEVERITY_PRODUCTS[product].max;
      input.value = breaks[i];
      showBreakValue(input);
    });
  }

  showSeverityOverlay(cogUrl, breaks, perimeter) {
    const tileUrl = classifiedTileUrl(cogUrl, breaks, SEVERITY_CLASSES.map((c) => c.color), SEVERITY_NODATA);
    setClippedRasterLayer(this.map, SEVERITY_LAYER, tileUrl, perimeter, UPLOAD_LAYER);
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

/** The severity legend: per class a swatch, its name and, past the first, a slider for where it starts. */
function severityClasses() {
  return h('div', { className: 'severity-classes' }, ...SEVERITY_CLASSES.flatMap(({ name, color }, i) => {
    const swatch = h('span', { className: 'swatch' });
    swatch.style.background = color;
    if (i === 0) return [swatch, h('span', {}, name), h('span'), h('span')];
    const id = `severity-break-${i - 1}`;
    const slider = h('input', { type: 'range', id, min: '0', step: '0.001' });
    slider.dataset.index = String(i - 1);
    return [swatch, h('label', { htmlFor: id }, name), slider, h('output', { htmlFor: id })];
  }));
}

/** Show a break slider's value in the output beside it. */
function showBreakValue(slider) {
  slider.nextElementSibling.value = Number(slider.value).toFixed(3);
}

function externalLink(href, text) {
  return h('a', { href, target: '_blank', rel: 'noopener' }, text);
}
