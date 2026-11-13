/**
 * Base map: a MapLibre map with switchable raster basemaps.
 *
 * MapLibre ships no browser ES module build, so the page loads its UMD
 * bundle (with SRI) and this is the only module that touches the global.
 */
import { BASEMAPS, DEFAULT_BASEMAP, MAP_DEFAULTS } from '../../core/config.js';
import { getBounds } from '../utils/geojson-utils.js';

/* global maplibregl */

/**
 * Create a map in `container` with every basemap as a layer, only the default one visible.
 * @param {string|HTMLElement} container
 * @returns {Promise<maplibregl.Map>} the map, once its style has loaded
 */
export async function createBaseMap(container) {
  const names = Object.keys(BASEMAPS);
  const map = new maplibregl.Map({
    container,
    ...MAP_DEFAULTS,
    style: {
      version: 8,
      sources: Object.fromEntries(names.map((name) => [name, {
        type: 'raster',
        tileSize: 256,
        tiles: [BASEMAPS[name].tiles],
        attribution: BASEMAPS[name].attribution,
      }])),
      layers: names.map((name) => ({
        id: name,
        type: 'raster',
        source: name,
        layout: { visibility: name === DEFAULT_BASEMAP ? 'visible' : 'none' },
      })),
    },
  });
  map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
  await map.once('load');
  return map;
}

/** Show the basemap called `name` and hide the others. */
export function setBasemap(map, name) {
  for (const id of Object.keys(BASEMAPS)) {
    map.setLayoutProperty(id, 'visibility', id === name ? 'visible' : 'none');
  }
}

/** Zoom the map to a GeoJSON geometry. */
export function fitToGeometry(map, geometry) {
  map.fitBounds(getBounds(geometry), { padding: 40 });
}
