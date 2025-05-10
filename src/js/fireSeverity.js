import {vegMapCOG, fireVegMatrixURL} from './constants.js';
import * as api from './utils/apiFacade.js';
import FireStore from './state.js';

// Initialize map
const map = L.map('map').setView([33.8734, -115.9010], 10);

// Define tile layers
const streetMapLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});

const satelliteLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: 'Imagery ©2023 Google'
});

// Add default layer (Street Map) to the map
streetMapLayer.addTo(map);

// Create a LayerGroup for GeoJSON data
const geoJsonLayerGroup = new L.FeatureGroup().addTo(map);
const resultLayerGroup = L.layerGroup().addTo(map);

let cogLayer;
let hasDrawnRefinement = false;

// Initialize the draw control
const drawControl = new L.Control.Draw({
    edit: {
        featureGroup: geoJsonLayerGroup
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

// Add the draw control to the map
map.addControl(drawControl);

// Setup draw event to track when a polygon is created
map.on(L.Draw.Event.CREATED, function (event) {
    // Clear any existing drawn layers
    geoJsonLayerGroup.clearLayers();
    
    // Add the new layer
    const layer = event.layer;
    geoJsonLayerGroup.addLayer(layer);
    hasDrawnRefinement = true;
    document.getElementById('refine-button').disabled = false;
});

// ===== Setup UI controls =====
document.addEventListener('DOMContentLoaded', () => {
    // Setup date limits
    setupDateLimits();
    
    // Setup park unit dropdown
    setupParkUnitDropdown();
    
    // Setup fire severity metric dropdown
    setupFireSeverityMetricDropdown();
    
    // Setup test prefill if query param exists
    setupTestPrefill();
    
    // Setup button event listeners
    setupButtonEventListeners();
    
    // Setup map layer buttons
    setupMapButtons();
    
    // Setup shapefile upload handler
    setupShapefileUpload();
    
    // Subscribe to state changes
    setupStateSubscriptions();
});

// ===== Helper Functions =====
function getGeometryFromMap() {
    let geometry = null;
    geoJsonLayerGroup.eachLayer((layer) => {
        if (layer instanceof L.Polygon) {
            geometry = layer.toGeoJSON().geometry;
        }
    });
    return geometry;
}

function cleanupResultLayers() {
    resultLayerGroup.clearLayers();
}

// Function to switch tile layers while preserving shapefiles
function switchToLayer(layer) {
    // Remove existing base layers but keep result layers
    map.eachLayer(l => {
        if (l !== resultLayerGroup && l !== geoJsonLayerGroup && 
            (l === streetMapLayer || l === satelliteLayer || l === cogLayer)) {
            map.removeLayer(l);
        }
    });

    // Add the new base layer
    layer.addTo(map);

    // Ensure result layers stay on top
    resultLayerGroup.eachLayer(l => {
        if (l instanceof L.Layer) {
            l.bringToFront();
        }
    });
}

// Load vegetation COG layer
function loadCOGLayer() {
    if (cogLayer && map.hasLayer(cogLayer)) {
        return;
    }

    // Get park unit from state
    const state = FireStore.getState();
    const parkUnit = state.parkUnit;
    
    // If we don't have a park unit selected, use the default vegMapCOG
    const vegMapUrl = parkUnit?.veg_cog_url || vegMapCOG;

    fetch(vegMapUrl)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => parseGeoraster(arrayBuffer))
        .then(georaster => {
            console.log("georaster:", georaster);

            if (!map.hasLayer(streetMapLayer)) {
                streetMapLayer.addTo(map);
            }

            cogLayer = new GeoRasterLayer({
                georaster: georaster,
                opacity: 0.5,
                resolution: 500
            });

            cogLayer.addTo(map);
            map.fitBounds(cogLayer.getBounds());
        })
        .catch(error => {
            console.error("Error loading GeoRaster:", error);
        });
}

// Define style for burn boundary
function geoJsonStyle(feature) {
    return {
        color: '#900505', // dark red
        weight: 3,
        opacity: 1.0,
        fillColor: 'transparent',
    };
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit'
    });
}

// ===== Setup Functions =====
function setupDateLimits() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('prefire-start-date').setAttribute('max', today);
    document.getElementById('prefire-end-date').setAttribute('max', today);
    document.getElementById('postfire-start-date').setAttribute('max', today);
    document.getElementById('postfire-end-date').setAttribute('max', today);
}

