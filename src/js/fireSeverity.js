import {vegMapCOG} from './constants.js';

// Initialize the map
const map = L.map('map').setView([33.8734, -115.9010], 10);

map.on(L.Draw.Event.CREATED, function (event) {
    // Clear any existing drawn layers
    geoJsonLayerGroup.clearLayers();
    
    // Add the new layer
    const layer = event.layer;
    geoJsonLayerGroup.addLayer(layer);
});

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

let cogLayer;

// Create a LayerGroup for GeoJSON data
const geoJsonLayerGroup = new L.FeatureGroup().addTo(map);
const resultLayerGroup = L.layerGroup().addTo(map);

function getGeometryFromMap() {
    let geometry = null;
    geoJsonLayerGroup.eachLayer((layer) => {
        if (layer instanceof L.Polygon) {
            geometry = layer.toGeoJSON().geometry;
        }
    });
    return geometry;
}

// clean up result layers
function cleanupResultLayers() {
    // Only clear layers in the resultLayerGroup
    resultLayerGroup.clearLayers();
}

// set limits to dates to not allow dates in future to be selected
document.addEventListener('DOMContentLoaded', (event) => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('prefire-start-date').setAttribute('max', today);
    document.getElementById('prefire-end-date').setAttribute('max', today);
    document.getElementById('postfire-start-date').setAttribute('max', today);
    document.getElementById('postfire-end-date').setAttribute('max', today);
    //add button event listener
    const testButton = document.getElementById('test-process-button');
    if (testButton) {
        testButton.addEventListener('click', sendTestProcessingRequest);
    }
});


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
    });
});

// Function to load the vegetation COG layer using georaster
function loadCOGLayer() {
    if (cogLayer && map.hasLayer(cogLayer)) {
        return;
    }

    fetch(vegMapCOG)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => parseGeoraster(arrayBuffer))
        .then(georaster => {
            console.log("georaster:", georaster);

            // Ensure the street map layer is active before adding the COG layer
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

// define the style for burn boundary
function geoJsonStyle(feature) {
    return {
        color: '#900505', // dark red
        weight: 3,
        opacity: 1.0,
        fillColor: 'transparent',
        // fillOpacity: 0.3
    };
}

// Handle shapefile upload using shp.js
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
            L.geoJSON(data, { style: geoJsonStyle }).addTo(geoJsonLayerGroup);

            uploadStatus.textContent = `${file.name} was uploaded successfully.`;
            uploadStatus.style.color = 'black';
        }).catch(function (error) {
            console.error("Error while parsing shapefile:", error);
            uploadStatus.textContent = "Upload failed. Please try again.";
            uploadStatus.style.color = 'red';
        });
    };
    reader.readAsArrayBuffer(file);
});


// Connect with backend for submitting shapfile, geometry, and dates with button click
async function sendTestProcessingRequest() {
    const testButton = document.getElementById('test-process-button');
    const statusIcon = document.getElementById('process-status');
    
    cleanupResultLayers();

    // Show spinner
    statusIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    statusIcon.style.color = '#007bff';
    testButton.disabled = true;
    
    // Get dates
    const prefireStart = document.getElementById('prefire-start-date').value;
    const prefireEnd = document.getElementById('prefire-end-date').value;
    const postfireStart = document.getElementById('postfire-start-date').value;
    const postfireEnd = document.getElementById('postfire-end-date').value;
    
    // Get geometry from map
    const drawnGeometry = getGeometryFromMap();

    // Validate inputs
    if (!drawnGeometry && geoJsonLayerGroup.getLayers().length === 0) {
        alert('Please either draw a polygon on the map or upload a shapefile');
        statusIcon.innerHTML = '<i class="fas fa-times"></i>';
        statusIcon.style.color = 'red';
        testButton.disabled = false;
        return;
    }

    if (!prefireStart || !prefireEnd || !postfireStart || !postfireEnd) {
        alert('Please fill in all date fields');
        statusIcon.innerHTML = '<i class="fas fa-times"></i>';
        statusIcon.style.color = 'red';
        testButton.disabled = false;
        return;
    }

    const testData = {
        geometry: drawnGeometry || geoJsonLayerGroup.toGeoJSON().features[0].geometry,
        prefire_date_range: [prefireStart, prefireEnd],
        posfire_date_range: [postfireStart, postfireEnd]
    };

    try {
        const response = await fetch('http://localhost:8000/process-test/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Processing started, job ID:', data.job_id);

        
        pollForResults(data.job_id);
    } catch (error) {
        console.error('Error starting test process:', error);
        statusIcon.innerHTML = '<i class="fas fa-times"></i>';
        statusIcon.style.color = 'red';
        testButton.disabled = false;
        alert(`Error: ${error.message}`);
    }
}

