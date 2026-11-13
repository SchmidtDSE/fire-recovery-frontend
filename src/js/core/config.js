/**
 * App configuration: map defaults, basemaps, and how severity results are drawn.
 */

const ESRI = 'https://services.arcgisonline.com/ArcGIS/rest/services';

export const MAP_DEFAULTS = { center: [-98.5, 39.5], zoom: 3 };

/** Raster basemaps by name; the names are the layer ids and the toggle buttons' data-basemap values. */
export const BASEMAPS = {
  topographic: {
    tiles: `${ESRI}/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`,
    attribution: 'Esri, HERE, Garmin, OpenStreetMap',
  },
  satellite: {
    tiles: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    attribution: 'Esri, Maxar, Earthstar Geographics',
  },
};
export const DEFAULT_BASEMAP = 'topographic';

/** How often to check on a queued analysis while the page is open. */
export const STATUS_POLL_INTERVAL_MS = 15000;

/** TiTiler instance that renders result COGs as map tiles (GLEN's default). */
export const TITILER_URL = 'https://titiler.nrp-nautilus.io';

/** Severity classes, low to high, drawn yellow to red (ColorBrewer YlOrRd). */
export const SEVERITY_CLASSES = [
  { name: 'Unburned', color: '#ffffb2' },
  { name: 'Low', color: '#fecc5c' },
  { name: 'Moderate', color: '#fd8d3c' },
  { name: 'High', color: '#e31a1c' },
];

/**
 * The severity products, keyed by result asset name. `breaks` are the default
 * lower bounds of every class above Unburned (unitless, as the rasters store
 * them); `max` is the top of their sliders.
 *   dNBR: Key & Benson (2006). RdNBR: Miller & Thode (2007). RBR: Parks et al. (2014).
 */
export const SEVERITY_PRODUCTS = {
  dnbr: { label: 'dNBR', breaks: [0.1, 0.27, 0.66], max: 1.3 },
  rdnbr: { label: 'RdNBR', breaks: [0.069, 0.316, 0.641], max: 1.5 },
  rbr: { label: 'RBR', breaks: [0.035, 0.13, 0.298], max: 0.6 },
};
export const DEFAULT_PRODUCT = 'rbr';

/** Pixel value the result rasters use for no data. */
export const SEVERITY_NODATA = -9999;
