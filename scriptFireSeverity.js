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

// Create a LayerGroup for GeoJSON data
const geoJsonLayerGroup = L.layerGroup().addTo(map);

let cogLayer;

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
        return; // If already loaded, do nothing
    }

    const url = '../COGs/JOTRcog_optimized5_Rank.tif'; // Update this path as necessary

    fetch(url)
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
                pixelValuesToColorFn: function (value) {
                    if (value < 10) {
                        return '#ffeda0';
                    } else if (value > 10 && value < 20) {
                        return '#feb24c';
                    } else if (value > 20 && value < 30) {
                        return '#fc4e2a';
                    } else if (value > 30 && value < 40) {
                        return '#e31a1c';
                    } else if (value > 50) {
                        return '#b10026';
                    } else {
                        return "transparent";
                    }
                },
                resolution: 64
            });

            cogLayer.addTo(map);
            map.fitBounds(cogLayer.getBounds());
        })
        .catch(error => {
            console.error("Error loading GeoRaster:", error);
        });
}

// Function to define the style for the GeoJSON layer (unchanged)
function geoJsonStyle(feature) {
    return {
        color: '#900505',
        weight: 2,
        opacity: 1.0,
        fillColor: 'red',
        fillOpacity: 0.3
    };
}

// Handle shapefile upload using shp.js (unchanged)
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

// Form submission to send a POST request with the fire dates as JSON
document.getElementById('date-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const ignitionDate = document.getElementById('ignition-date').value;
    const suppressionDate = document.getElementById('suppression-date').value;

    const data = {
        dateOfIgnition: ignitionDate,
        dateOfSuppression: suppressionDate
    };

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
