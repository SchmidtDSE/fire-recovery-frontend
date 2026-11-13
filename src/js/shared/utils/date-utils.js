/**
 * Date utilities (dates are ISO YYYY-MM-DD strings, which compare correctly as strings)
 */

/**
 * How a date in a chain of [start, end, start, end, ...] inputs anchors the next one:
 * an end date can't precede its start, and an empty or too-early next date takes
 * this date, so its picker opens near it.
 * @param {string} value - This date
 * @param {string} next - The next date ('' if empty)
 * @param {boolean} isStart - Whether this date starts a range (so the next one ends it)
 * @returns {{min: string|null, value: string}} The next input's min (null: leave as is) and value
 */
export function anchorNextDate(value, next, isStart) {
  return {
    min: isStart ? value : null,
    value: !next || (isStart && next < value) ? value : next,
  };
}
