/**
 * Severity v2 proof of concept: collect a perimeter, dates, sensor and email,
 * then POST /v2/severity once. No polling: the backend emails the requester.
 *
 * Map drawing and COG tile URLs come from GLEN (pinned tag), not our own code.
 */
import { V2_SEVERITY_URL } from './shared/api/endpoints.js';

const GLEN = 'https://cdn.jsdelivr.net/gh/SchmidtDSE/glen@v3.51.0/app';
const { MapDraw } = await import(`${GLEN}/map-draw.js`);
const { cogTileUrl } = await import(`${GLEN}/cog-tiles.js`);

const TITILER = 'https://titiler.nrp-nautilus.io';
const ESRI = 'https://services.arcgisonline.com/ArcGIS/rest/services';

/* global maplibregl, shp */

// ---- Map ----

const map = new maplibregl.Map({
  container: 'map',
  center: [-98.5, 39.5],
  zoom: 3,
  style: {
    version: 8,
    sources: {
      satellite: {
        type: 'raster', tileSize: 256, attribution: 'Esri, Maxar, Earthstar Geographics',
        tiles: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`],
      },
      plain: {
        type: 'raster', tileSize: 256, attribution: 'Esri, HERE, Garmin, OpenStreetMap',
        tiles: [`${ESRI}/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`],
      },
    },
    layers: [
      { id: 'satellite', type: 'raster', source: 'satellite' },
      { id: 'plain', type: 'raster', source: 'plain', layout: { visibility: 'none' } },
    ],
  },
});
map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

document.querySelectorAll('[data-basemap]').forEach((button) => {
  button.addEventListener('click', () => {
    for (const b of document.querySelectorAll('[data-basemap]')) {
      const on = b === button;
      b.classList.toggle('active', on);
      map.setLayoutProperty(b.dataset.basemap, 'visibility', on ? 'visible' : 'none');
    }
  });
});

await new Promise((resolve) => map.on('load', resolve));
const mapDraw = new MapDraw(map);
await mapDraw.init();

// ---- Perimeter: drawn or uploaded, last one wins ----

let uploaded = null; // MultiPolygon geometry from a file
const perimeterStatus = document.getElementById('perimeter-status');

map.addSource('upload', { type: 'geojson', data: emptyCollection() });
map.addLayer({ id: 'upload-line', type: 'line', source: 'upload', paint: { 'line-color': '#ff6b00', 'line-width': 2 } });

document.getElementById('draw-button').addEventListener('click', () => {
  setUploaded(null);
  mapDraw.startDrawing();
  setStatus('Drawing: click the map to add corners, then double-click to finish.');
});
window.addEventListener('region-drawn', () => {
  setUploaded(null);
  setStatus('Perimeter drawn on the map.');
});
window.addEventListener('region-cleared', () => {
  if (!uploaded) setStatus('No perimeter yet.');
});

function setStatus(text) {
  perimeterStatus.innerHTML = `<strong>${escape(text)}</strong>`;
}

document.getElementById('upload-perimeter').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = file.name.toLowerCase().endsWith('.zip')
      ? await shp(await file.arrayBuffer())
      : JSON.parse(await file.text());
    const polygons = collectPolygons(data);
    if (!polygons.length) throw new Error('no polygons found');
    mapDraw.clear();
    setUploaded({ type: 'MultiPolygon', coordinates: polygons });
    map.fitBounds(bbox(uploaded), { padding: 40 });
    setStatus(`Perimeter loaded from ${file.name}.`);
  } catch (err) {
    setStatus(`Could not read ${file.name}: ${err.message}`);
  }
});

function setUploaded(geometry) {
  uploaded = geometry;
  map.getSource('upload').setData(geometry ? { type: 'Feature', geometry, properties: {} } : emptyCollection());
}

function currentPerimeter() {
  return uploaded || mapDraw.draw.getAll().features[0]?.geometry || null;
}

/** Polygon rings from any GeoJSON object, or the array of collections shp() returns for multi-layer zips. */
function collectPolygons(obj) {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj.flatMap(collectPolygons);
  switch (obj.type) {
    case 'FeatureCollection': return obj.features.flatMap(collectPolygons);
    case 'Feature': return collectPolygons(obj.geometry);
    case 'Polygon': return [obj.coordinates];
    case 'MultiPolygon': return obj.coordinates;
    default: return [];
  }
}

function bbox(geometry) {
  const points = geometry.type === 'Polygon' ? geometry.coordinates.flat() : geometry.coordinates.flat(2);
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]];
}

function emptyCollection() {
  return { type: 'FeatureCollection', features: [] };
}

// ---- Submit ----

const form = document.getElementById('severity-form');
const result = document.getElementById('submit-result');
const submitButton = document.getElementById('submit-button');
const value = (id) => document.getElementById(id).value.trim();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const geometry = currentPerimeter();
  const prefire = [value('prefire-start-date'), value('prefire-end-date')];
  const postfire = [value('postfire-start-date'), value('postfire-end-date')];
  if (!geometry) return show('error', '<p>Draw or upload a fire perimeter first.</p>');
  if (prefire[0] > prefire[1] || postfire[0] > postfire[1]) {
    return show('error', '<p>Each start date must be on or before its end date.</p>');
  }

  const body = {
    fire_event_name: value('fire-event-name'),
    geometry,
    prefire_window: prefire,
    postfire_window: postfire,
    sensor: value('sensor'),
    email: value('email'),
  };

  submitButton.disabled = true;
  show('', '<p>Submitting…</p>');
  try {
    const response = await fetch(V2_SEVERITY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 202) showAccepted(data, body.email);
    else if (response.status === 200) showResult(data, geometry);
    else if (response.status === 422) showValidationError(data);
    else if (response.status === 429) {
      const wait = response.headers.get('Retry-After');
      show('error', `<p>The service is busy. Please try again${wait ? ` in ${escape(wait)} seconds` : ' shortly'}.</p>`);
    } else {
      const detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail ?? '');
      show('error', `<p>The service could not take the request (${response.status}). ${escape(detail)}</p>`);
    }
  } catch (err) {
    show('error', `<p>Could not reach the service: ${escape(err.message)}</p>`);
  } finally {
    submitButton.disabled = false;
  }
});

function showAccepted(data, email) {
  show('', `
    <h4>Submitted</h4>
    <p>Analysis <code>${escape(data.job_id)}</code> is ${escape(data.state)}.
       We will email <strong>${escape(email)}</strong> when it finishes.</p>
    <p><a href="${escape(data.status_url)}" target="_blank" rel="noopener">Status (JSON)</a></p>`);
}

function showResult(data, geometry) {
  const { thumbnail, ...rasters } = data.assets;
  show('', `
    <h4>Results ready</h4>
    <p>This analysis has already been run. The RBR layer is shown on the map.</p>
    ${thumbnail ? `<p><img src="${escape(thumbnail)}" alt="RBR thumbnail"></p>` : ''}
    <ul>${Object.entries(rasters).map(([k, url]) =>
      `<li><a href="${escape(url)}">${escape(k.toUpperCase())} (GeoTIFF)</a></li>`).join('')}</ul>
    <p><a href="${escape(data.catalog_url)}" target="_blank" rel="noopener">STAC catalog</a></p>`);

  if (map.getLayer('rbr')) map.removeLayer('rbr');
  if (map.getSource('rbr')) map.removeSource('rbr');
  if (!rasters.rbr) return;
  map.addSource('rbr', {
    type: 'raster',
    tileSize: 256,
    tiles: [cogTileUrl(TITILER, rasters.rbr, { colormap: 'inferno', rescale: '0,0.5', nodata: -9999 })],
  });
  map.addLayer({ id: 'rbr', type: 'raster', source: 'rbr', paint: { 'raster-opacity': 0.8 } }, 'upload-line');
  map.fitBounds(bbox(geometry), { padding: 40 });
}

function showValidationError(data) {
  const items = Array.isArray(data.detail)
    ? data.detail.map((d) => `<li>${escape((d.loc || []).slice(1).join('.'))}: ${escape(d.msg)}</li>`).join('')
    : `<li>${escape(data.detail ?? 'Invalid request')}</li>`;
  show('error', `<h4>Please fix the following</h4><ul>${items}</ul>`);
}

function show(kind, html) {
  result.className = `results-box ${kind}`;
  result.innerHTML = html;
  result.hidden = false;
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
