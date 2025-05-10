/**
 * Date Utilities
 * Common functions for date manipulation and formatting
 */

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @param {Object} options - Formatting options (see Intl.DateTimeFormat)
 * @returns {string} Formatted date
 */
export function formatDate(dateString, options = null) {
  const date = new Date(dateString);
  
  const defaultOptions = {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit'
  };
  
  const formatOptions = options || defaultOptions;
  return date.toLocaleDateString('en-US', formatOptions);
}

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 * @returns {string} Today's date
 */
export function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get a date relative to today
 * @param {number} days - Number of days relative to today (negative for past)
 * @returns {string} ISO date string
 */
export function getRelativeDateISO(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Check if a date is within a valid range
 * @param {string} dateString - ISO date to check
 * @param {string} startDate - ISO date for start of range
 * @param {string} endDate - ISO date for end of range
 * @returns {boolean} True if date is within range
 */
export function isDateInRange(dateString, startDate, endDate) {
  const date = new Date(dateString);
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return date >= start && date <= end;
}

/**
 * Get the number of days between two dates
 * @param {string} startDateString - ISO start date
 * @param {string} endDateString - ISO end date
 * @returns {number} Number of days between dates
 */
export function getDaysBetweenDates(startDateString, endDateString) {
  const startDate = new Date(startDateString);
  const endDate = new Date(endDateString);
  
  // Convert to days and round
  const diffTime = endDate - startDate;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Create a date range for form inputs
 * @param {number} preFireStartDaysAgo - Days ago for pre-fire start
 * @param {number} preFireEndDaysAgo - Days ago for pre-fire end
 * @param {number} postFireStartDaysAgo - Days ago for post-fire start
 * @param {number} postFireEndDaysAgo - Days ago for post-fire end
 * @returns {Object} Object with date strings
 */
export function createFireDateRange(
  preFireStartDaysAgo = 60,
  preFireEndDaysAgo = 45,
  postFireStartDaysAgo = 30,
  postFireEndDaysAgo = 15
) {
  return {
    prefireStart: getRelativeDateISO(-preFireStartDaysAgo),
    prefireEnd: getRelativeDateISO(-preFireEndDaysAgo),
    postfireStart: getRelativeDateISO(-postFireStartDaysAgo),
    postfireEnd: getRelativeDateISO(-postFireEndDaysAgo)
  };
}