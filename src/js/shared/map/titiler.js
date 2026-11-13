/**
 * TiTiler tile URLs for result COGs.
 *
 * GLEN's cogTileUrl colours a COG by a named ramp or by exact class values;
 * severity is classed by value ranges, which TiTiler takes as an interval colormap.
 */
import { TITILER_URL } from '../../core/config.js';

// Stand-ins for -∞ and +∞, which JSON cannot carry
const BELOW_ALL = -1e30;
const ABOVE_ALL = 1e30;

/**
 * Tile URL template that paints each range of values in one colour.
 * @param {string} cogUrl
 * @param {Array<number>} breaks - Ascending lower bounds of every class but the first
 * @param {Array<string>} colors - '#rrggbb' per class, one more than `breaks`
 * @param {number} nodata - Pixel value left transparent
 * @returns {string} URL with {z}/{x}/{y} placeholders
 */
export function classifiedTileUrl(cogUrl, breaks, colors, nodata) {
  const bounds = [BELOW_ALL, ...breaks, ABOVE_ALL];
  const colormap = colors.map((color, i) => [[bounds[i], bounds[i + 1]], hexToRgba(color)]);
  const query = new URLSearchParams({ url: cogUrl, nodata: String(nodata), colormap: JSON.stringify(colormap) });
  return `${TITILER_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?${query}`;
}

function hexToRgba(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).concat(255);
}
