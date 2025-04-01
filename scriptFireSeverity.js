// script code to load map with georaster layer from a locally saved file

// Function to get CSS variable value
function getCSSVariableValue(variableName) {
    return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    }
    
  
    // map initialization
    const map = L.map('map').setView([33.8734, -115.9010], 10);
    
    // OpenStreetMap layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);
    

    