function setupParkUnitDropdown() {
    const parkUnitSelect = document.getElementById('park-unit');
    
    // Example park units - these should come from an API or configuration
    const parkUnits = [
        { 
            id: 'JOTR', 
            name: 'Joshua Tree National Park',
            veg_cog_url: 'https://storage.googleapis.com/national_park_service/mock_assets_frontend/JOTR/JOTRvegMap.tif',
            veg_geopkg_url: 'https://storage.googleapis.com/national_park_service/mock_assets_frontend/JOTR/JOTRvegMap.gpkg'
        },
        { 
            id: 'YOSE', 
            name: 'Yosemite National Park',
            veg_cog_url: 'https://storage.googleapis.com/national_park_service/mock_assets_frontend/YOSE/YOSEvegMap.tif',
            veg_geopkg_url: 'https://storage.googleapis.com/national_park_service/mock_assets_frontend/YOSE/YOSEvegMap.gpkg'
        },
    ];
    
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
    
    // Handle selection changes
    parkUnitSelect.addEventListener('change', (event) => {
        const selectedOption = event.target.options[event.target.selectedIndex];
        const parkData = {
            id: event.target.value,
            name: selectedOption.textContent,
            veg_cog_url: selectedOption.dataset.vegCogUrl,
            veg_geopkg_url: selectedOption.dataset.vegGeopkgUrl
        };
        
        FireStore.setParkUnit(parkData);
    });
}

function setupFireSeverityMetricDropdown() {
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
    
    // Set default value
    metricSelect.value = FireStore.getState().fireSeverityMetric;
    
    // Handle selection changes
    metricSelect.addEventListener('change', (event) => {
        FireStore.setFireSeverityMetric(event.target.value);
        updateMapVisualization();
    });
}

function updateMapVisualization() {
    // Get current results from state
    const state = FireStore.getState();
    const metric = state.fireSeverityMetric;
    
    // If we have a COG displayed, update it based on the selected metric
    const finalAssets = state.finalAssets;
    if (finalAssets && finalAssets.cogUrl) {
        // In a real implementation, we'd swap the URL based on the metric
        // For now, just log the change since we don't have multiple URLs
        console.log(`Changing visualization to use ${metric}`);
        
        // In a complete implementation:
        // 1. Determine the correct URL based on the metric
        // 2. Fetch and display the new COG
    }
}

function setupTestPrefill() {
    // Check for test prefill parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('prefill_for_test') && urlParams.get('prefill_for_test') === 'true') {
        // Prefill date fields with test values
        document.getElementById('prefire-start-date').value = '2022-06-01';
        document.getElementById('prefire-end-date').value = '2022-06-15';
        document.getElementById('postfire-start-date').value = '2022-07-15';
        document.getElementById('postfire-end-date').value = '2022-07-30';
        
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
        geoJsonLayerGroup.clearLayers();
        
        // Add the test polygon to the map with the defined style
        L.geoJSON({ type: "Feature", geometry: testPolygon }, { 
            style: geoJsonStyle 
        }).addTo(geoJsonLayerGroup);
        
        // Fit the map to the polygon bounds
        map.fitBounds(geoJsonLayerGroup.getBounds());
    }
}

function setupButtonEventListeners() {
    // Get fire severity button
    const processButton = document.getElementById('test-process-button');
    if (processButton) {
        processButton.addEventListener('click', sendProcessingRequest);
    }
    
    // Refinement buttons
    document.getElementById('refine-button').addEventListener('click', () => {
        if (!hasDrawnRefinement) {
            alert('Please draw a refined boundary on the map');
            return;
        }
        const refinedGeometry = getGeometryFromMap();
        if (refinedGeometry) {
            submitRefinement(refinedGeometry);
        }
    });

    document.getElementById('accept-button').addEventListener('click', () => {
        showMetricsAndTable();
        
        // Disable refinement options
        document.getElementById('refine-button').disabled = true;
        document.getElementById('accept-button').disabled = true;
    });
    
    document.getElementById('start-over-button').addEventListener('click', resetInterface);
}

