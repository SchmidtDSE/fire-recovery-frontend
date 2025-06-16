import { IVegetationView } from './veg-contract.js';
import { PARK_UNITS } from '../../core/config.js';
import { MapManager } from '../../shared/map/map-manager.js';
import stateManager from '../../core/state-manager.js';

/**
 * Implementation of the Vegetation View
 */
export class VegetationView extends IVegetationView {
  /**
   * @param {IVegetationPresenter} presenter - The presenter
   */
  constructor(presenter) {
    super();
    this.presenter = presenter;
    this.map = null;
    this.mapContainer = null;
    this.tableContainer = null;
    this.vegMapLayer = null;
    this.baseLayer = null;
  }
  
  /**
   * Initialize the view
   */
  initializeView() {
    // Get DOM elements
    this.mapContainer = document.getElementById('map');
    this.tableContainer = document.getElementById('vegetation-table-container');
    
    if (this.mapContainer) {
      this.initializeMap();
    }
    
    this.addVegetationButton();
  }
  
  /**
   * Initialize the map
   */
  initializeMap() {
    // Get map manager instance
    const mapManager = MapManager.getInstance();
    
    // Get the shared map instance (will create if it doesn't exist)
    this.map = mapManager.getMap();
    
    // Get base layers from map manager
    this.baseLayer = mapManager.streetMapLayer;
    
    // Create vegetation-specific layer group
    this.resultLayerGroup = mapManager.createLayerGroup();
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Park unit select change event
    const parkUnitSelect = document.getElementById('park-unit-select');
    if (parkUnitSelect) {
      parkUnitSelect.addEventListener('change', (e) => {
        const selectedId = e.target.value;
        const parkUnit = PARK_UNITS.find(unit => unit.id === selectedId);
        if (parkUnit && this.presenter) {
          this.presenter.handleParkUnitChange(parkUnit);
        }
      });
    }
    
    // The "Analyze Vegetation Impact" button is added by App.addVegetationButton()
  }
  
  async showVegetationImpact() {
    // Hide any error messages
    const statusElem = document.getElementById('vegetation-status');
    if (statusElem) statusElem.innerHTML = '';
    
    // Show loading state
    const loadingElem = document.getElementById('vegetation-loading');
    if (loadingElem) loadingElem.style.display = 'flex';
    
    try {
      // Get structured data from state manager
      const vegetationCommunities = stateManager.getVegetationCommunities();
      
      if (vegetationCommunities && vegetationCommunities.length > 0) {
        // Use the structured data directly
        this.displayStructuredVegetationTable(vegetationCommunities);
        this.showVegetationTab();
        
        // Hide loading
        if (loadingElem) loadingElem.style.display = 'none';
      } else {
        throw new Error('No vegetation communities data available');
      }
    } catch (error) {
      console.error('Error displaying vegetation impact:', error);
      this.showMessage(`Error loading vegetation data: ${error.message}`, 'error');
      if (loadingElem) loadingElem.style.display = 'none';
    }
  }

