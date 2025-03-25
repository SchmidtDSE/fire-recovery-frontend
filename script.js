// script code to load map with georaster layer from a URL

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

// set colors
const primary = getCSSVariableValue('--primary-color');
const secondary = getCSSVariableValue('--secondary-color');
const tertiary = getCSSVariableValue('--tertiary-color');
const quaternary = getCSSVariableValue('--quaternary-color');
const quinary = getCSSVariableValue('--quinary-color');


// import georaster from 'georaster';

async function loadAndDisplayGeoTIFF(url) {
    try {
        // Fetch the GeoTIFF file as binary data
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        //Parse the array buffer into a georaster object
        const georasterData = await parseGeoraster(arrayBuffer); // Use the globally available function

        const layer = new GeoRasterLayer({
            georaster: georasterData,
            opacity: 0.7,
            pixelValuesToColorFn: function (value) {
                if (value < 100) {
                    return primary;
                } else if (value > 100 && value < 500) {
                    return secondary;
                } else if (value > 500 && value < 1000) {
                    return tertiary;
                } else if (value > 1000 && value < 1500) {
                    return quaternary;
                } else if (value > 1500) {
                    return quinary;
                } else {
                    return "transparent";
                }
            },
            resolution: 256 // Optional: adjust resolution
      });
  
      // Add the GeoRasterLayer to the map
      layer.addTo(map);
    } catch (error) {
        console.error("Error loading or displaying the GeoTIFF:", error);
    }
}

// Call the function with your COG URL
const url = 'https://elevationeuwest.blob.core.windows.net/copernicus-dem/COP30_hh/Copernicus_DSM_COG_10_N33_00_W117_00_DEM.tif?st=2025-03-24T20%3A58%3A16Z&se=2025-03-25T21%3A43%3A16Z&sp=rl&sv=2024-05-04&sr=c&skoid=9c8ff44a-6a2c-4dfb-b298-1c9212f64d9a&sktid=72f988bf-86f1-41af-91ab-2d7cd011db47&skt=2025-03-25T20%3A58%3A15Z&ske=2025-04-01T20%3A58%3A15Z&sks=b&skv=2024-05-04&sig=jZniKhAGYiI4iBxx1vBkaSJWHwsir4trruamsZkbz%2Bc%3D';
loadAndDisplayGeoTIFF(url);
