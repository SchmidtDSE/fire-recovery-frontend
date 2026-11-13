/**
 * UI utilities
 */

/**
 * Build a DOM element without HTML strings.
 * @param {string} tag
 * @param {Object} [props] - Element properties (className, href, src, ...)
 * @param {...(Node|string|null|false)} children - Nodes, or strings added as text; null/false are skipped
 * @returns {HTMLElement}
 */
export function createElement(tag, props = {}, ...children) {
  const element = Object.assign(document.createElement(tag), props);
  element.append(...children.filter((child) => child != null && child !== false));
  return element;
}