function setupMapButtons() {
    document.querySelectorAll('.map-button').forEach(button => {
        button.addEventListener('click', () => {
            // Remove 'active' class from all buttons
            document.querySelectorAll('.map-button').forEach(btn => btn.classList.remove('active'));
            
            // Add 'active' class to the clicked button
            button.classList.add('active');
            
            // Get button text
            const buttonText = button.textContent.trim();
            
            // Toggle veg-map-active class on body
            if (buttonText === 'Vegetation Map') {
                document.body.classList.add('veg-map-active');
            } else {
                document.body.classList.remove('veg-map-active');
            }
            
            // Switch map layers
            if (buttonText === 'Vegetation Map') {
                loadCOGLayer();
            } else {
                switchToLayer(buttonText === 'Street Map' ? streetMapLayer : satelliteLayer);
            }
    
            // Show/hide table based on view
            if (buttonText === 'Vegetation Map') {
                if (document.getElementById('fire-severity-metric').style.display === 'block') {
                    document.getElementById('table-container').style.display = 'block';
                }
            } else {
                document.getElementById('table-container').style.display = 'none';
            }
        });
    });
}

function setupShapefileUpload() {
    document.getElementById('uploadShapefile').addEventListener('change', function (event) {
        const file = event.target.files[0];
        const uploadStatus = document.getElementById('uploadStatus');
    
        if (!file || !file.name.endsWith('.zip')) {
            uploadStatus.textContent = 'File upload failed. Please upload a valid shapefile.';
            uploadStatus.style.color = 'red';
            return;
        }
    
        const reader = new FileReader();
        reader.onload = function (e) {
            shp(e.target.result).then(function (data) {
                geoJsonLayerGroup.clearLayers();
                L.geoJSON(data, { style: geoJsonStyle }).addTo(geoJsonLayerGroup);
    
                uploadStatus.textContent = `${file.name} was uploaded successfully.`;
                uploadStatus.style.color = 'black';
                
                // If fire event name is set, upload the shapefile to the backend
                const fireEventName = FireStore.getState().fireEventName;
                if (fireEventName) {
                    api.uploadShapefile(fireEventName, file)
                        .then(response => {
                            console.log('Shapefile uploaded to server:', response);
                        })
                        .catch(error => {
                            console.error('Error uploading shapefile:', error);
                        });
                }
            }).catch(function (error) {
                console.error("Error while parsing shapefile:", error);
                uploadStatus.textContent = "Upload failed. Please try again.";
                uploadStatus.style.color = 'red';
            });
        };
        reader.readAsArrayBuffer(file);
    });
}

function setupStateSubscriptions() {
    // Subscribe to fire event name changes
    FireStore.on('fireEventNameChanged', (name) => {
        document.getElementById('fire-event-name').value = name || '';
    });
    
    // Subscribe to processing status changes
    FireStore.on('processingStatusChanged', (status) => {
        const statusIcon = document.getElementById('process-status');
        const processButton = document.getElementById('test-process-button');
        
        if (status === 'processing') {
            statusIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            statusIcon.style.color = '#007bff';
            processButton.disabled = true;
        } else if (status === 'success') {
            statusIcon.innerHTML = '<i class="fas fa-check"></i>';
            statusIcon.style.color = 'green';
        } else if (status === 'error') {
            statusIcon.innerHTML = '<i class="fas fa-times"></i>';
            statusIcon.style.color = 'red';
            processButton.disabled = false;
        }
    });
    
    // Subscribe to current step changes
    FireStore.on('currentStepChanged', (step) => {
        if (step === 'analyze') {
            document.getElementById('refinement-container').style.display = 'none';
        } else if (step === 'refine') {
            document.getElementById('refinement-container').style.display = 'block';
            document.getElementById('refine-button').disabled = !hasDrawnRefinement;
        } else if (step === 'resolve') {
            document.getElementById('refinement-container').style.display = 'none';
        }
    });
    
    // Subscribe to asset changes
    FireStore.on('assetsChanged', (data) => {
        if (data.type === 'intermediate') {
            handleIntermediateAssetsUpdate(data.assets);
        } else if (data.type === 'final') {
            handleFinalAssetsUpdate(data.assets);
        }
    });
    
    // Also set up fire event name input to update state
    document.getElementById('fire-event-name').addEventListener('input', (e) => {
        FireStore.setFireEventName(e.target.value);
    });
}

// ===== API Interaction and State Update Functions =====

