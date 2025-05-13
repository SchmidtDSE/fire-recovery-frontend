/**
 * GeoJSON Utilities
 * Common functions for GeoJSON data processing and manipulation
 */

/**
 * Create a GeoJSON Feature from geometry
 * @param {Object} geometry - GeoJSON geometry object
 * @param {Object} properties - Feature properties
 * @returns {Object} GeoJSON Feature
 */
export function createGeoJSONFeature(geometry, properties = {}) {
  return {
    type: 'Feature',
    geometry: geometry,
    properties: properties
  };
}

/**
 * Create a GeoJSON FeatureCollection from features
 * @param {Array} features - Array of GeoJSON Feature objects
 * @returns {Object} GeoJSON FeatureCollection
 */
export function createGeoJSONFeatureCollection(features = []) {
  return {
    type: 'FeatureCollection',
    features: features
  };
}

/**
 * Create a simple polygon geometry from bounds
 * @param {Array} bounds - Bounds in [west, south, east, north] format
 * @returns {Object} GeoJSON Polygon geometry
 */
export function createPolygonFromBounds(bounds) {
  const [west, south, east, north] = bounds;
  
  return {
    type: 'Polygon',
    coordinates: [
      [
        [west, north],
        [east, north],
        [east, south],
        [west, south],
        [west, north]
      ]
    ]
  };
}

/**
 * Calculate the area of a GeoJSON polygon in square meters
 * @param {Object} polygon - GeoJSON Polygon geometry
 * @returns {number} Area in square meters
 */
export function calculatePolygonArea(polygon) {
  // Simple planar area calculation - for more accurate results
  // consider using a library like Turf.js with proper geodesic calculations
  
  if (polygon.type !== 'Polygon' || !polygon.coordinates || !polygon.coordinates.length) {
    return 0;
  }
  
  const coords = polygon.coordinates[0];
  let area = 0;
  
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    area += p1[0] * p2[1] - p2[0] * p1[1];
  }
  
  // Convert to square meters using approximate conversion for latitude/longitude
  // This is a rough approximation and works best near the equator
  // For more accurate calculations, use proper geodesic formulas or libraries like Turf.js
  const areaInSquareMeters = Math.abs(area * 111319.9 * 111319.9) / 2;
  return areaInSquareMeters;
}

/**
 * Convert area in square meters to hectares
 * @param {number} areaInSquareMeters - Area in square meters
 * @returns {number} Area in hectares
 */
export function squareMetersToHectares(areaInSquareMeters) {
  return areaInSquareMeters / 10000;
}

/**
 * Simplify a GeoJSON polygon
 * @param {Object} polygon - GeoJSON Polygon geometry
 * @param {number} tolerance - Simplification tolerance
 * @returns {Object} Simplified GeoJSON Polygon
 */
export function simplifyPolygon(polygon, tolerance = 0.01) {
  // This is a simple implementation of the Douglas-Peucker algorithm
  // For production use, consider using a proper library like Turf.js
  
  function douglasPeucker(points, tolerance) {
    if (points.length <= 2) return points;
    
    // Find the point with the maximum distance
    let maxDistance = 0;
    let index = 0;
    
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    
    for (let i = 1; i < points.length - 1; i++) {
      const distance = pointLineDistance(points[i], firstPoint, lastPoint);
      
      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }
    
    // If max distance is greater than tolerance, recursively simplify
    let results = [];
    
    if (maxDistance > tolerance) {
      const firstHalf = douglasPeucker(points.slice(0, index + 1), tolerance);
      const secondHalf = douglasPeucker(points.slice(index), tolerance);
      
      // Concat the two halves, avoiding duplicating the common point
      results = firstHalf.slice(0, -1).concat(secondHalf);
    } else {
      results = [firstPoint, lastPoint];
    }
    
    return results;
  }
  
  function pointLineDistance(point, lineStart, lineEnd) {
    const [x, y] = point;
    const [x1, y1] = lineStart;
    const [x2, y2] = lineEnd;
    
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
      param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = x - xx;
    const dy = y - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  if (polygon.type !== 'Polygon' || !polygon.coordinates || !polygon.coordinates.length) {
    return polygon;
  }
  
  const result = {
    ...polygon,
    coordinates: polygon.coordinates.map(ring => {
      // Ensure first and last points are the same to close the ring
      const simplified = douglasPeucker(ring, tolerance);
      if (simplified[0][0] !== simplified[simplified.length - 1][0] || 
          simplified[0][1] !== simplified[simplified.length - 1][1]) {
        simplified.push([...simplified[0]]);
      }
      return simplified;
    })
  };
  
  return result;
}