  displayStructuredVegetationTable(vegetationCommunities) {
    // Create table container if it doesn't exist
    if (!document.getElementById('veg-results-container')) {
      const container = document.createElement('div');
      container.id = 'veg-results-container';
      container.className = 'veg-results-container';
      container.innerHTML = `
        <div class="results-header">
          <h3>Vegetation Impact Analysis</h3>
          <button id="download-veg-csv" class="action-button">
            <i class="fas fa-download"></i> Download CSV
          </button>
        </div>
        <div class="table-wrapper">
          <table id="veg-impact-table" class="vegetation-table">
            <thead></thead>
            <tbody></tbody>
          </table>
        </div>
      `;
      this.tableContainer.appendChild(container);
      
      // Add download handler
      document.getElementById('download-veg-csv').addEventListener('click', () => {
        this.downloadCsv();
      });
    }
    
    const table = document.getElementById('veg-impact-table');
    
    // Clear existing content
    table.innerHTML = '';
    
    // Create table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th class="expand-col"></th>
        <th class="color-col">Color</th>
        <th class="name-col">Vegetation Community</th>
        <th class="hectares-col">Total Hectares</th>
        <th class="percent-col">% of Park</th>
        <th class="severity-col">Severity Distribution</th>
      </tr>
    `;
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    // Sort communities by total hectares (descending)
    const sortedCommunities = [...vegetationCommunities].sort((a, b) => b.total_hectares - a.total_hectares);
    
    sortedCommunities.forEach((community, index) => {
      // Create parent row
      const parentRow = document.createElement('tr');
      parentRow.className = 'parent-row';
      parentRow.dataset.communityIndex = index;
      
      // Calculate severity distribution for mini chart
      const severityData = this.calculateSeverityDistribution(community.severity_breakdown);
      
      parentRow.innerHTML = `
        <td class="expand-cell">
          <i class="fas fa-plus-circle expand-icon" data-expanded="false"></i>
        </td>
        <td class="color-cell">
          <div class="color-swatch" style="background-color: ${community.color}"></div>
        </td>
        <td class="name-cell">
          <strong>${community.name}</strong>
        </td>
        <td class="hectares-cell">
          ${community.total_hectares.toFixed(2)} ha
        </td>
        <td class="percent-cell">
          ${community.percent_of_park.toFixed(1)}%
        </td>
        <td class="severity-cell">
          ${this.createSeverityMiniChart(severityData)}
        </td>
      `;
      
      tbody.appendChild(parentRow);
      
      // Create child rows (initially hidden)
      const severityOrder = ['unburned', 'low', 'moderate', 'high'];
      
      severityOrder.forEach(severity => {
        const severityData = community.severity_breakdown[severity];
        if (severityData && severityData.hectares > 0) {
          const childRow = document.createElement('tr');
          childRow.className = 'child-row';
          childRow.dataset.parentIndex = index;
          childRow.style.display = 'none';
          
          const severityColor = this.getSeverityColor(severity);
          
          childRow.innerHTML = `
            <td></td>
            <td class="color-cell">
              <div class="color-swatch small" style="background-color: ${severityColor}"></div>
            </td>
            <td class="name-cell severity-name">
              <span class="severity-label">${this.capitalizeFirst(severity)} Severity</span>
            </td>
            <td class="hectares-cell">
              ${severityData.hectares.toFixed(2)} ha
            </td>
            <td class="percent-cell">
              ${severityData.percent.toFixed(1)}%
            </td>
            <td class="severity-cell">
              <div class="severity-stats">
                <span class="stat">Mean: ${severityData.mean_severity.toFixed(3)}</span>
                <span class="stat">Std: ${severityData.std_dev.toFixed(3)}</span>
              </div>
            </td>
          `;
          
          tbody.appendChild(childRow);
        }
      });
    });
    
    table.appendChild(tbody);
    
    // Add expand/collapse functionality
    this.setupExpandCollapse();

  }

  calculateSeverityDistribution(severityBreakdown) {
    const severityOrder = ['unburned', 'low', 'moderate', 'high'];
    return severityOrder.map(severity => ({
      severity,
      percent: severityBreakdown[severity]?.percent || 0,
      hectares: severityBreakdown[severity]?.hectares || 0
    }));
  }

  createSeverityMiniChart(severityData) {
    const segments = severityData.map(item => {
      if (item.percent > 0) {
        const color = this.getSeverityColor(item.severity);
        return `<div class="severity-segment" 
                    style="width: ${item.percent}%; background-color: ${color}"
                    title="${item.severity}: ${item.percent.toFixed(1)}% (${item.hectares.toFixed(2)} ha)">
                </div>`;
      }
      return '';
    }).join('');
    
    return `<div class="severity-mini-chart">${segments}</div>`;
  }

  getSeverityColor(severity) {
    const colors = {
      'unburned': '#90EE90',
      'low': '#FFD700',
      'moderate': '#FF8C00',
      'high': '#FF4500'
    };
    return colors[severity.toLowerCase()] || '#cccccc';
  }

  setupExpandCollapse() {
    const expandIcons = document.querySelectorAll('.expand-icon');
    
    expandIcons.forEach(icon => {
      icon.addEventListener('click', (e) => {
        e.preventDefault();
        const parentRow = icon.closest('.parent-row');
        const parentIndex = parentRow.dataset.communityIndex;
        const childRows = document.querySelectorAll(`[data-parent-index="${parentIndex}"]`);
        const isExpanded = icon.dataset.expanded === 'true';
        
        if (isExpanded) {
          // Collapse
          icon.classList.remove('fa-minus-circle');
          icon.classList.add('fa-plus-circle');
          icon.dataset.expanded = 'false';
          childRows.forEach(row => row.style.display = 'none');
        } else {
          // Expand
          icon.classList.remove('fa-plus-circle');
          icon.classList.add('fa-minus-circle');
          icon.dataset.expanded = 'true';
          childRows.forEach(row => row.style.display = 'table-row');
        }
      });
    });
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  showVegetationTab() {
    // Show the vegetation tab and make it active
    const tabs = document.querySelectorAll('.tab-button');
    const contents = document.querySelectorAll('.tab-content');
    
    // Deactivate all tabs
    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(content => content.classList.add('hidden'));
    
    // Activate vegetation tab
    const vegTab = document.querySelector('.tab-button[data-tab="vegetation"]');
    if (vegTab) vegTab.classList.add('active');
    
    const vegContent = document.getElementById('vegetation-tab');
    if (vegContent) vegContent.classList.remove('hidden');
  }

  showMessage(message, type = 'info') {
    const statusElem = document.getElementById('vegetation-status');
    if (statusElem) {
      statusElem.textContent = message;
      statusElem.className = `status-message ${type}`;
    }
  }

  showLoadingState(message = 'Analyzing vegetation impact...') {
    const loadingElem = document.getElementById('vegetation-loading');
    if (loadingElem) {
      const messageElem = loadingElem.querySelector('p');
      if (messageElem) messageElem.textContent = message;
      loadingElem.style.display = 'flex';
    }
    
    this.showMessage(message, 'info');
  }


  downloadCsv() {
    const csvUrl = stateManager.getVegetationCsvUrl();
    if (csvUrl) {
      const link = document.createElement('a');
      link.href = csvUrl;
      link.download = 'vegetation_impact_analysis.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      this.showMessage('CSV download not available', 'error');
    }
  }
  
  addVegetationButton() {
    const refinementContainer = document.getElementById('refinement-container');
    if (!refinementContainer) return;
    
    const buttonGroup = refinementContainer.querySelector('.button-group');
    if (!buttonGroup) return;
    
    // Remove existing button if any
    const existingButton = document.getElementById('resolve-button');
    if (existingButton) existingButton.remove();
    
    // Create new button
    const resolveButton = document.createElement('button');
    resolveButton.id = 'resolve-button';
    resolveButton.className = 'action-button';
    resolveButton.innerHTML = '<i class="fas fa-leaf"></i> Analyze Vegetation Impact';
    
    // Add event listener for button click
    resolveButton.addEventListener('click', () => {
      console.log('Vegetation button clicked');
      if (this.presenter) {
        this.presenter.handleVegAnalysisRequested();
      } else {
        console.error('Presenter not available');
      }
    });
    
    buttonGroup.appendChild(resolveButton);
  }

  /**
   * Display a vegetation map COG layer
   * @param {string} vegMapUrl - URL to the vegetation map COG
   */
  async displayVegetationCOG(vegMapUrl) {
    try {
      if (!this.map) {
        console.warn('Map not initialized');
        return;
      }
      
      // Clear any existing layers
      this.resultLayerGroup.clearLayers();
      
      const response = await fetch(vegMapUrl);
      const arrayBuffer = await response.arrayBuffer();
      const georaster = await parseGeoraster(arrayBuffer);
      
      // Using color mapping logic adapted from vegModelURL.js
      const layer = new GeoRasterLayer({
        georaster: georaster,
        opacity: 0.7,
        pixelValuesToColorFn: (value) => {
          // Get CSS variables if available
          const primary = getComputedStyle(document.documentElement)
            .getPropertyValue('--primary-color').trim() || 'rgb(55, 8, 85)';
          const secondary = getComputedStyle(document.documentElement)
            .getPropertyValue('--secondary-color').trim() || 'rgb(39, 80, 123)';
          const tertiary = getComputedStyle(document.documentElement)
            .getPropertyValue('--tertiary-color').trim() || 'rgb(31, 120, 122)';
          const quaternary = getComputedStyle(document.documentElement)
            .getPropertyValue('--quaternary-color').trim() || 'rgb(52, 178, 98)';
          const quinary = getComputedStyle(document.documentElement)
            .getPropertyValue('--quinary-color').trim() || 'rgb(171, 219, 32)';
            
          if (value < 100) {
            return primary;
          } else if (value > 100 && value < 500) {
            return secondary;
          } else if (value > 500 && value < 1000) {
            return tertiary;
          } else if (value > 1000 && value < 1500) {
            return quaternary;
          } else if (value > 1500) {
            return quinary;
          } else {
            return "transparent";
          }
        },
        resolution: 256
      });
      
      layer.addTo(this.resultLayerGroup);
      this.map.fitBounds(layer.getBounds());
      
      return layer;
    } catch (error) {
      console.error('Error displaying vegetation COG:', error);
      this.showErrorState(`Error displaying vegetation map: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Display success state
   */
  showSuccessState() {
    const resolveButton = document.getElementById('resolve-button');
    if (resolveButton) {
      // First show completion message
      resolveButton.innerHTML = '<i class="fas fa-check"></i> Analysis Complete';
      
      // After a short delay, reset the button to allow re-running the analysis
      setTimeout(() => {
        resolveButton.disabled = false;
        resolveButton.innerHTML = '<i class="fas fa-leaf"></i> Analyze Vegetation Impact';
      }, 2000);
    }
  }
  
  /**
   * Display error state
   * @param {string} message - Error message
   */
  showErrorState(message) {
    const resolveButton = document.getElementById('resolve-button');
    if (resolveButton) {
      resolveButton.disabled = false;
      resolveButton.textContent = 'Retry Vegetation Analysis';
    }
    
    // Show alert or more elegant error display
    console.error(message);
    alert(message);
  }
  
  /**
   * Set presenter reference
   * @param {IVegetationPresenter} presenter - The presenter
   */
  setPresenter(presenter) {
    this.presenter = presenter;
  }
}