async function sendProcessingRequest() {
    // Update processing status in store
    FireStore.setProcessingStatus('processing');
    
    // Clean up existing result layers
    cleanupResultLayers();
    
    // Get form inputs
    const prefireStart = document.getElementById('prefire-start-date').value;
    const prefireEnd = document.getElementById('prefire-end-date').value;
    const postfireStart = document.getElementById('postfire-start-date').value;
    const postfireEnd = document.getElementById('postfire-end-date').value;
    
    // Get geometry from map
    const drawnGeometry = getGeometryFromMap();

    // Validate inputs
    if (!drawnGeometry && geoJsonLayerGroup.getLayers().length === 0) {
        alert('Please either draw a polygon on the map or upload a shapefile');
        FireStore.setProcessingStatus('error');
        return;
    }

    if (!prefireStart || !prefireEnd || !postfireStart || !postfireEnd) {
        alert('Please fill in all date fields');
        FireStore.setProcessingStatus('error');
        return;
    }

    // Get fire event name from input or use placeholder if empty
    const fireEventNameInput = document.getElementById('fire-event-name').value;
    const fireEventName = fireEventNameInput || `Fire_${new Date().getTime()}`;
    
    // Update fire event name in store if it was provided
    if (fireEventNameInput) {
        FireStore.setFireEventName(fireEventNameInput);
    }

    // Format data for API request
    const fireSevData = {
        fire_event_name: fireEventName,
        geometry: {
            geometry: drawnGeometry || geoJsonLayerGroup.toGeoJSON().features[0].geometry
        },
        prefire_date_range: [
            prefireStart.toString(),
            prefireEnd.toString()
        ],
        postfire_date_range: [
            postfireStart.toString(),
            postfireEnd.toString()
        ]
    };

    try {
        // Use API facade instead of direct fetch
        const response = await api.analyzeFire(fireSevData);
        console.log('Response data:', response);

        // Start polling for results
        try {
            const result = await api.pollUntilComplete(() => 
                api.getFireAnalysisStatus(response.fire_event_name, response.job_id)
            );
            
            // Handle successful result
            FireStore.setProcessingStatus('success')
                .setCurrentStep('refine');

            // Store fire event name and intermediate assets
            FireStore.setFireEventName(result.fire_event_name)
                .setIntermediateAssets({
                    cogUrl: result.cog_url,
                    geojsonUrl: result.geojson_url
                });

            // Update UI to show results
            handleAnalysisComplete(result);
        } catch (error) {
            console.error('Error polling for results:', error);
            FireStore.setProcessingStatus('error');
            alert(`Error checking process status: ${error.message}`);
        }
    } catch (error) {
        console.error('Error starting process:', error);
        FireStore.setProcessingStatus('error');
        alert(`Error: ${error.message}`);
    }
}

function handleAnalysisComplete(result) {
    // Hide upload status (file name)
    document.getElementById('uploadStatus').style.display = 'none';
    
    // Hide the date range header
    const dateRangeHeaders = document.querySelectorAll('h3');
    dateRangeHeaders.forEach(header => {
        if (header.textContent === 'Set date range for fire:' || 
            header.textContent === 'Average Fire Severity:' ||
            header.textContent === 'Hectares of Cover Class Lost:') {
            header.style.display = 'none';
        }
    });

    // Hide the date form and upload button
    document.getElementById('date-form').style.display = 'none';
    document.querySelector('label[for="uploadShapefile"]').style.display = 'none';
    
    // Show refinement options
    document.getElementById('refinement-container').style.display = 'block';
    document.getElementById('refine-button').disabled = !hasDrawnRefinement;
    
    // Show metrics container but only show date summary
    const metricsContainer = document.getElementById('metrics-container');
    metricsContainer.style.display = 'block';
    
    // Hide severity and biomass metrics initially
    document.getElementById('fire-severity-metric').style.display = 'none';
    document.getElementById('biomass-lost-metric').style.display = 'none';
    
    // Add date summary
    const prefireStart = document.getElementById('prefire-start-date').value;
    const prefireEnd = document.getElementById('prefire-end-date').value;
    const postfireStart = document.getElementById('postfire-start-date').value;
    const postfireEnd = document.getElementById('postfire-end-date').value;
    
    document.getElementById('prefire-dates').textContent = 
        `Prefire Dates: ${formatDate(prefireStart)} - ${formatDate(prefireEnd)}`;
    document.getElementById('postfire-dates').textContent = 
        `Postfire Dates: ${formatDate(postfireStart)} - ${formatDate(postfireEnd)}`;
    
    // Store metrics data for later use
    if (result.data) {
        if (result.data.fire_severity_rank && result.data.fire_severity_value) {
            document.getElementById('fire-severity-metric').textContent = 
                `${result.data.fire_severity_rank} (${result.data.fire_severity_value.toFixed(2)})`;
        }
        if (typeof result.data.biomass_lost === 'number') {
            document.getElementById('biomass-lost-metric').textContent = 
                `${result.data.biomass_lost.toFixed(1)}%`;
        }
    }

    // Display the COG layer
    displayCOGLayer(result.cog_url);
}

