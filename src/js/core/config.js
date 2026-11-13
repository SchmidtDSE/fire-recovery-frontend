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

/**
 * The severity products, keyed by result asset name, and the default range of
 * values their colour ramp spans (unitless, as the rasters store them).
 */
export const SEVERITY_PRODUCTS = {
  dnbr: { label: 'dNBR', range: [0, 0.8] },
  rdnbr: { label: 'RdNBR', range: [0, 1.2] },
  rbr: { label: 'RBR', range: [0, 0.4] },
};
export const DEFAULT_PRODUCT = 'rbr';

/** How severity rasters are drawn: TiTiler's yellow-orange-red ramp, and the rasters' no-data value. */
export const SEVERITY_COLORMAP = 'ylorrd';
export const SEVERITY_NODATA = -9999;
