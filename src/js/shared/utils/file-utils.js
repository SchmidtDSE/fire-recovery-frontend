/**
 * File utilities
 *
 * shpjs ships no browser ES module build (its module entry imports bare npm
 * names), so the page loads its UMD bundle (with SRI) and this is the only
 * module that touches the global.
 */

/* global shp */

const GEOJSON_TYPES = new Set([
  'FeatureCollection', 'Feature', 'GeometryCollection',
  'Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon',
]);

/**
 * Read GeoJSON from a zipped shapefile (.zip) or a GeoJSON file (anything else).
 * @param {File} file
 * @returns {Promise<Object|Array<Object>>} GeoJSON (an array of FeatureCollections for a multi-layer zip)
 */
export function readGeoJSONFile(file) {
  return file.name.toLowerCase().endsWith('.zip') ? parseShapefile(file) : parseGeoJSONFile(file);
}

/**
 * @param {File} file - Zip holding .shp, .shx, .dbf and .prj
 * @returns {Promise<Object|Array<Object>>}
 */
export async function parseShapefile(file) {
  return shp(await file.arrayBuffer());
}

/**
 * @param {File} file - GeoJSON text
 * @returns {Promise<Object>}
 * @throws {Error} if the file is not JSON, or not a GeoJSON object
 */
export async function parseGeoJSONFile(file) {
  const data = JSON.parse(await file.text());
  if (!GEOJSON_TYPES.has(data?.type)) throw new Error('not a GeoJSON file');
  return data;
}