async function displayCOGLayer(cogUrl) {
    if (!cogUrl) {
        console.warn('No COG URL provided');
        return;
    }
    
    try {
        const cogResponse = await fetch(cogUrl);
        if (!cogResponse.ok) {
            throw new Error(`COG fetch failed with status: ${cogResponse.status}`);
        }

        console.log('COG fetch successful, parsing data...');
        const arrayBuffer = await cogResponse.arrayBuffer();
        console.log('Array buffer received, size:', arrayBuffer.byteLength);
        
        const georaster = await parseGeoraster(arrayBuffer);
        console.log('Georaster parsed:', georaster);
        
        const resultLayer = new GeoRasterLayer({
            georaster: georaster,
            opacity: .8,
            resolution: 256,
            pixelValuesToColorFn: value => {
                if (value === null || value === undefined || value === 0) return 'transparent';
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

        resultLayerGroup.clearLayers();
        resultLayer.addTo(resultLayerGroup);
        
        // Force the result layer to the top
        map.eachLayer(l => {
            if (l === resultLayerGroup) {
                l.eachLayer(resultL => resultL.bringToFront());
            }
        });

        // Check if the layer has valid bounds before fitting
        const bounds = resultLayer.getBounds();
        if (bounds && bounds.isValid()) {
            console.log('Fitting map to bounds:', bounds);
            map.fitBounds(bounds);
        } else {
            console.warn('Layer bounds not valid');
        }
        
    } catch (error) {
        console.error('Detailed error loading COG:', error);
        alert(`Error loading layer: ${error.message}`);
    }
}

function handleIntermediateAssetsUpdate(assets) {
    // Handle intermediate assets update
    if (assets?.cogUrl) {
        displayCOGLayer(assets.cogUrl);
    }
}

function handleFinalAssetsUpdate(assets) {
    // Handle final assets update
    if (assets?.cogUrl) {
        displayCOGLayer(assets.cogUrl);
        
        // After final refinement, show metrics and allow veg map resolution
        showMetricsAndTable();
    }
}

async function submitRefinement(refinedGeometry) {
    // Update processing status
    FireStore.setProcessingStatus('processing');
    
    const state = FireStore.getState();
    const fireEventName = state.fireEventName;
    
    if (!fireEventName) {
        alert('No fire event name set. Please enter a name for this fire event.');
        FireStore.setProcessingStatus('error');
        return;
    }
    
    const refinementData = {
        fire_event_name: fireEventName,
        refine_geojson: {
            geometry: refinedGeometry
        }
    };

    try {
        const response = await api.submitRefinement(refinementData);
        console.log('Refinement response:', response);
        
        // Poll for refinement results
        try {
            const result = await api.pollUntilComplete(() => 
                api.getRefinementStatus(response.fire_event_name, response.job_id)
            );
            
            // Update processing status and store refined assets
            FireStore.setProcessingStatus('success')
                .setFinalAssets({
                    cogUrl: result.cog_url,
                    geojsonUrl: result.refined_geojson_url
                });
                
            // Disable further refinement
            document.getElementById('refine-button').disabled = true;
            document.getElementById('accept-button').disabled = true;
            
            // Reset refinement drawing state
            hasDrawnRefinement = false;
            
            // Show metrics and table
            showMetricsAndTable();
        } catch (error) {
            console.error('Error polling for refinement results:', error);
            FireStore.setProcessingStatus('error');
            alert(`Error checking refinement status: ${error.message}`);
        }
    } catch (error) {
        console.error('Error submitting refinement:', error);
        FireStore.setProcessingStatus('error');
        alert('Error submitting refinement: ' + error.message);
    }
}

async function resolveAgainstVegMap() {
    const state = FireStore.getState();
    const fireEventName = state.fireEventName;
    const parkUnit = state.parkUnit;
    const finalAssets = state.finalAssets;
    
    if (!fireEventName || !finalAssets?.cogUrl) {
        alert('Fire event name or final COG URL not available');
        return;
    }
    
    // Get correct vegetation map URL based on park unit or use default
    const vegMapUrl = parkUnit?.veg_cog_url || vegMapCOG;
    
    FireStore.setProcessingStatus('processing')
        .setCurrentStep('resolve');
    
    const resolveData = {
        fire_event_name: fireEventName,
        veg_cog_url: vegMapUrl,
        fire_cog_url: finalAssets.cogUrl
    };
    
    try {
        const response = await api.resolveAgainstVegMap(resolveData);
        console.log('Resolve response:', response);
        
        // Poll for vegetation map results
        try {
            const result = await api.pollUntilComplete(() => 
                api.getVegMapResult(response.fire_event_name, response.job_id)
            );
            
            // Update processing status and show results
            FireStore.setProcessingStatus('success');
            
            // Update table with CSV data from result
            await updateVegMapTable(result.fire_veg_matrix);
            
            // Show table
            document.getElementById('table-container').style.display = 'block';
            
            // Switch to vegetation map view to show results
            const vegMapButton = Array.from(document.querySelectorAll('.map-button'))
                .find(button => button.textContent.trim() === 'Vegetation Map');
            
            if (vegMapButton) {
                vegMapButton.click();
            }
        } catch (error) {
            console.error('Error polling for vegetation map results:', error);
            FireStore.setProcessingStatus('error');
            alert(`Error checking vegetation map status: ${error.message}`);
        }
    } catch (error) {
        console.error('Error resolving against veg map:', error);
        FireStore.setProcessingStatus('error');
        alert('Error resolving against vegetation map: ' + error.message);
    }
}

async function updateVegMapTable(csvUrl) {
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

function showMetricsAndTable() {
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
        newResolveButton.addEventListener('click', resolveAgainstVegMap);
        
        buttonGroup.appendChild(newResolveButton);
    }
}

function resetInterface() {
    // Set processing status to idle
    FireStore.setProcessingStatus('idle')
        .setCurrentStep('upload')
        .resetState();
    
    // Remove processed state
    const container = document.querySelector('.upload-and-date-container');
    container.classList.remove('processed-state');
    
    // Reset form inputs
    document.getElementById('date-form').reset();
    document.getElementById('date-form').style.display = 'block';
    
    // Reset file input and its label
    const fileInput = document.getElementById('uploadShapefile');
    const uploadButton = document.querySelector('label[for="uploadShapefile"]');
    
    // Remove old event listener by cloning and replacing the input
    const newFileInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newFileInput, fileInput);
    
    // Add new event listener to the new input
    setupShapefileUpload();
    
    // Reset upload button appearance
    uploadButton.textContent = 'Upload Shapefile';
    uploadButton.style.display = 'inline-block';
    uploadButton.onclick = null;
    
    // Clear status messages
    document.getElementById('uploadStatus').textContent = '';
    const statusIcon = document.getElementById('process-status');
    statusIcon.innerHTML = '';
    
    // Hide metrics and table
    document.getElementById('fire-severity-metric').style.display = 'none';
    document.getElementById('biomass-lost-metric').style.display = 'none';
    document.getElementById('table-container').style.display = 'none';
    
    // Reset to initial state
    document.querySelector('label[for="uploadShapefile"]').style.display = 'block';
    document.getElementById('refinement-container').style.display = 'none';
    
    // Clear map layers
    resultLayerGroup.clearLayers();
    geoJsonLayerGroup.clearLayers();
    
    // Clear date summary
    document.getElementById('prefire-dates').textContent = '';
    document.getElementById('postfire-dates').textContent = '';
    
    // Hide veg table
    document.body.classList.remove('veg-map-active');

    // Reset refinement state
    hasDrawnRefinement = false;
    document.getElementById('refinement-container').style.display = 'none';
    document.getElementById('refine-button').disabled = true;

    // Restore visibility of upload status
    document.getElementById('uploadStatus').style.display = 'block';
    
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