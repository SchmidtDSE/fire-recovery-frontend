
// front end dates: don't allow future dates
// loading bar (or similar), send request query to get "pending" or "complete", grab url and put on map
// error messaging on backend 


import { vegMapCOG } from './constants.js';

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

// Initialize the draw control
const drawControl = new L.Control.Draw({
    edit: {
       Group: geoJsonLayerGroup
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
    
    // Store the GeoJSON data for later use
    window.drawnGeoJson = drawnGeoJson;
});

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

            // Store the shapefile data for later use
            window.shapefileData = data;

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

// Form submission to send a POST request with the fire dates and either GeoJSON or shapefile data
document.getElementById('date-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const ignitionDate = document.getElementById('ignition-date').value;
    const suppressionDate = document.getElementById('suppression-date').value;

    const data = {
        dateOfIgnition: ignitionDate,
        dateOfSuppression: suppressionDate
    };

    if (window.drawnGeoJson) {
        data.geoJson = window.drawnGeoJson;
    } else if (window.shapefileData) {
        data.shapefile = window.shapefileData;
    } else {
        alert("Please upload a shapefile or draw on the map.");
        return;
    }

    // set const for the endpoint, testing with http://localhost:8000/process-test/
    
    try {
        const response = await fetch('http://your-fastapi-url/endpoint', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Success:', result);
    } catch (error) {
        console.error('Error sending request:', error);
    }
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

// Define the style for burn boundary
function geoJsonStyle(feature) {
    return {
        color: '#900505', // dark red
        weight: 3,
        opacity: 1.0,
        // fillColor: 'transparent',
        fillColor: 'red',
        // fillOpacity: 0.3
    };
}
