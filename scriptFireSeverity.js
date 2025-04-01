// JavaScript file for handling fire severity map interactions including loading shapefile

// Map initialization
const map = L.map('map').setView([33.8734, -115.9010], 10);

// OpenStreetMap layer
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Handle shapefile upload using shp.js
document.getElementById('uploadShapefile').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const uploadStatus = document.getElementById('uploadStatus');

    if (!file || !file.name.endsWith('.zip')) {
        uploadStatus.textContent = 'File upload failed. Please upload a valid shapefile.';
        uploadStatus.style.color = 'red'; // Failure message color
        return;
    }

    // Prepare file reader for handling zip file input
    const reader = new FileReader();
    reader.onload = function(e) {
        shp(e.target.result).then(function(data) {
            L.geoJSON(data).addTo(map);  // Add the converted GeoJSON data to the map

            // Display upload complete message
            uploadStatus.textContent = `${file.name} was uploaded successfully.`;
            uploadStatus.style.color = 'black'; // Success message color
        }).catch(function(error) {
            console.error("Error while parsing shapefile:", error);
            uploadStatus.textContent = "Upload failed. Please try again.";
            uploadStatus.style.color = 'red'; // Error message color
        });
    };
    reader.readAsArrayBuffer(file);
});
