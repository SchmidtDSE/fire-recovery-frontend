/**
 * File Utilities
 * Common functions for file operations and handling
 */

/**
 * Parse a shapefile using the shp.js library
 * @param {File} file - Shapefile (.zip) to parse
 * @returns {Promise<Object>} Promise resolving to GeoJSON data
 */
export function parseShapefile(file) {
  return new Promise((resolve, reject) => {
    // Check if file is a zip file (shapefile format)
    if (!file || !file.name.endsWith('.zip')) {
      reject(new Error('Invalid shapefile: File must be a .zip archive'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        // Parse using the global shp function (must be available in window)
        if (typeof shp !== 'function') {
          reject(new Error('shp.js library not loaded'));
          return;
        }
        
        shp(event.target.result)
          .then(data => resolve(data))
          .catch(error => reject(error));
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse a CSV file into an array of objects
 * @param {string} csvText - CSV text content
 * @returns {Array<Object>} Array of objects with properties based on header row
 */
export function parseCSVText(csvText) {
  const rows = csvText.split('\n').map(row => row.split(','));
  const headers = rows[0].map(header => header.trim());
  
  return rows.slice(1)
    .filter(row => row.length > 1) // Filter out empty rows
    .map(row => {
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = row[index]?.trim();
      });
      return rowData;
    });
}

/**
 * Fetch and parse CSV data from a URL
 * @param {string} url - URL to fetch CSV from
 * @returns {Promise<Array<Object>>} Promise resolving to array of objects
 */
export async function fetchCSVData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvText = await response.text();
    return parseCSVText(csvText);
  } catch (error) {
    console.error('Error fetching or processing CSV:', error);
    throw error;
  }
}

/**
 * Convert a base64 string to a blob object
 * @param {string} base64 - Base64 string to convert
 * @param {string} mimeType - MIME type of the data
 * @returns {Blob} Blob object
 */
export function base64ToBlob(base64, mimeType) {
  // Remove data URL prefix if present
  const base64Data = base64.includes('base64,') 
    ? base64.split('base64,')[1] 
    : base64;
    
  // Convert base64 to binary
  const byteString = atob(base64Data);
  
  // Create an array buffer and view
  const buffer = new ArrayBuffer(byteString.length);
  const view = new Uint8Array(buffer);
  
  // Fill the array buffer
  for (let i = 0; i < byteString.length; i++) {
    view[i] = byteString.charCodeAt(i);
  }
  
  // Create and return the blob
  return new Blob([buffer], { type: mimeType });
}