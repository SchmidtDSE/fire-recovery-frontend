import { IVegetationView } from './veg-contract.js';
import { PARK_UNITS } from '../../core/config.js';
import { MapManager } from '../../shared/map/map-manager.js';

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
    this.tableContainer = document.getElementById('table-container');
    
    if (this.mapContainer) {
      this.initializeMap();
    }
    
    if (this.tableContainer) {
      this.createVegetationTable();
    }
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
  
  /**
   * Create the vegetation table structure
   */
  createVegetationTable() {
    if (!this.tableContainer) return;
    
    // Clear existing content
    this.tableContainer.innerHTML = '';
    
    // Create table structure
    const table = document.createElement('table');
    table.id = 'veg-impact-table';
    table.className = 'display';
    
    // Add table headers
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['Color', 'Vegetation Community', 'Hectares', 
                     '% of Park', '% of Burn Area', 'Mean Severity', 'Std Dev'];
    
    headers.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Add table body
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    
    // Add table to container
    this.tableContainer.appendChild(table);
    
    // Initialize DataTable if jQuery is available
    if (window.$ && $.fn.DataTable) {
      $(document).ready(() => {
        $('#veg-impact-table').DataTable({
          paging: false,
          searching: false,
          info: false
        });
      });
    }
  }
  
  /**
   * Update vegetation map table with data
   * @param {string} csvUrl - URL to vegetation impact CSV data
   */
  async updateVegMapTable(csvUrl) {
    try {
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const csvText = await response.text();
      const rows = csvText.split('\n').map(row => row.split(','));
      const headers = rows[0];
      const data = rows.slice(1)
            .filter(row => row.length > 1) // Skip empty rows
            .map(row => {
                return [
                    row[1]?.trim() || '#000000', // color - adapted from vegMapTable.js
                    row[0]?.trim() || '', // vegetation type
                    row[2]?.trim() || '', // hectares
                    row[3]?.trim() || '', // percent park
                    row[4]?.trim() || '', // percent burn area
                    row[5]?.trim() || '', // burn severity mean
                    row[6]?.trim() || ''  // burn severity SD
                ];
            });
      
      // Update table with CSV data using jQuery DataTable if available
      if (window.$ && $.fn.DataTable) {
        const table = $('#veg-impact-table').DataTable();
        table.clear();
        
        data.forEach(row => {
          table.row.add([
            `<div style="width: 15px; height: 15px; background-color: ${row[0]}"></div>`,
            row[1],
            row[2],
            row[3],
            row[4],
            row[5],
            row[6]
          ]);
        });
        
        table.draw();
      } else {
        // Fallback for when jQuery DataTables isn't available
        const tbody = document.querySelector('#veg-impact-table tbody');
        tbody.innerHTML = '';
        
        data.forEach(row => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><div style="width: 15px; height: 15px; background-color: ${row[0]}"></div></td>
            <td>${row[1]}</td>
            <td>${row[2]}</td>
            <td>${row[3]}</td>
            <td>${row[4]}</td>
            <td>${row[5]}</td>
            <td>${row[6]}</td>
          `;
          tbody.appendChild(tr);
        });
      }
      
      this.tableContainer.style.display = 'block';
    } catch (error) {
      console.error('Error fetching or processing CSV:', error);
      this.showErrorState(`Error loading vegetation data: ${error.message}`);
    }
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
   * Display loading state
   */
  showLoadingState() {
    const resolveButton = document.getElementById('resolve-button');
    if (resolveButton) {
      resolveButton.disabled = true;
      resolveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    }
  }
  
  /**
   * Display success state
   */
  showSuccessState() {
    const resolveButton = document.getElementById('resolve-button');
    if (resolveButton) {
      resolveButton.disabled = true;
      resolveButton.innerHTML = '<i class="fas fa-check"></i> Analysis Complete';
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