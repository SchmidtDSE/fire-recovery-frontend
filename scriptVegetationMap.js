// scriptVegetationMap.js
// TO DO: not actually loading the map! need to figure out why this isn't running when 
// vegetation map button selected.


// Function to load and configure the Vegetation Map layer
function loadVegetationLayer() {
    // Custom logic or tiles for vegetation layer
    const vegetationLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 20,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    // Add the Vegetation Layer to the map
    if (!map.hasLayer(vegetationLayer)) {
        vegetationLayer.addTo(map);
    }
 }
 
 // Export function for use in other scripts
 export { loadVegetationLayer };
 
