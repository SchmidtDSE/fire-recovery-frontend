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
    this.tableContainer = document.getElementById('vegetation-table-container');
    
    if (this.mapContainer) {
      this.initializeMap();
    }
    
    if (this.tableContainer) {
      this.createVegetationTable();
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
    
    // // Add table headers
    // const thead = document.createElement('thead');
    // const headerRow = document.createElement('tr');
    
    // const headers = ['Color', 'Vegetation Community', 'Hectares', 
    //                  '% of Park', '% of Burn Area', 'Mean Severity', 'Std Dev'];
    
    // headers.forEach(header => {
    //   const th = document.createElement('th');
    //   th.textContent = header;
    //   headerRow.appendChild(th);
    // });
    
    // thead.appendChild(headerRow);
    // table.appendChild(thead);
    
    // Add table body
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    
    // Add table to container
    this.tableContainer.appendChild(table);
    
    // Initialize DataTable if jQuery is available
    // if (window.$ && $.fn.DataTable) {
    //   $(document).ready(() => {
    //     $('#veg-impact-table').DataTable({
    //       paging: false,
    //       searching: false,
    //       info: false
    //     });
    //   });
    // }
  }

async showVegetationImpact(csvUrl) {
  // Hide any error messages
  const statusElem = document.getElementById('vegetation-status');
  if (statusElem) statusElem.innerHTML = '';
  
  // Show loading state
  const loadingElem = document.getElementById('vegetation-loading');
  if (loadingElem) loadingElem.style.display = 'flex';
  
  try {
    // Fetch and parse the CSV using Papa Parse
    Papa.parse(csvUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length) {
          console.error('CSV parsing errors:', results.errors);
          this.showMessage('Error parsing vegetation data', 'error');
          return;
        }
        
        // Hide the loading indicator
        if (loadingElem) loadingElem.style.display = 'none';
        
        // Store the data for potential download
        this._vegData = results.data;
        
        // Use DataTables to display the vegetation data
        this.populateDataTable(results.data);
        
        // Show vegetation tab if not already active
        this.showVegetationTab();
      },
      error: (error) => {
        // Hide loading indicator
        if (loadingElem) loadingElem.style.display = 'none';
        
        console.error('CSV fetch error:', error);
        this.showMessage('Error fetching vegetation data', 'error');
      }
    });
    
    // Setup download button handler
    const downloadBtn = document.getElementById('download-veg-csv');
    if (downloadBtn) {
      downloadBtn.onclick = () => this.downloadCsv();
    }
    
  } catch (error) {
    // Hide loading indicator
    if (loadingElem) loadingElem.style.display = 'none';
    
    console.error('Vegetation display error:', error);
    this.showMessage(`Error: ${error.message}`, 'error');
  }
}

  populateDataTable(data) {
    // Check if jQuery and DataTables are available
    if (window.$ && $.fn.DataTable) {
      // Destroy existing DataTable instance if it exists
      if ($.fn.DataTable.isDataTable('#veg-impact-table')) {
        $('#veg-impact-table').DataTable().destroy();
      }
      
      // Clear the table
      const tableBody = document.querySelector('#veg-impact-table tbody');
      if (tableBody) tableBody.innerHTML = '';
      
      // Filter data to only include rows where percent_fire > 0
      const filteredData = data.filter(item => {
        // Convert to number and check if greater than 0
        const percentFire = parseFloat(item["% of Burn Area"]);
        return !isNaN(percentFire) && percentFire > 0;
      });
      
      // Create new DataTable with explicit header names
      const table = $('#veg-impact-table').DataTable({
        data: filteredData,
        columns: [
          {
            title: "Color", // Add explicit title
            data: 'Color',
            render: function(data) {
              const colorCode = data || '#cccccc';
              return `<div style="width:30px; height:30px; background-color:${colorCode}; 
                      border-radius:4px; margin:0 auto; display:flex; align-items:center; 
                      justify-content:center; border:1px solid #ddd;"></div>`;
            },
            className: 'color-cell'
          },
          { 
            title: "Vegetation Community", // Add explicit title
            data: 'Vegetation Community', 
            width: '70%',
            render: function(data) {
              return `<div style="white-space: normal; word-break: break-word;">${data}</div>`;
            }
          },
          { title: "% of Burn Area", data: '% of Burn Area' }, // Add explicit title
          { title: "Mean Severity", data: 'Mean Severity' },   // Add explicit title
          { title: "Std Dev", data: 'Std Dev' }               // Add explicit title
        ],
        order: [[2, 'desc']], // Order by % of Burn Area in descending order
        paging: true,
        searching: true,
        ordering: true,
        info: true,
        autoWidth: false,  // Important: disable auto width
        scrollX: true,     // Enable horizontal scrolling if needed
        responsive: true   // Make the table responsive
      });

      $('#veg-impact-table_wrapper').css('width', '90%');
      
      // Add helper function for contrast color calculation
      function getContrastColor(hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        
        // Calculate perceived brightness
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        // Return black or white based on brightness
        return brightness > 128 ? '#000000' : '#ffffff';
      }
    } else {
      // Fallback to basic HTML if DataTables isn't available
      this.createSimpleTable(data);
    }
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

  displayVegetationTable(data) {
    // Create table container if it doesn't exist
    if (!document.getElementById('veg-results-container')) {
      const container = document.createElement('div');
      container.id = 'veg-results-container';
      container.className = 'results-container';
      
      const title = document.createElement('h3');
      title.textContent = 'Vegetation Impact Analysis';
      container.appendChild(title);
      
      const tableContainer = document.createElement('div');
      tableContainer.className = 'table-container';
      
      // Create the table
      const table = document.createElement('table');
      table.id = 'veg-impact-table';
      table.className = 'data-table';
      tableContainer.appendChild(table);
      container.appendChild(tableContainer);
      
      // Add download button
      const downloadBtn = document.createElement('button');
      downloadBtn.textContent = 'Download CSV';
      downloadBtn.className = 'action-button';
      downloadBtn.addEventListener('click', () => this.downloadCsv());
      container.appendChild(downloadBtn);
      
      document.getElementById('vegetation-section').appendChild(container);
    }
    
    // Store the data for potential download
    this._vegData = data;
    
    // Get reference to table
    const table = document.getElementById('veg-impact-table');
    table.innerHTML = '';
    
    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Add headers
    const headers = ['Color', 'Vegetation Type', 'Hectares', '% of Park', '% of Fire', 'Mean Severity', 'SD'];
    headers.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    // Add data rows
    data.forEach(item => {
      const row = document.createElement('tr');
      
      // Color cell - create a colored div
      const colorCell = document.createElement('td');
      const colorBox = document.createElement('div');
      colorBox.style.backgroundColor = item.color || '#cccccc';
      colorBox.style.width = '15px';
      colorBox.style.height = '15px';
      colorBox.style.margin = '0 auto';
      colorCell.appendChild(colorBox);
      row.appendChild(colorCell);
      
      // Other cells
      [
        item.vegetation_type,
        item.hectares,
        item.percent_park,
        item.percent_fire,
        item.severity_mean,
        item.severity_sd
      ].forEach(text => {
        const td = document.createElement('td');
        td.textContent = text || '-';
        row.appendChild(td);
      });
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
  }

  downloadCsv() {
    if (!this._vegData) return;
    
    // Convert data to CSV using Papa Parse
    const csv = Papa.unparse(this._vegData);
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'vegetation_impact.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      const headers = rows[0].map(h => h.trim());
      
      // Get column indices by header name
      const columnIndices = {
        vegetationType: headers.findIndex(h => h.includes('Vegetation') || h.includes('Community')),
        color: headers.findIndex(h => h.includes('Color')),
        hectares: headers.findIndex(h => h.includes('Hectares')),
        percentPark: headers.findIndex(h => h.includes('% of Park')),
        percentBurn: headers.findIndex(h => h.includes('% of Burn')),
        severity: headers.findIndex(h => h.includes('Mean') || h.includes('Severity')),
        stdDev: headers.findIndex(h => h.includes('Std Dev') || h.includes('SD'))
      };
      
      // Filter for rows with valid data and map to expected format
      const data = rows.slice(1)
        .filter(row => row.length > 1) // Skip empty rows
        .map(row => {
          return [
            row[columnIndices.color]?.trim() || '#000000', // color
            row[columnIndices.vegetationType]?.trim() || '', // vegetation type
            row[columnIndices.hectares]?.trim() || '', // hectares
            row[columnIndices.percentPark]?.trim() || '', // percent park
            row[columnIndices.percentBurn]?.trim() || '', // percent burn area
            row[columnIndices.severity]?.trim() || '', // burn severity mean
            row[columnIndices.stdDev]?.trim() || ''  // burn severity SD
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