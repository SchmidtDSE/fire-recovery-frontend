/**
 * GeoJSON utilities
 */

/**
 * @param {Object} geometry - GeoJSON geometry
 * @param {Object} [properties]
 * @returns {Object} GeoJSON Feature
 */
export function createGeoJSONFeature(geometry, properties = {}) {
  return { type: 'Feature', geometry, properties };
}

/**
 * @param {Array<Object>} [features]
 * @returns {Object} GeoJSON FeatureCollection
 */
export function createGeoJSONFeatureCollection(features = []) {
  return { type: 'FeatureCollection', features };
}

/**
 * Every polygon in a GeoJSON object, merged into one MultiPolygon.
 * @param {Object|Array<Object>} geojson - Any GeoJSON object, or an array of
 *   them (shp() returns one FeatureCollection per layer of a multi-layer zip)
 * @returns {Object|null} MultiPolygon geometry, or null if there are no polygons
 */
export function toMultiPolygon(geojson) {
  const polygons = collectPolygons(geojson);
  return polygons.length ? { type: 'MultiPolygon', coordinates: polygons } : null;
}

function collectPolygons(obj) {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj.flatMap(collectPolygons);
  switch (obj.type) {
    case 'FeatureCollection': return obj.features.flatMap(collectPolygons);
    case 'Feature': return collectPolygons(obj.geometry);
    case 'GeometryCollection': return obj.geometries.flatMap(collectPolygons);
    case 'Polygon': return [obj.coordinates];
    case 'MultiPolygon': return obj.coordinates;
    default: return [];
  }
}

/**
 * Bounding box of any geometry that has coordinates (not GeometryCollection).
 * @param {Object} geometry - GeoJSON geometry
 * @returns {[[number, number], [number, number]]} [[west, south], [east, north]]
 */
export function getBounds(geometry) {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  const visit = (coords) => {
    if (typeof coords[0] !== 'number') {
      coords.forEach(visit);
      return;
    }
    const [x, y] = coords;
    west = Math.min(west, x);
    south = Math.min(south, y);
    east = Math.max(east, x);
    north = Math.max(north, y);
  };
  visit(geometry.coordinates);
  return [[west, south], [east, north]];
}
