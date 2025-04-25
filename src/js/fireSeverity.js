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
    cleanupResultLayers(); // Only cleans up result layers
    map.eachLayer(l => {
        if (l !== layer && l !== geoJsonLayerGroup && (l === streetMapLayer || l === satelliteLayer || l === cogLayer)) {
            map.removeLayer(l);
        }
    });
    if (!map.hasLayer(layer)) {
        layer.addTo(map);
    }
}

document.querySelectorAll('.map-button').forEach(button => {
    button.addEventListener('click', () => {
        // Remove 'active' class from all buttons
        document.querySelectorAll('.map-button').forEach(btn => btn.classList.remove('active'));
        
        // Add 'active' class to the clicked button
        button.classList.add('active');
        
        // Switch map layers based on the button text
        const buttonText = button.textContent.trim();
        if (buttonText === 'Street Map') {
            switchToLayer(streetMapLayer);
        } else if (buttonText === 'Satellite Map') {
            switchToLayer(satelliteLayer);
        } else if (buttonText === 'Vegetation Map') {
            loadCOGLayer();
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

        // Handle URL response with better error checking
        if (data.url) {
            try {
                // Parse the COG directly using georaster
                fetch(data.url)
                    .then(response => response.arrayBuffer())
                    .then(arrayBuffer => parseGeoraster(arrayBuffer))
                    .then(georaster => {
                        const resultLayer = new GeoRasterLayer({
                            georaster: georaster,
                            opacity: 0.7,
                            resolution: 256
                        });
                        
                        resultLayer.addTo(resultLayerGroup);
                        map.fitBounds(resultLayer.getBounds());
                    })
                    .catch(error => {
                        console.error('Error loading COG:', error);
                        alert('Error loading result layer. Please try again.');
                    });
            } catch (error) {
                console.error('Error creating result layer:', error);
                alert('Error displaying results. Please try again.');
            }
        }
        
        pollForResults(data.job_id);
    } catch (error) {
        console.error('Error starting test process:', error);
        statusIcon.innerHTML = '<i class="fas fa-times"></i>';
        statusIcon.style.color = 'red';
        testButton.disabled = false;
        alert(`Error: ${error.message}`);
    }
}

// Function to poll for results
function pollForResults(jobId) {
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
        
        if (result.status === 'completed') {
            clearInterval(pollInterval);
            statusIcon.innerHTML = '<i class="fas fa-check"></i>';
            statusIcon.style.color = 'green';
            testButton.disabled = false;
        
            // Show the metrics container
            const metricsContainer = document.getElementById('metrics-container');
            metricsContainer.style.display = 'block';
        
            // Update metrics with the result data
            document.getElementById('fire-severity-metric').textContent = result.data.fire_severity;
            document.getElementById('biomass-lost-metric').textContent = result.data.biomass_lost;
        
          
          console.log('Processing completed successfully:', result.data);
        } else if (result.status === 'failed') {
          clearInterval(pollInterval);
          statusIcon.innerHTML = '<i class="fas fa-times"></i>'; // Error icon
          statusIcon.style.color = 'red'; // Red indicates failure
          testButton.disabled = false; // Enable the button
          console.error('Processing failed:', result.error);
        }
        // Continue polling if status is 'processing' or 'pending'
        
      } catch (error) {
        console.error('Error checking result status:', error);
        clearInterval(pollInterval);
        statusIcon.innerHTML = '<i class="fas fa-times"></i>'; // Error indication
        statusIcon.style.color = 'red'; // Red signifies an error
        testButton.disabled = false; // Re-enable the button
      }
    }, 2000);
}
  


