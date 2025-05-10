/**
 * UI Utilities
 * Common functions for UI interactions and manipulations
 */

/**
 * Get CSS variable value from document root
 * @param {string} variableName - CSS variable name (without --) 
 * @returns {string} CSS variable value
 */
export function getCSSVariableValue(variableName) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--${variableName}`).trim();
}

/**
 * Show a loading state on an element
 * @param {HTMLElement|string} element - Element or element ID
 * @param {string} message - Loading message (optional) 
 * @returns {function} Function to revert loading state
 */
export function showLoadingState(element, message = 'Loading...') {
  const targetEl = typeof element === 'string' ? document.getElementById(element) : element;
  if (!targetEl) return () => {};
  
  // Store original content
  const originalContent = targetEl.innerHTML;
  const originalDisabled = targetEl.disabled;
  
  // Set loading state
  targetEl.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
  targetEl.disabled = true;
  
  // Return function to revert state
  return () => {
    targetEl.innerHTML = originalContent;
    targetEl.disabled = originalDisabled;
  };
}

/**
 * Show an error message in a target container
 * @param {string} message - Error message to display
 * @param {HTMLElement|string} container - Container element or ID
 * @param {number} timeout - Auto-hide timeout in ms (0 for no auto-hide)
 */
export function showErrorMessage(message, container, timeout = 5000) {
  const targetContainer = typeof container === 'string' 
    ? document.getElementById(container) 
    : container;
    
  if (!targetContainer) return;
  
  // Create error element
  const errorElement = document.createElement('div');
  errorElement.className = 'error-message';
  errorElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
  errorElement.style.color = 'red';
  errorElement.style.margin = '10px 0';
  
  // Add to container
  targetContainer.appendChild(errorElement);
  
  // Auto-hide if timeout is provided
  if (timeout > 0) {
    setTimeout(() => {
      if (errorElement.parentNode === targetContainer) {
        targetContainer.removeChild(errorElement);
      }
    }, timeout);
  }
}

/**
 * Toggle visibility of an element
 * @param {HTMLElement|string} element - Element or element ID
 * @param {boolean} visible - Whether element should be visible
 */
export function setElementVisibility(element, visible) {
  const targetEl = typeof element === 'string' ? document.getElementById(element) : element;
  if (!targetEl) return;
  
  targetEl.style.display = visible ? 'block' : 'none';
}

/**
 * Update table with data
 * @param {string} tableId - ID of the table element or DataTable
 * @param {Array} data - Array of data rows
 * @param {boolean} isDataTable - Whether table is a jQuery DataTable
 */
export function updateTable(tableId, data, isDataTable = true) {
  // Handle jQuery DataTable
  if (isDataTable) {
    const table = $(`#${tableId}`).DataTable();
    table.clear();
    table.rows.add(data);
    table.draw();
    return;
  }
  
  // Handle standard HTML table
  const table = document.getElementById(tableId);
  if (!table) return;
  
  // Clear existing rows except header
  while (table.rows.length > 1) {
    table.deleteRow(1);
  }
  
  // Add new rows
  data.forEach(rowData => {
    const row = table.insertRow();
    Object.values(rowData).forEach(cellData => {
      const cell = row.insertCell();
      cell.textContent = cellData;
    });
  });
}

/**
 * Create a simple modal dialog
 * @param {string} title - Dialog title
 * @param {string} content - Dialog content (can be HTML)
 * @param {Array} buttons - Array of button configs {text, action, isPrimary}
 * @returns {HTMLElement} The modal element
 */
export function createModal(title, content, buttons = []) {
  // Create modal container
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = '1000';
  
  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  modalContent.style.backgroundColor = '#fff';
  modalContent.style.padding = '20px';
  modalContent.style.borderRadius = '5px';
  modalContent.style.maxWidth = '500px';
  modalContent.style.width = '100%';
  
  // Create title
  const titleElement = document.createElement('h3');
  titleElement.textContent = title;
  modalContent.appendChild(titleElement);
  
  // Add content
  const contentElement = document.createElement('div');
  contentElement.innerHTML = content;
  modalContent.appendChild(contentElement);
  
  // Add buttons
  if (buttons.length > 0) {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginTop = '20px';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '10px';
    
    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.textContent = btn.text;
      button.className = btn.isPrimary ? 'primary-button' : 'secondary-button';
      button.onclick = () => {
        if (btn.action) btn.action();
        document.body.removeChild(modal);
      };
      buttonContainer.appendChild(button);
    });
    
    modalContent.appendChild(buttonContainer);
  }
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  // Close on click outside
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      document.body.removeChild(modal);
    }
  });
  
  return modal;
}