/**
 * Main Application Entry Point
 * This file bootstraps the entire application and orchestrates feature initialization
 */

import App from './core/app.js';

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.initialize();
  
  // Make app available globally for debugging
  window.app = app;
});

/**
 * Feature detection and compatibility checks
 * Make sure we have all required browser features
 */
function checkBrowserCompatibility() {
  const requiredFeatures = {
    'Fetch API': typeof fetch === 'function',
    'Promise': typeof Promise === 'function',
    'ES6 Modules': typeof import === 'function',
    'CSS Variables': window.CSS && CSS.supports('--test', '0'),
    'Web Workers': typeof Worker === 'function'
  };
  
  const missingFeatures = Object.entries(requiredFeatures)
    .filter(([_, isSupported]) => !isSupported)
    .map(([name]) => name);
    
  if (missingFeatures.length > 0) {
    console.warn('Browser compatibility issues detected!');
    console.warn('Missing features:', missingFeatures.join(', '));
    
    // Notify the user if there are compatibility issues
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      showCompatibilityWarning(missingFeatures);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        showCompatibilityWarning(missingFeatures);
      });
    }
    
    return false;
  }
  
  return true;
}

/**
 * Show compatibility warning to the user
 * @param {Array<string>} missingFeatures - List of missing browser features
 */
function showCompatibilityWarning(missingFeatures) {
  const warningDiv = document.createElement('div');
  warningDiv.style.position = 'fixed';
  warningDiv.style.top = '0';
  warningDiv.style.left = '0';
  warningDiv.style.right = '0';
  warningDiv.style.backgroundColor = '#fff3cd';
  warningDiv.style.color = '#856404';
  warningDiv.style.padding = '15px';
  warningDiv.style.textAlign = 'center';
  warningDiv.style.zIndex = '9999';
  warningDiv.style.borderBottom = '1px solid #ffeeba';
  
  warningDiv.innerHTML = `
    <strong>Warning:</strong> Your browser is missing features required by this application. 
    For the best experience, please use a modern browser like Chrome, Firefox, or Edge.
    <br>
    <small>Missing features: ${missingFeatures.join(', ')}</small>
  `;
  
  document.body.prepend(warningDiv);
}

// Run compatibility check
checkBrowserCompatibility();

// Export the App class for direct imports if needed
export default App;