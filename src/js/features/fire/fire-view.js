import { IFireView } from './fire-contract.js';
import { formatDate, getTodayISO } from '../../shared/utils/date-utils.js';
import { displayCOGLayer, loadVegetationCOGLayer } from '../../shared/map/cog-renderer.js';
import { getDefaultGeoJsonStyle } from '../../shared/map/draw-tools.js';
import { MapManager } from '../../shared/map/map-manager.js';
import { parkUnits } from '../../core/config.js';
import stateManager from '../../core/state-manager.js';

/**
 * Implementation of the Fire View
 */
export class FireView extends IFireView {
  /**
   * @param {IFirePresenter} presenter - The presenter
   */
  constructor(presenter) {
    super();
    this.presenter = presenter;
    
    // Map components
    this.map = null;
    this.streetMapLayer = null;
    this.satelliteLayer = null;
    this.cogLayer = null;
    this.geoJsonLayerGroup = null;
    this.resultLayerGroup = null;
    this.drawControl = null;
    
    // UI state
    this.hasDrawnRefinement = false;
  }
  
  /**
   * Initialize the view
   */
  initializeView() {
    this.initializeMap();
    this.setupDateLimits();
    this.setupParkUnitDropdown();
    this.setupFireSeverityMetricDropdown();
    this.setupTestPrefill();
    // this.createColorBreakControls();

    stateManager.on('activeMetricChanged', () => {
      this.refreshMapVisualization();
  });
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
    this.streetMapLayer = mapManager.streetMapLayer;
    this.satelliteLayer = mapManager.satelliteLayer;
    
    // Create feature-specific layer groups
    this.geoJsonLayerGroup = mapManager.createFeatureGroup();
    this.resultLayerGroup = mapManager.createLayerGroup();
    
    // Initialize draw control specific to FireView
    this.drawControl = new L.Control.Draw({
      edit: {
        featureGroup: this.geoJsonLayerGroup
      },
      draw: {
        polyline: false,
        circle: false,
        rectangle: false,
        marker: false,
        circlemarker: false,
        polygon: true
      }
    });
    
    this.map.addControl(this.drawControl);
    
    // Setup draw event
    this.map.on(L.Draw.Event.CREATED, (event) => {
      this.geoJsonLayerGroup.clearLayers();
      const layer = event.layer;
      this.geoJsonLayerGroup.addLayer(layer);
      this.hasDrawnRefinement = true;
      document.getElementById('refine-button').disabled = false;
    });
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Process button
    const processButton = document.getElementById('process-button');
    if (processButton) {
      processButton.addEventListener('click', () => this.presenter.handleFireAnalysisSubmission());
    }
    
    // Refinement buttons
    document.getElementById('refine-button').addEventListener('click', () => {
      if (!this.hasDrawnRefinement) {
        alert('Please draw a refined boundary on the map');
        return;
      }
      this.presenter.handleRefinementSubmission();
    });
    
    document.getElementById('reset-button').addEventListener('click', () => {
      this.presenter.handleReset();
    });
    
    // Map layer buttons
    this.setupMapButtons();
    
    // Shapefile upload
    this.setupShapefileUpload();
    
    // Fire event name input
    document.getElementById('fire-event-name').addEventListener('input', (e) => {
      this.presenter.handleFireEventNameChange(e.target.value);
    });
    
    // Fire severity metric dropdown
    document.getElementById('fire-severity-metric-select').addEventListener('change', (e) => {
      this.presenter.handleMetricChange(e.target.value);
    });
    
    // Park unit dropdown
    document.getElementById('park-unit').addEventListener('change', (e) => {
      const select = e.target;
      const selectedOption = select.options[select.selectedIndex];
      const parkData = {
        id: select.value,
        name: selectedOption.textContent,
        veg_cog_url: selectedOption.dataset.vegCogUrl,
        veg_geopkg_url: selectedOption.dataset.vegGeopkgUrl
      };
      this.presenter.handleParkUnitChange(parkData);
    });

    // Accept button for veg map resolution
    document.getElementById('accept-button').addEventListener('click', () => {
      this.presenter.handleAcceptRefinement();
      document.getElementById('refine-button').disabled = true;
      document.getElementById('accept-button').disabled = true;
    });
  }
  
