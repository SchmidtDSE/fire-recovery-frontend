import {vegMapCOG} from './constants.js';

// Initialize the map
const map = L.map('map').setView([33.8734, -115.9010], 10);

map.on(L.Draw.Event.CREATED, function (event) {
    // Clear any existing drawn layers
    geoJsonLayerGroup.clearLayers();
    
    // Add the new layer
    const layer = event.layer;
    geoJsonLayerGroup.addLayer(layer);
    hasDrawnRefinement = true;
    document.getElementById('refine-button').disabled = false;
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

let currentFireEventName = null;
let hasDrawnRefinement = false;
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

    // Format the dates as strings (which the backend expects)
    const fireSevData = {
        fire_event_name: "MN_Geo", // Generate unique fire event name
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
        const response = await fetch('http://localhost:8000/process/analyze_fire_severity', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors',
            body: JSON.stringify(fireSevData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            if (errorData.detail) {
                // Handle validation error
                const errorMessage = errorData.detail
                    .map(err => `${err.msg} (${err.loc.join('.')})`).join('\n');
                throw new Error(errorMessage);
            } else {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
        }

        const responseData = await response.json();
        console.log('Response data:', responseData);

        pollForResults(responseData.job_id, fireSevData.fire_event_name);
    } catch (error) {
        console.error('Error starting process:', error);
        statusIcon.innerHTML = '<i class="fas fa-times"></i>';
        statusIcon.style.color = 'red';
        testButton.disabled = false;
        alert(`Error: ${error.message}`);
    }
}

async function pollForResults(job_id, fireEventName) {
    console.log(`Polling for results of job: ${job_id}`);
    const statusIcon = document.getElementById('process-status');
    const testButton = document.getElementById('test-process-button');


    const pollInterval = setInterval(async () => {
        try {
            // Update to new endpoint structure
            const response = await fetch(
                `http://localhost:8000/result/analyze_fire_severity/${fireEventName}/${job_id}`, 
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    },
                    mode: 'cors'
                }
                
            );
            console.log("working!?", response);

            if (!response.ok) {
                const errorData = await response.json();
                if (errorData.detail) {
                    // Handle validation error
                    const errorMessage = errorData.detail
                        .map(err => `${err.msg} (${err.loc.join('.')})`).join('\n');
                    throw new Error(errorMessage);
                } else {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
            }
            
            const result = await response.json();
            console.log('Current status:', result);
            
            if (result.status === 'completed' || result.status === 'complete') {
                clearInterval(pollInterval);
                
                // Update status icon to show success
                statusIcon.innerHTML = '<i class="fas fa-check"></i>';
                statusIcon.style.color = 'green';
                
                currentFireEventName = fireEventName;
                
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
                            opacity: 1,
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
            testButton.disabled = false;
            alert('Error checking process status: ' + error.message);
        }
    }, 2000);
}

async function pollForRefinementResults(jobId, fireEventName) {
    console.log(`Polling for refinement results of job: ${jobId}`);
    const statusIcon = document.getElementById('process-status');
    const refineButton = document.getElementById('refine-button');

    const pollInterval = setInterval(async () => {
        try {
            const response = await fetch(
                `http://localhost:8000/result/refine/${fireEventName}/${jobId}`, 
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    },
                    mode: 'cors'
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                if (errorData.detail) {
                    throw new Error(errorData.detail
                        .map(err => `${err.msg} (${err.loc.join('.')})`).join('\n'));
                }
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Refinement status:', result);
            
            if (result.status === 'completed' || result.status === 'complete') {
                clearInterval(pollInterval);
                
                // Update status icon to show success
                statusIcon.innerHTML = '<i class="fas fa-check"></i>';
                statusIcon.style.color = 'green';
                
                // Clear previous COG layer
                resultLayerGroup.clearLayers();
                
                // Load new refined COG
                if (result.refined_geojson_url) {
                    try {
                        const cogResponse = await fetch(result.refined_geojson_url);
                        if (!cogResponse.ok) {
                            throw new Error(`Refined COG fetch failed with status: ${cogResponse.status}`);
                        }

                        const arrayBuffer = await cogResponse.arrayBuffer();
                        const georaster = await parseGeoraster(arrayBuffer);
                        
                        const refinedLayer = new GeoRasterLayer({
                            georaster: georaster,
                            opacity: 1,
                            resolution: 256,
                            pixelValuesToColorFn: value => {
                                if (value === null || value === undefined || value === 0) return 'transparent';
                                if (value < 0.1) return '#F0F921';
                                if (value < 0.2) return '#FDC328';
                                if (value < 0.3) return '#F89441';
                                if (value < 0.4) return '#E56B5D';
                                if (value < 0.5) return '#CB4679';
                                if (value < 0.6) return '#A82296';
                                if (value < 0.7) return '#7D03A8';
                                if (value < 0.8) return '#4B03A1';
                                if (value < 0.9) return '#0D0887';
                                return '#0D0887';
                            }
                        });

                        refinedLayer.addTo(resultLayerGroup);
                        
                        // Fit map to new bounds
                        const bounds = refinedLayer.getBounds();
                        if (bounds && bounds.isValid()) {
                            map.fitBounds(bounds);
                        }
                        // Show metrics after successful refinement
                        document.getElementById('fire-severity-metric').style.display = 'block';
                        document.getElementById('biomass-lost-metric').style.display = 'block';
                        
                        // Disable further refinement
                        document.getElementById('refine-button').disabled = true;
                        document.getElementById('accept-button').disabled = true;
                    } catch (error) {
                        console.error('Error loading refined COG:', error);
                        alert(`Error loading refined boundary: ${error.message}`);
                    }
                }

                // Reset refinement drawing state
                hasDrawnRefinement = false;
                refineButton.disabled = true;
                
            } else if (result.status === 'failed') {
                clearInterval(pollInterval);
                statusIcon.innerHTML = '<i class="fas fa-times"></i>';
                statusIcon.style.color = 'red';
                refineButton.disabled = false;
                alert('Refinement processing failed: ' + result.error);
            }
        } catch (error) {
            console.error('Error checking refinement status:', error);
            clearInterval(pollInterval);
            statusIcon.innerHTML = '<i class="fas fa-times"></i>';
            statusIcon.style.color = 'red';
            refineButton.disabled = false;
            alert('Error checking refinement status: ' + error.message);
        }
    }, 2000);
}


async function submitRefinement(refinedGeometry) {
    const refinementData = {
        fire_event_name: currentFireEventName,
        refine_geojson: {
            geometry: refinedGeometry
        }
    };

    try {
        const response = await fetch('http://localhost:8000/process/refine', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors',
            body: JSON.stringify(refinementData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            if (errorData.detail) {
                throw new Error(errorData.detail
                    .map(err => `${err.msg} (${err.loc.join('.')})`).join('\n'));
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        pollForRefinementResults(data.job_id, data.fire_event_name);
    } catch (error) {
        console.error('Error submitting refinement:', error);
        alert('Error submitting refinement: ' + error.message);
    }
}

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
    // Show metrics
    document.getElementById('fire-severity-metric').style.display = 'block';
    document.getElementById('biomass-lost-metric').style.display = 'block';
    
    // Disable refinement options
    document.getElementById('refine-button').disabled = true;
    document.getElementById('accept-button').disabled = true;
});


function resetInterface() {
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
    newFileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        const uploadStatus = document.getElementById('uploadStatus');

        if (!file || !file.name.endsWith('.zip')) {
            uploadStatus.textContent = 'File upload failed. Please upload a valid shapefile.';
            uploadStatus.style.color = 'red';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            shp(e.target.result).then(function(data) {
                geoJsonLayerGroup.clearLayers();
                L.geoJSON(data, { style: geoJsonStyle }).addTo(geoJsonLayerGroup);
                uploadStatus.textContent = `${file.name} was uploaded successfully.`;
                uploadStatus.style.color = 'black';
            }).catch(function(error) {
                console.error("Error while parsing shapefile:", error);
                uploadStatus.textContent = "Upload failed. Please try again.";
                uploadStatus.style.color = 'red';
            });
        };
        reader.readAsArrayBuffer(file);
    });
    
    // Reset upload button appearance
    uploadButton.textContent = 'Upload Shapefile';
    uploadButton.style.display = 'inline-block';
    uploadButton.onclick = null;
    
    // Clear status messages
    document.getElementById('uploadStatus').textContent = '';
    const statusIcon = document.getElementById('process-status');
    statusIcon.innerHTML = '';
    
    // Hide metrics
    document.getElementById('metrics-container').style.display = 'none';
    
    // Reset process button
    const testButton = document.getElementById('test-process-button');
    testButton.textContent = 'Get Burn Metrics';
    testButton.disabled = false;
    
    // Clear map layers
    cleanupResultLayers();
    geoJsonLayerGroup.clearLayers();
    
    // Clear date summary
    document.getElementById('prefire-dates').textContent = '';
    document.getElementById('postfire-dates').textContent = '';
    
    // Hide veg table
    document.body.classList.remove('veg-map-active');

    // Reset refinement state
    hasDrawnRefinement = false;
    currentFireEventName = null;
    document.getElementById('refinement-container').style.display = 'none';
    document.getElementById('refine-button').disabled = true;
    document.getElementById('accept-button').disabled = false;
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