/**
 * Polygon drawing on a MapLibre map, via GLEN's MapDraw (which adds its own
 * on-map draw button and keeps at most one polygon).
 */
import { MapDraw } from './glen.js';

export class DrawTool {
  /**
   * @param {maplibregl.Map} map
   * @param {(geometry: Object|null) => void} onChange - Called when the polygon
   *   is finished, edited, deleted or cleared (not when start() discards it)
   */
  constructor(map, onChange) {
    this._map = map;
    this._onChange = onChange;
    this._mapDraw = new MapDraw(map);
  }

  /** Load the drawing library and start listening. */
  async init() {
    await this._mapDraw.init();
    // mapbox-gl-draw's own map events. MapDraw registered its draw.create
    // handler first, so the previous polygon is already gone by then.
    for (const type of ['draw.create', 'draw.update', 'draw.delete']) {
      this._map.on(type, () => this._onChange(this.getGeometry()));
    }
    // MapDraw.clear() (its button's right-click, or ours) fires no map event, only this.
    window.addEventListener('region-cleared', () => this._onChange(null));
  }

  /** Enter draw mode, discarding any polygon. */
  start() {
    this._mapDraw.startDrawing();
  }

  /** Remove the polygon. */
  clear() {
    this._mapDraw.clear();
  }

  /** @returns {Object|null} The drawn Polygon geometry */
  getGeometry() {
    return this._mapDraw.draw.getAll().features[0]?.geometry ?? null;
  }
}
