import stateManager from './state-manager.js';

/**
 * Application controller for coordinating between modules and handling
 * state import/export functionality
 */
export class AppController {
  constructor() {
    this.components = null;
  }
  
  /**
   * Initialize the controller with references to app components
   * @param {Object} components - Application components
   */
  initialize(components) {
    this.components = components;
    this.setupStateManagement();
  }
  
  /**
   * Setup state import/export functionality
   */
  setupStateManagement() {
    // Setup export button
    const exportButton = document.getElementById('export-state-button');
    if (exportButton) {
      exportButton.addEventListener('click', () => this.exportState());
    }
    
    // Setup import button and file input
    const importButton = document.getElementById('import-state-button');
    const fileInput = document.getElementById('import-state-file');
    
    if (importButton && fileInput) {
      importButton.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (event) => this.importState(event.target.files[0]));
    }
    
    // Listen for state imports to trigger module-specific updates
    stateManager.on('stateImported', (event) => {
      this.handleStateImported(event);
    });
  }
  
  /**
   * Export current application state
   */
  exportState() {
    const state = stateManager.exportState();
    const jsonString = JSON.stringify(state, null, 2);
    
    // Create a filename using fire event name or a timestamp
    const fireEventName = state.fireEventName || 'fire-analysis';
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${fireEventName}-${timestamp}.json`;
    
    // Create and trigger download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Show confirmation message
    this.showNotification('Analysis state exported successfully');
  }
  
  /**
   * Import state from a file
   * @param {File} file - JSON file to import
   */
  async importState(file) {
    if (!file) return;
    
    try {
      const text = await this.readFileAsText(file);
      const importedState = JSON.parse(text);
      
      // Import the state through the state manager
      const success = stateManager.importState(importedState, 'app-controller');
      
      if (success) {
        this.showNotification('Analysis state imported successfully');
      } else {
        this.showNotification('Failed to import analysis state', 'error');
      }
    } catch (error) {
      console.error('Error importing state:', error);
      this.showNotification(`Import error: ${error.message}`, 'error');
    }
  }
  
  /**
   * Read a file as text
   * @param {File} file - File to read
   * @returns {Promise<string>} File contents
   */
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }
  
  /**
   * Handle state imported event
   * @param {Object} event - Event data
   */
  handleStateImported(event) {
    const state = event.state;
    
    // Update fire module
    if (this.components.fire && this.components.fire.presenter) {
      if (typeof this.components.fire.presenter.refreshFromImportedState === 'function') {
        this.components.fire.presenter.refreshFromImportedState(state);
      }
    }
    
    // Update vegetation module
    if (this.components.vegetation && this.components.vegetation.presenter) {
      if (typeof this.components.vegetation.presenter.refreshFromImportedState === 'function') {
        this.components.vegetation.presenter.refreshFromImportedState(state);
      }
    }
  }
  
  /**
   * Show a notification message
   * @param {string} message - Message to show
   * @param {string} type - Message type (success, error, info)
   */
  showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after delay
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 500);
    }, 3000);
  }
}