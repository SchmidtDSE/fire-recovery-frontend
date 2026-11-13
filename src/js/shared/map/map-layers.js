/**
 * Data layers on a MapLibre map: vector outlines and COG rasters.
 * Each layer uses one id for both its source and its layer.
 */
import { TITILER_URL } from '../../core/config.js';
import { createGeoJSONFeature, createGeoJSONFeatureCollection } from '../utils/geojson-utils.js';
import { cogTileUrl } from './glen.js';

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
 * Show a COG, rendered by TiTiler, adding the layer or pointing it at new tiles.
 * @param {maplibregl.Map} map
 * @param {string} id
 * @param {string} cogUrl
 * @param {{colormap: string, rescale: string, nodata: number}} style - TiTiler colormap name, "min,max" and no-data value
 * @param {string} [beforeId] - Existing layer to draw beneath
 */
export function setCogLayer(map, id, cogUrl, style, beforeId) {
  const tiles = [cogTileUrl(TITILER_URL, cogUrl, style)];
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
