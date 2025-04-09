// JavaScript file for handling fire severity map interactions including loading shapefile

// Initialize the map
const map = L.map('map').setView([33.8734, -115.9010], 10);

// Define tile layers
const streetMapLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});

const satelliteLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: 'Imagery ©2023 Google'
});

// Placeholder for Vegetation Map layer (will use street map for visibility)
const vegetationLayer = streetMapLayer; // Set vegetationLayer to streetMapLayer 

// Add default layer (Street Map) to the map
streetMapLayer.addTo(map);

// Create a LayerGroup for GeoJSON data
const geoJsonLayerGroup = L.layerGroup().addTo(map);

// Function to switch tile layers while preserving shapefiles
function switchToLayer(layer) {
    map.eachLayer(l => {
        if (l !== layer && (l === streetMapLayer || l === satelliteLayer)) {
            map.removeLayer(l); // Remove only base layers, leaving GeoJSON layers unaffected
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
        
        // Remaining logic for switching map layers...
        const buttonText = button.textContent.trim();
        if (buttonText === 'Street Map') {
            switchToLayer(streetMapLayer);
        } else if (buttonText === 'Satellite Map') {
            switchToLayer(satelliteLayer);
        } else if (buttonText === 'Vegetation Map') {
            switchToLayer(vegetationLayer);
        }
    });
});

// Function to define the style for the GeoJSON layer
function geoJsonStyle(feature) {
    return {
        color: '#900505',    // Set the outline color to red
        weight: 2,           // Line weight/thickness
        opacity: 1.0,        // Line opacity
        fillColor: 'red',    // Fill color inside the shape
        fillOpacity: 0.3     // Opacity of the fill color
    };
}

// Handle shapefile upload using shp.js
document.getElementById('uploadShapefile').addEventListener('change', function (event) {
    const file = event.target.files[0];
    const uploadStatus = document.getElementById('uploadStatus');

    if (!file || !file.name.endsWith('.zip')) {
        uploadStatus.textContent = 'File upload failed. Please upload a valid shapefile.';
        uploadStatus.style.color = 'red'; // Failure message color
        return;
    }

    // Read and parse the shapefile
    const reader = new FileReader();
    reader.onload = function (e) {
        shp(e.target.result).then(function (data) {
            // Add GeoJSON with the defined style
            L.geoJSON(data, { style: geoJsonStyle }).addTo(geoJsonLayerGroup);

            // Display upload complete message
            uploadStatus.textContent = `${file.name} was uploaded successfully.`;
            uploadStatus.style.color = 'black'; // Success message color
        }).catch(function (error) {
            console.error("Error while parsing shapefile:", error);
            uploadStatus.textContent = "Upload failed. Please try again.";
            uploadStatus.style.color = 'red'; // Error message color
        });
    };
    reader.readAsArrayBuffer(file);
});