  /**
   * Get form values
   * @returns {Object} Form values
   */
  getFormValues() {
    return {
      prefireStart: document.getElementById('prefire-start-date').value,
      prefireEnd: document.getElementById('prefire-end-date').value,
      postfireStart: document.getElementById('postfire-start-date').value,
      postfireEnd: document.getElementById('postfire-end-date').value,
      fireEventName: document.getElementById('fire-event-name').value
    };
  }
  
  /**
   * Get geometry from map
   * @returns {Object} GeoJSON geometry
   */
  getGeometryFromMap() {
    let geometry = null;
    this.geoJsonLayerGroup.eachLayer((layer) => {
      if (layer instanceof L.Polygon) {
        geometry = layer.toGeoJSON().geometry;
      }
    });
    return geometry;
  }
  
  /**
   * Setup map buttons
   */
  setupMapButtons() {
    document.querySelectorAll('.map-button').forEach(button => {
      button.addEventListener('click', () => {
        // Remove 'active' class from all buttons
        document.querySelectorAll('.map-button').forEach(btn => btn.classList.remove('active'));
        
        // Add 'active' class to the clicked button
        button.classList.add('active');
        
        // Get button text
        const buttonText = button.textContent.trim();
        
        // Toggle veg-map-active class on body
        if (buttonText === 'Vegetation') {
          document.body.classList.add('veg-map-active');
        } else {
          document.body.classList.remove('veg-map-active');
        }
        
        // Switch map layers
        if (buttonText === 'Vegetation') {
          this.loadCOGLayer();
        } else {
          this.switchToLayer(buttonText === 'Street Map' ? this.streetMapLayer : this.satelliteLayer);
        }

        // Show/hide table based on view - Add null check
        const tableContainer = document.getElementById('table-container');
        if (buttonText === 'Vegetation') {
          const fireMetric = document.getElementById('fire-severity-metric');
          if (fireMetric && fireMetric.style.display === 'block' && tableContainer) {
            tableContainer.style.display = 'block';
          }
        } else if (tableContainer) {
          tableContainer.style.display = 'none';
        }
      });
    });
  }
  
  /**
   * Setup shapefile upload
   */
  setupShapefileUpload() {
    document.getElementById('upload-shapefile').addEventListener('change', (event) => {
      const file = event.target.files[0];
      const uploadStatus = document.getElementById('uploadStatus');
    
      if (!file || !file.name.endsWith('.zip')) {
        uploadStatus.textContent = 'File upload failed. Please upload a valid shapefile.';
        uploadStatus.style.color = 'red';
        return;
      }
    
      const reader = new FileReader();
      reader.onload = (e) => {
        shp(e.target.result).then((data) => {
          this.geoJsonLayerGroup.clearLayers();
          L.geoJSON(data, { style: getDefaultGeoJsonStyle() }).addTo(this.geoJsonLayerGroup);
    
          uploadStatus.textContent = `${file.name} was uploaded successfully.`;
          uploadStatus.style.color = 'black';
          
          this.presenter.handleShapefileUploaded(file);
        }).catch((error) => {
          console.error("Error while parsing shapefile:", error);
          uploadStatus.textContent = "Upload failed. Please try again.";
          uploadStatus.style.color = 'red';
        });
      };
      reader.readAsArrayBuffer(file);
    });
  }
  
  /**
   * Show loading state
   */
  showLoadingState() {
    const statusIcon = document.getElementById('process-status');
    const processButton = document.getElementById('process-button');
    
    statusIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    statusIcon.style.color = '#007bff';
    processButton.disabled = true;
  }
  
