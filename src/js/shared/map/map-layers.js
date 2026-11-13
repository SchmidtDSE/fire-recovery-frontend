/**
 * Data layers on a MapLibre map: vector outlines and raster tiles.
 * Each layer uses one id for both its source and its layer.
 */
import { addProtocol } from './base-map.js';
import { createGeoJSONFeature, createGeoJSONFeatureCollection } from '../utils/geojson-utils.js';

/**
 * Add an empty outline layer, to be filled with setOutline().
 * @param {maplibregl.Map} map
 * @param {string} id
 * @param {string} color - Line color
 */
export function addOutlineLayer(map, id, color) {
  map.addSource(id, { type: 'geojson', data: createGeoJSONFeatureCollection() });
  map.addLayer({ id, type: 'line', source: id, paint: { 'line-color': color, 'line-width': 2 } });
}

/** Draw `geometry` in an outline layer, or clear it with null. */
export function setOutline(map, id, geometry) {
  map.getSource(id).setData(geometry ? createGeoJSONFeature(geometry) : createGeoJSONFeatureCollection());
}

/**
 * Show raster tiles cropped to a polygon, adding the layer or retargeting it.
 * @param {maplibregl.Map} map
 * @param {string} id
 * @param {string} tileUrl - Template with {z}/{x}/{y}
 * @param {Object} clipTo - Polygon or MultiPolygon; pixels outside it are not drawn
 * @param {string} [beforeId] - Existing layer to draw beneath
 */
export function setClippedRasterLayer(map, id, tileUrl, clipTo, beforeId) {
  registerClipProtocol();
  clipAreas.set(id, clipTo);
  const tiles = [`${CLIP_PROTOCOL}://${id}/{z}/{x}/{y}/${tileUrl}`];
  const source = map.getSource(id);
  if (source) {
    source.setTiles(tiles);
    return;
  }
  map.addSource(id, { type: 'raster', tileSize: 256, tiles });
  map.addLayer({ id, type: 'raster', source: id, paint: { 'raster-opacity': 0.8 } }, beforeId);
}

/** Remove a layer and its source, if present. */
export function removeLayer(map, id) {
  if (map.getLayer(id)) map.removeLayer(id);
  if (map.getSource(id)) map.removeSource(id);
}

/*
 * Cropping: MapLibre cannot mask a raster layer with a polygon, so its tiles
 * load through a protocol that fetches each tile and erases the pixels outside
 * the layer's polygon. URLs read clip://<layer id>/<z>/<x>/<y>/<tile URL>.
 */
const CLIP_PROTOCOL = 'clip';
const clipAreas = new Map(); // layer id → geometry its tiles are cropped to
let clipRegistered = false;

function registerClipProtocol() {
  if (clipRegistered) return;
  addProtocol(CLIP_PROTOCOL, loadClippedTile);
  clipRegistered = true;
}

async function loadClippedTile({ url }, abortController) {
  const [, id, z, x, y, tileUrl] = url.match(/^clip:\/\/([^/]+)\/(\d+)\/(\d+)\/(\d+)\/(.+)$/);
  const response = await fetch(tileUrl, { signal: abortController.signal });
  if (!response.ok) throw new Error(`Tile request failed: ${response.status}`);
  const image = await createImageBitmap(await response.blob());

  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = canvas.getContext('2d');
  const worldSize = image.width * 2 ** Number(z);
  const toPixel = ([lon, lat]) => [
    ((lon + 180) / 360) * worldSize - Number(x) * image.width,
    ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * worldSize - Number(y) * image.height,
  ];
  context.beginPath();
  for (const ring of polygonRings(clipAreas.get(id))) {
    ring.map(toPixel).forEach(([px, py], i) => (i ? context.lineTo(px, py) : context.moveTo(px, py)));
    context.closePath();
  }
  context.clip('evenodd'); // so holes stay holes
  context.drawImage(image, 0, 0);
  return { data: await (await canvas.convertToBlob()).arrayBuffer() };
}

/** Every ring (outer and holes) of a Polygon or MultiPolygon. */
function polygonRings(geometry) {
  return geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat();
}
