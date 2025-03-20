// script code to load map with georaster layer

// map initialization
var map = L.map('map').setView([33.8734, -115.9010], 10);

// open street map layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);




// load geotiff layer
fetch('../elevation_cog/Copernicus_DSM_COG_10_N33_00_W117_00_DEM.tif')

// fetch('../output_hh.tif')
.then(response => response.arrayBuffer())
.then(arrayBuffer => {
    parseGeoraster(arrayBuffer).then(georaster => {
    console.log("georaster:", georaster);

var layer = new GeoRasterLayer({
    georaster: georaster,
    opacity: .7,
    // adjust value and color scale for success, density, survivability?
    // pixelValuesToColorFn: values => values[0] === 42 ? '#ffffff' : '#000000',
    resolution: 64 // optional parameter for adjusting display resolution
});

layer.addTo(map);

map.fitBounds(layer.getBounds());

});
});