  /**
   * Show success state
   */
  showSuccessState() {
    const statusIcon = document.getElementById('process-status');
    
    statusIcon.innerHTML = '<i class="fas fa-check"></i>';
    statusIcon.style.color = 'green';
  }
  
  /**
   * Show error state
   * @param {string} message - Error message
   */
  showErrorState(message) {
    const statusIcon = document.getElementById('process-status');
    const processButton = document.getElementById('process-button');
    
    statusIcon.innerHTML = '<i class="fas fa-times"></i>';
    statusIcon.style.color = 'red';
    processButton.disabled = false;
    
    alert(message);
  }
  
  /**
   * Display COG layer on map
   * @param {string} cogUrl - COG URL
   */
  async displayCOGLayer(cogUrl) {
    if (!cogUrl) {
      console.warn('No COG URL provided');
      return;
    }
    
    try {
      const cogResponse = await fetch(cogUrl);
      if (!cogResponse.ok) {
        throw new Error(`COG fetch failed with status: ${cogResponse.status}`);
      }

      const arrayBuffer = await cogResponse.arrayBuffer();
      const georaster = await parseGeoraster(arrayBuffer);
      
      const resultLayer = new GeoRasterLayer({
        georaster: georaster,
        opacity: .8,
        resolution: 256,
        pixelValuesToColorFn: value => {
          if (value === null || value === undefined || value <= 0) return 'transparent';
          if (value < 0.1) return '#F0F921'; // bright yellow
          if (value < 0.2) return '#FDC328';
          if (value < 0.3) return '#F89441';
          if (value < 0.4) return '#E56B5D';
          if (value < 0.5) return '#CB4679';
          if (value < 0.6) return '#A82296';
          if (value < 0.7) return '#7D03A8';
          if (value < 0.8) return '#4B03A1';
          if (value < 0.9) return '#0D0887'; // darkest purple
          return '#0D0887';
        }
      });

      this.resultLayerGroup.clearLayers();
      resultLayer.addTo(this.resultLayerGroup);
      
      // Force the result layer to the top
      this.map.eachLayer(l => {
        if (l === this.resultLayerGroup) {
          l.eachLayer(resultL => resultL.bringToFront());
        }
      });

      // Check if the layer has valid bounds before fitting
      const bounds = resultLayer.getBounds();
      if (bounds && bounds.isValid()) {
        this.map.fitBounds(bounds);
      }
      
    } catch (error) {
      console.error('Error loading COG:', error);
      this.showErrorState(`Error loading layer: ${error.message}`);
    }
  }

  /**
   * Setup date limits
   */
  setupDateLimits() {
    const today = getTodayISO();
    document.getElementById('prefire-start-date').setAttribute('max', today);
    document.getElementById('prefire-end-date').setAttribute('max', today);
    document.getElementById('postfire-start-date').setAttribute('max', today);
    document.getElementById('postfire-end-date').setAttribute('max', today);
  }