async function pollForResults(jobId) {
    console.log(`Polling for results of job: ${jobId}`);
    const statusIcon = document.getElementById('process-status');
    const testButton = document.getElementById('test-process-button');

    const pollInterval = setInterval(async () => {
        try {
            const response = await fetch(`http://localhost:8000/result-test/${jobId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Current status:', result);
            
            if (result.status === 'completed' || result.status === 'complete') {
                clearInterval(pollInterval);
                
                // Update status icon to show success
                statusIcon.innerHTML = '<i class="fas fa-check"></i>';
                statusIcon.style.color = 'green';
                
                // Hide the date form
                document.getElementById('date-form').style.display = 'none';
                
                // Update container state
                const container = document.querySelector('.upload-and-date-container');
                container.classList.add('processed-state');
                
                // Change upload button to Start Over
                const uploadButton = document.querySelector('label[for="uploadShapefile"]');
                uploadButton.textContent = 'Start Over';
                uploadButton.onclick = (e) => {
                    e.preventDefault();
                    resetInterface();
                };
                
                // Show and update metrics container
                const metricsContainer = document.getElementById('metrics-container');
                metricsContainer.style.display = 'block';
                
                // Add date summary
                const prefireStart = document.getElementById('prefire-start-date').value;
                const prefireEnd = document.getElementById('prefire-end-date').value;
                const postfireStart = document.getElementById('postfire-start-date').value;
                const postfireEnd = document.getElementById('postfire-end-date').value;
                
                document.getElementById('prefire-dates').textContent = 
                    `Prefire Dates: ${formatDate(prefireStart)} - ${formatDate(prefireEnd)}`;
                document.getElementById('postfire-dates').textContent = 
                    `Postfire Dates: ${formatDate(postfireStart)} - ${formatDate(postfireEnd)}`;
                
                // Update metrics if data exists
                if (result.data) {
                    const severityElement = document.getElementById('fire-severity-metric');
                    if (result.data.fire_severity_rank && result.data.fire_severity_value) {
                        severityElement.textContent = `${result.data.fire_severity_rank} (${result.data.fire_severity_value.toFixed(2)})`;
                    }
                    
                    const biomassElement = document.getElementById('biomass-lost-metric');
                    if (typeof result.data.biomass_lost === 'number') {
                        biomassElement.textContent = `${result.data.biomass_lost.toFixed(1)}%`;
                    }
                } else {
                    // Show placeholder if no data yet
                    document.getElementById('fire-severity-metric').textContent = 'Processing...';
                    document.getElementById('biomass-lost-metric').textContent = 'Processing...';
                }

                // handle loading COG
                if (result.cog_url) {
                    try {
                        const cogResponse = await fetch(result.cog_url);
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
                            opacity: 0.7,
                            resolution: 256,
                            pixelValuesToColorFn: value => {
                                if (value === null || value === undefined || value === 0) return 'transparent';
                                if (value < 0.2) return '#ffffb2';
                                if (value < 0.4) return '#fecc5c';
                                if (value < 0.6) return '#fd8d3c';
                                if (value < 0.8) return '#f03b20';
                                return '#bd0026';
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
                        console.error('Detailed error loading burn severity COG:', error);
                        alert(`Error loading burn severity layer: ${error.message}`);
                    }
                } else {
                    console.warn('No COG URL provided in the response');
                }
            } else if (result.status === 'failed') {
                clearInterval(pollInterval);
                statusIcon.innerHTML = '<i class="fas fa-times"></i>';
                statusIcon.style.color = 'red';
                testButton.disabled = false;
                console.error('Processing failed:', result.error);
                alert('Processing failed: ' + result.error);
            }
            
        } catch (error) {
            console.error('Error checking result status:', error);
            clearInterval(pollInterval);
            statusIcon.innerHTML = '<i class="fas fa-times"></i>';
            statusIcon.style.color = 'red';
            testButton.disabled = false; // Using the already defined variable
            alert('Error checking process status: ' + error.message);
        }
    }, 2000);
}


function resetInterface() {
    // Remove processed state
    const container = document.querySelector('.upload-and-date-container');
    container.classList.remove('processed-state');
    
    // Reset and show date form
    const dateForm = document.getElementById('date-form');
    dateForm.reset();
    dateForm.style.display = 'block';
    
    // Reset file input
    const fileInput = document.getElementById('uploadShapefile');
    fileInput.value = '';
    fileInput.style.display = 'none';
    document.getElementById('uploadStatus').textContent = '';
    
    // Reset upload button
    const uploadButton = document.querySelector('label[for="uploadShapefile"]');
    uploadButton.textContent = 'Upload Shapefile';
    uploadButton.style.display = 'inline-block';
    
    // Reset process button
    const testButton = document.getElementById('test-process-button');
    testButton.textContent = 'Get Burn Metrics';
    testButton.onclick = sendTestProcessingRequest;
    testButton.disabled = false;
    
    // Reset status icon
    const statusIcon = document.getElementById('process-status');
    statusIcon.innerHTML = '';
    
    // Hide metrics
    document.getElementById('metrics-container').style.display = 'none';
    
    // Clear map layers
    cleanupResultLayers();
    geoJsonLayerGroup.clearLayers();
    
    // Clear date summary
    document.getElementById('prefire-dates').textContent = '';
    document.getElementById('postfire-dates').textContent = '';
    
    // Hide veg table
    document.body.classList.remove('veg-map-active');
}

// Add this helper function for date formatting
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit'
    });
}