// Initialize the map
const map = L.map('map').setView([33.8734, -115.9010], 10);

// Define the tile layers
const streetMapLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
}).addTo(map);

const satelliteLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    // Normally requires an API key, ensure you have this set up if needed
});

// Create LayerGroups
const geoJsonLayerGroup = L.layerGroup().addTo(map);
let cogLayer;

// Add event listener to switch base layers
document.querySelectorAll('.map-button').forEach(button => {
    button.addEventListener('click', () => {
        // Manage button active states
        document.querySelectorAll('.map-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const layerName = button.textContent.trim();
        switchBaseLayer(layerName);
    });
});

function switchBaseLayer(layerName) {
    // Manage base layers only; keep geoJsonLayerGroup always on the map
    map.eachLayer(layer => {
        if (layer !== geoJsonLayerGroup && layer !== cogLayer) {
            map.removeLayer(layer);
        }
    });

    if (layerName === 'Street Map') {
        streetMapLayer.addTo(map);
        removeCOGLayer();

    } else if (layerName === 'Satellite Map') {
        satelliteLayer.addTo(map);
        removeCOGLayer();

    } else if (layerName === 'Vegetation Map') {
        streetMapLayer.addTo(map);
        loadCOGLayer(); // Load COG layer for vegetation
    }
}

function loadCOGLayer() {
    const url = '../COGs/JOTRcog_optimized5_Rank.tif';

    fetch(url)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => parseGeoraster(arrayBuffer))
        .then(georaster => {
            if (cogLayer) {
                map.removeLayer(cogLayer); // Remove previous instance if exists
            }

            cogLayer = new GeoRasterLayer({
                georaster: georaster,
                opacity: 0.5,
                pixelValuesToColorFn: function(value) {
                    // Proper color mapping based on value
                    if (value < 100) return '#ffeda0';
                    if (value <= 500) return '#feb24c';
                    if (value <= 1000) return '#fc4e2a';
                    if (value <= 1500) return '#e31a1c';
                    if (value > 1500) return '#b10026';
                    return "transparent";
                },
                resolution: 64
            }).addTo(map);

            map.fitBounds(cogLayer.getBounds());
        })
        .catch(error => {
            console.error("Error loading GeoRaster:", error);
        });
}

function removeCOGLayer() {
    if (cogLayer && map.hasLayer(cogLayer)) {
        map.removeLayer(cogLayer);
    }
}

// Upload and display the shapefile
document.getElementById('uploadShapefile').addEventListener('change', function(event) {
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
            console.log("Shapefile parsed successfully:", data);
            
            geoJsonLayerGroup.clearLayers(); // Optional: clear previous layers if needed
            L.geoJSON(data, { style: geoJsonStyle }).addTo(geoJsonLayerGroup);

            console.log("Shapefile added to map.");
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

function geoJsonStyle(feature) {
    return {
        color: '#900505',
        weight: 2,
        opacity: 1.0,
        fillColor: 'red',
        fillOpacity: 0.3
    };
}

// Form handling for date input
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