  /**
   * Set up park unit dropdown
   */
  setupParkUnitDropdown() {
    const parkUnitSelect = document.getElementById('park-unit');
    
    // Clear existing options
    while (parkUnitSelect.firstChild) {
        parkUnitSelect.removeChild(parkUnitSelect.firstChild);
    }
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select a park unit --';
    parkUnitSelect.appendChild(defaultOption);
    
    // Add park unit options
    parkUnits.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit.id;
        option.textContent = unit.name;
        option.dataset.vegCogUrl = unit.veg_cog_url;
        option.dataset.vegGeopkgUrl = unit.veg_geopkg_url;
        parkUnitSelect.appendChild(option);
    });
  }

  /**
   * Set up fire severity metric dropdown
   */
  setupFireSeverityMetricDropdown() {
    const metricSelect = document.getElementById('fire-severity-metric-select');
    
    // Clear existing options
    while (metricSelect.firstChild) {
        metricSelect.removeChild(metricSelect.firstChild);
    }
    
    // Define available metrics
    const metrics = [
        { id: 'RBR', name: 'Relativized Burn Ratio (RBR)' },
        { id: 'dNBR', name: 'Differenced Normalized Burn Ratio (dNBR)' },
        { id: 'RdNBR', name: 'Relativized dNBR (RdNBR)' },
    ];
    
    // Add metric options
    metrics.forEach(metric => {
        const option = document.createElement('option');
        option.value = metric.id;
        option.textContent = metric.name;
        metricSelect.appendChild(option);
    });
  }

  /**
   * Setup test prefill for development purposes
   */
  setupTestPrefill() {
    // Check for test prefill parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('prefill_for_test') && urlParams.get('prefill_for_test') === 'geology') {
        // Prefill date fields with test values
        document.getElementById('prefire-start-date').value = '2023-06-01';
        document.getElementById('prefire-end-date').value = '2023-06-09';
        document.getElementById('postfire-start-date').value = '2023-06-17';
        document.getElementById('postfire-end-date').value = '2023-06-22';
        
        // Add test GeoJSON polygon to the map
        const testPolygon = {
        "type": "Polygon",
        "coordinates": [
            [
              [-116.09827589690582, 33.92992500511309],
              [-116.09827589690582, 33.88079387580245],
              [-116.01931781556678, 33.88079387580245],
              [-116.01931781556678, 33.92992500511309],
              [-116.09827589690582, 33.92992500511309]
            ]
        ]
        };
        
        // Clear existing layers first
        this.geoJsonLayerGroup.clearLayers();
        
        // Add the test polygon to the map with the defined style
        L.geoJSON({ type: "Feature", geometry: testPolygon }, { 
        style: getDefaultGeoJsonStyle()
        }).addTo(this.geoJsonLayerGroup);
        
        // Fit the map to the polygon bounds
        this.map.fitBounds(this.geoJsonLayerGroup.getBounds());
    }
  }

  /**
   * Load COG layer - Modified to ensure proper base layer is used
   */
  loadCOGLayer() {
    const state = this.presenter.model.getState();
    const parkUnit = state.parkUnit;
    
    if (!parkUnit || !parkUnit.veg_cog_url) {
      this.showErrorState('No vegetation data available for this park unit');
      return;
    }
    
    // First, ensure we switch to the street map as base layer
    this.switchToBaseLayer(this.streetMapLayer);
    
    // Then load the vegetation layer on top
    const vegMapUrl = parkUnit.veg_cog_url;
    
    loadVegetationCOGLayer(vegMapUrl, this.map, this.streetMapLayer)
      .then(layer => {
        this.cogLayer = layer;
      })
      .catch(error => {
        console.error("Error in loadCOGLayer:", error);
        this.showErrorState(`Failed to load vegetation map: ${error.message}`);
      });
  }

  /**
   * Switch to a base layer (removing other base layers)
   * @param {L.TileLayer} layer - The base layer to switch to
   */
  switchToBaseLayer(layer) {
    // Remove existing base layers
    if (this.map.hasLayer(this.streetMapLayer)) {
      this.map.removeLayer(this.streetMapLayer);
    }
    
    if (this.map.hasLayer(this.satelliteLayer)) {
      this.map.removeLayer(this.satelliteLayer);
    }
    
    // Add the new base layer
    this.map.addLayer(layer);
  }

  /**
   * Show date summary
   * @param {Object} formValues - Form values containing dates
   */
  showDateSummary(formValues) {
    document.getElementById('prefire-dates').textContent = 
        `Prefire Dates: ${formatDate(formValues.prefireStart)} - ${formatDate(formValues.prefireEnd)}`;
    document.getElementById('postfire-dates').textContent = 
        `Postfire Dates: ${formatDate(formValues.postfireStart)} - ${formatDate(formValues.postfireEnd)}`;
  }

  /**
   * Show refinement UI
   */
  showRefinementUI() {
    // Hide upload status (file name)
    const uploadStatus = document.getElementById('upload-status');
    if (uploadStatus) uploadStatus.style.display = 'none';
    
    // Hide the date range header
    const dateRangeHeaders = document.querySelectorAll('h3');
    dateRangeHeaders.forEach(header => {
      if (header.textContent === 'Set date range for fire:' || 
          header.textContent === 'Average Fire Severity:' ||
          header.textContent === 'Hectares of Cover Class Lost:') {
        header.style.display = 'none';
      }
    });

    // Hide the date section and upload button
    const dateSection = document.querySelector('.date-section');
    if (dateSection) dateSection.style.display = 'none';
    
    const uploadLabel = document.querySelector('label[for="upload-shapefile"]');
    if (uploadLabel) uploadLabel.style.display = 'none';
    
    // Show refinement options
    const refinementContainer = document.getElementById('refinement-container');
    if (refinementContainer) {
      refinementContainer.style.display = 'block';
      
      const refineButton = document.getElementById('refine-button');
      if (refineButton) refineButton.disabled = !this.hasDrawnRefinement;
    }
    
    // Show metrics tab instead of metrics-container
    const metricsTab = document.getElementById('metrics-tab');
    if (metricsTab) metricsTab.style.display = 'block';
    
    // Make the results panel visible since it contains the metrics tab
    const resultsPanel = document.querySelector('.results-panel');
    if (resultsPanel) resultsPanel.classList.remove('hidden');
    
    // Hide severity and biomass metrics initially
    const severityMetric = document.getElementById('fire-severity-metric');
    const biomassMetric = document.getElementById('biomass-lost-metric');
    if (severityMetric) severityMetric.style.display = 'none';
    if (biomassMetric) biomassMetric.style.display = 'none';
  }

  /**
   * Show metrics and vegetation table
   */
  showMetricsAndTable() {
    // Show metrics
    document.getElementById('fire-severity-metric').style.display = 'block';
    document.getElementById('biomass-lost-metric').style.display = 'block';
    
    // Show table only when in vegetation map view
    const vegMapButton = Array.from(document.querySelectorAll('.map-button'))
        .find(button => button.textContent.trim() === 'Vegetation Map');
    
    if (vegMapButton && vegMapButton.classList.contains('active')) {
        document.getElementById('table-container').style.display = 'block';
    }
    
    // Add a button for vegetation resolution if it doesn't exist
    const resolveButton = document.getElementById('resolve-button');
    if (!resolveButton) {
        const buttonGroup = document.querySelector('.button-group');
        
        const newResolveButton = document.createElement('button');
        newResolveButton.id = 'resolve-button';
        newResolveButton.className = 'action-button';
        newResolveButton.textContent = 'Analyze Vegetation Impact';
        newResolveButton.addEventListener('click', () => this.presenter.handleVegMapResolution());
        
        buttonGroup.appendChild(newResolveButton);
    }
  }

  /**
   * Update vegetation map table with data from CSV
   * @param {string} csvUrl - URL to CSV file with vegetation data
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
        const data = rows.slice(1).filter(row => row.length > 1).map(row => {
        const rowData = {};
        headers.forEach((header, index) => {
            rowData[header.trim()] = row[index]?.trim();
        });
        return rowData;
        });

        // Update table with CSV data
        const table = $('#example').DataTable();
        table.clear();

        data.forEach(row => {
        table.row.add([
            `<div style="width: 15px; height: 15px; background-color: ${row.color || '#000000'}"></div>`,
            row.veg_community || '',
            row.hectares || '',
            row.pct_full_park || '',
            row.pct_burn_area || '',
            row.burn_metric_mean || '',
            row.burn_metric_std || ''
        ]);
        });

        table.draw();
    } catch (error) {
        console.error('Error fetching or processing CSV:', error);
    }
  }

  /**
   * Reset the interface to initial state
   */
  resetInterface() {
    // Reset form inputs
    document.getElementById('date-form').reset();
    document.getElementById('date-form').style.display = 'block';
    
    // Reset file input and its label
    const fileInput = document.getElementById('upload-shapefile');
    const uploadButton = document.querySelector('label[for="upload-shapefile"]');
    
    // Remove old event listener by cloning and replacing the input
    const newFileInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newFileInput, fileInput);
    
    // Add new event listener to the new input
    this.setupShapefileUpload();
    
    // Reset upload button appearance
    uploadButton.textContent = 'Upload Shapefile';
    uploadButton.style.display = 'inline-block';
    
    // Clear status messages
    document.getElementById('upload-status').textContent = '';
    
    // Hide metrics and table
    document.getElementById('fire-severity-metric').style.display = 'none';
    document.getElementById('biomass-lost-metric').style.display = 'none';
    document.getElementById('table-container').style.display = 'none';
    
    // Reset to initial state
    document.querySelector('label[for="upload-shapefile"]').style.display = 'block';
    document.getElementById('refinement-container').style.display = 'none';
    
    // Clear map layers
    this.resultLayerGroup.clearLayers();
    this.geoJsonLayerGroup.clearLayers();
    
    // Clear date summary
    document.getElementById('prefire-dates').textContent = '';
    document.getElementById('postfire-dates').textContent = '';
    
    // Hide veg table
    document.body.classList.remove('veg-map-active');

    // Reset refinement state
    this.hasDrawnRefinement = false;
    document.getElementById('refinement-container').style.display = 'none';
    document.getElementById('refine-button').disabled = true;

    // Restore visibility of upload status
    document.getElementById('upload-status').style.display = 'block';
    
    // Restore visibility of headers
    const dateRangeHeaders = document.querySelectorAll('h3');
    dateRangeHeaders.forEach(header => {
        if (header.textContent === 'Set date range for fire:' || 
            header.textContent === 'Average Fire Severity:' ||
            header.textContent === 'Hectares of Cover Class Lost:') {
        header.style.display = 'block';
        }
    });
    
    // Remove the resolve button if it exists
    const resolveButton = document.getElementById('resolve-button');
    if (resolveButton) {
        resolveButton.remove();
    }
  }

  /**
   * Reset to refinement step
   * Prepares the interface for a new refinement attempt
   */
  resetToRefinementStep() {
    // Clear any existing polygon
    this.resultLayerGroup.clearLayers();
    this.geoJsonLayerGroup.clearLayers();
    
    // Reset refinement state
    this.hasDrawnRefinement = false;
    
    // Show refinement UI
    this.showRefinementUI();
    
    // Enable refine button when a new polygon is drawn
    document.getElementById('refine-button').disabled = true;
    document.getElementById('accept-button').disabled = false;
    
    // Hide metrics that would be shown after refinement
    document.getElementById('fire-severity-metric').style.display = 'none';
    document.getElementById('biomass-lost-metric').style.display = 'none';
    
    // Make sure the vegetation table is hidden
    document.getElementById('vegetation-table-container').style.display = 'none';
    
    // Remove vegetation resolution button if it exists
    const resolveButton = document.getElementById('resolve-button');
    if (resolveButton) {
      resolveButton.remove();
    }
  }

  /**
   * Switch to the specified base layer
   * @param {L.TileLayer} layer - The layer to switch to
   */
  switchToLayer(layer) {
    // Get the map manager instance
    const mapManager = MapManager.getInstance();
    
    // Use the MapManager method to switch layers while preserving important layers
    mapManager.switchToBaseLayer(layer, this.resultLayerGroup, this.geoJsonLayerGroup);
  }

  /**
   * Create color break controls in the export tab
   */
  createColorBreakControls() {
    // Get the sliders container
    const slidersContainer = document.querySelector('.color-sliders');
    if (!slidersContainer) return;
    
    // Clear any existing sliders
    slidersContainer.innerHTML = '';
    
    // Get current breaks and colors from state manager
    const { breaks, colors } = stateManager.getSharedState().colorBreaks;
    
    // Create a slider for each break point
    breaks.forEach((breakValue, index) => {
      const colorBelow = colors[index];
      const colorAbove = colors[index + 1] || colors[index];
      
      const sliderContainer = document.createElement('div');
      sliderContainer.className = 'color-break-slider';
      
      sliderContainer.innerHTML = `
        <div class="color-swatch" style="background-color: ${colorBelow}"></div>
        <input type="range" min="0" max="1" step="0.01" value="${breakValue}" data-index="${index}" class="break-slider">
        <input type="number" min="0" max="1" step="0.01" value="${breakValue}" class="break-value">
        <div class="color-swatch" style="background-color: ${colorAbove}"></div>
      `;
      
      slidersContainer.appendChild(sliderContainer);
      
      // Add event listeners for changes
      const rangeInput = sliderContainer.querySelector('.break-slider');
      const numberInput = sliderContainer.querySelector('.break-value');
      
      // Synchronize range and number inputs
      rangeInput.addEventListener('input', e => {
        const value = parseFloat(e.target.value);
        numberInput.value = value;
        this.updateColorBreak(index, value);
      });
      
      numberInput.addEventListener('change', e => {
        const value = parseFloat(e.target.value);
        rangeInput.value = value;
        this.updateColorBreak(index, value);
      });
    });
    
    // Add reset button event listener
    const resetButton = document.getElementById('reset-color-breaks');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        this.resetColorBreaks();
      });
    }
  }

  /**
   * Update a color break value
   * @param {number} index - Index of the break to update
   * @param {number} value - New break value
   */
  updateColorBreak(index, value) {
    // Get current breaks from state
    const { breaks, colors } = stateManager.getSharedState().colorBreaks;
    
    // Create a copy and update the specified break
    const newBreaks = [...breaks];
    newBreaks[index] = value;
    
    // Ensure breaks remain in ascending order
    newBreaks.sort((a, b) => a - b);
    
    // Update state with new breaks
    stateManager.updateColorBreaks(newBreaks, colors, 'fire-view');
    
    // Update UI to reflect sorted breaks
    this.updateColorBreakUI(newBreaks);
    
    // Refresh map visualization if COG layer is displayed
    this.refreshMapVisualization();
  }

  /**
   * Reset color breaks to default values
   */
  resetColorBreaks() {
    // Default values from the original implementation
    const defaultBreaks = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    const defaultColors = ['#F0F921', '#FDC328', '#F89441', '#E56B5D', '#CB4679', '#A82296', '#7D03A8', '#4B03A1', '#0D0887', '#0D0887'];
    
    // Update state with defaults
    stateManager.updateColorBreaks(defaultBreaks, defaultColors, 'fire-view');
    
    // Update UI
    this.updateColorBreakUI(defaultBreaks);
    
    // Refresh map visualization
    this.refreshMapVisualization();
  }

  /**
   * Update the UI to reflect current break values
   * @param {number[]} breaks - Current break values
   */
  updateColorBreakUI(breaks) {
    const sliders = document.querySelectorAll('.break-slider');
    const numberInputs = document.querySelectorAll('.break-value');
    
    breaks.forEach((value, index) => {
      if (sliders[index]) sliders[index].value = value;
      if (numberInputs[index]) numberInputs[index].value = value;
    });
  }

  /**
   * Refresh the map visualization with current settings
   */
  refreshMapVisualization() {
    const state = stateManager.getSharedState()
    const activeMetric = state.activeMetric.toLowerCase();

    const coarseUrl = state.assets.coarse.severityCogUrls[activeMetric];
    const refinedUrl = state.assets.refined.severityCogUrls[activeMetric];
    // Prioritize final assets over intermediate assets
    if (refinedUrl) {
      console.log("Displaying refined COG:", refinedUrl);
      this.displayCOGLayer(refinedUrl);
    } else if (coarseUrl) {
      console.log("Displaying coarse COG:", coarseUrl);
      this.displayCOGLayer(coarseUrl);
    } else {
      console.warn("No COG URL available in current state");
      // Clear any existing layers if no COG is available
      this.resultLayerGroup.clearLayers();
    }
  }
}