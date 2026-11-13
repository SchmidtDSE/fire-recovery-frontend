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

/** TiTiler instance that renders result COGs as map tiles (GLEN's default). */
export const TITILER_URL = 'https://titiler.nrp-nautilus.io';

/** The result asset shown on the map, and how: RBR from unburned (0) to high severity (0.5 and up). */
export const SEVERITY_OVERLAY = {
  asset: 'rbr',
  style: { colormap: 'inferno', rescale: '0,0.5', nodata: -9999 },
};
