import {vegMapCOG} from './constants.js';

// Initialize the map
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

let cogLayer;

// Create a LayerGroup for GeoJSON data
const geoJsonLayerGroup = new L.FeatureGroup().addTo(map);

// set limits to dates to not allow dates in future to be selected
document.addEventListener('DOMContentLoaded', (event) => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('prefire-start-date').setAttribute('max', today);
    document.getElementById('prefire-end-date').setAttribute('max', today);
    document.getElementById('postfire-start-date').setAttribute('max', today);
    document.getElementById('postfire-end-date').setAttribute('max', today);
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

// Event listener for draw created event
map.on(L.Draw.Event.CREATED, function (event) {
    const layer = event.layer;
    geoJsonLayerGroup.addLayer(layer);

    // Convert drawn layer to GeoJSON
    const drawnGeoJson = layer.toGeoJSON();
    
    // Send the GeoJSON to the backend
    fetch('http://your-fastapi-url/geojson-endpoint', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(drawnGeoJson)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        return response.json();
    })
    .then(data => {
        console.log('Polygon data successfully sent:', data);
    })
    .catch(error => {
        console.error('Error during sending polygon data:', error);
    });
});


// Function to switch tile layers while preserving shapefiles
function switchToLayer(layer) {
    map.eachLayer(l => {
        if (l !== layer && (l === streetMapLayer || l === satelliteLayer || l === cogLayer)) {
            map.removeLayer(l); // Remove specific base layers
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

// Function to load the COG layer using georaster
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


// Function to send test processing request
async function sendTestProcessingRequest() {
    const testButton = document.getElementById('test-process-button');
    const statusIcon = document.getElementById('process-status');
    
    // Show spinner
    statusIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    statusIcon.style.color = '#007bff';
    testButton.disabled = true;
    
    // Sample test data as specified in the documentation
    const testData = {
      "geometry": {
        "type": "Polygon", 
        "coordinates": [[[-120.0, 38.0], [-120.0, 39.0], [-119.0, 39.0], [-119.0, 38.0], [-120.0, 38.0]]]
      }, 
      "prefire_date_range": ["2023-01-01", "2023-06-30"], 
      "posfire_date_range": ["2023-07-01", "2023-12-31"]
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
      
      // Start polling for results
      pollForResults(data.job_id);
    } catch (error) {
      console.error('Error starting test process:', error);
      statusIcon.innerHTML = '<i class="fas fa-times"></i>';
      statusIcon.style.color = 'red';
      testButton.disabled = false;
    }
  }
  
  // Function to poll for results
  function pollForResults(jobId) {
    console.log(`Polling for results of job: ${jobId}`);
    const statusIcon = document.getElementById('process-status');
    const testButton = document.getElementById('test-process-button');
    
    // Check status every 2 seconds
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8000/result-test/${jobId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Current status:', result);
        
        // Check if processing is complete
        if (result.status === 'completed') {
          clearInterval(pollInterval);
          statusIcon.innerHTML = '<i class="fas fa-check"></i>';
          statusIcon.style.color = 'green';
          testButton.disabled = false;
          
          // Handle the result data if needed
          console.log('Processing completed successfully:', result.data);
        } else if (result.status === 'failed') {
          clearInterval(pollInterval);
          statusIcon.innerHTML = '<i class="fas fa-times"></i>';
          statusIcon.style.color = 'red';
          testButton.disabled = false;
          console.error('Processing failed:', result.error);
        }
        // If status is 'processing' or 'pending', continue polling
        
      } catch (error) {
        console.error('Error checking result status:', error);
        clearInterval(pollInterval);
        statusIcon.innerHTML = '<i class="fas fa-times"></i>';
        statusIcon.style.color = 'red';
        testButton.disabled = false;
      }
    }, 2000);
  }
  
  // Add event listener when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Ensure the test button exists
    const testButton = document.getElementById('test-process-button');
    if (testButton) {
      testButton.addEventListener('click', sendTestProcessingRequest);
    }
  });
  