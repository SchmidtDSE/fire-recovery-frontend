/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit'
  });
}

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 * @returns {string} Today's date
 */
export function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}