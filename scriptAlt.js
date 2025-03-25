// Alt version for loading COG using geotiff.js



// ***************DOES NOT CURRENTLY WORK! JUST EXPERIMENTING.***************


// import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const url = 'https://elevationeuwest.blob.core.windows.net/copernicus-dem/COP30_hh/Copernicus_DSM_COG_10_N33_00_W117_00_DEM.tif?st=2025-03-20T20%3A05%3A29Z&se=2025-03-21T20%3A50%3A29Z&sp=rl&sv=2024-05-04&sr=c&skoid=9c8ff44a-6a2c-4dfb-b298-1c9212f64d9a&sktid=72f988bf-86f1-41af-91ab-2d7cd011db47&skt=2025-03-21T20%3A03%3A27Z&ske=2025-03-28T20%3A03%3A27Z&sks=b&skv=2024-05-04&sig=yb/QDMfmuGK%2BTzoxeUzh18nLGdtGHuzoncXRmA0gWX4%3D';

//load tiff using async
async function loadTIFF(url) {
    try {
      const tiff = await GeoTIFF.fromUrl(url);
      const image = await tiff.getImage();
      
      // Getting raster data
      const rasters = await image.readRasters();
      console.log(rasters);
      
    } catch (error) {
      console.error("Error loading the TIFF:", error);
    }
  }
  

// Convert the data into geojson for using in D3 and Leaflet
function processData(data) {
    // Example: Convert raster data to GeoJSON points
    const geojson = {
      type: "FeatureCollection",
      features: []
    };
  
    for (let i = 0; i < data.width; i++) {
      for (let j = 0; j < data.height; j++) {
        const value = data[0][i * data.width + j];
        if (value) {
          geojson.features.push({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [-116.065750, 33.82251] // Adjust coordinates as needed
            },
            properties: {
              value: value
            }
          });
        }
      }
    }
  
    return geojson;
  }

  // make markers in D3
  
  function addMarkersToMap(geojson, map) {
    const svg = d3.select(map.getPanes().overlayPane).append("svg");
    const g = svg.append("g").attr("class", "leaflet-zoom-hide");
  
    const transform = d3.geoTransform({ point: projectPoint });
    const path = d3.geoPath().projection(transform);
  
    const feature = g.selectAll("path")
      .data(geojson.features)
      .enter().append("path");
  
    map.on("viewreset", reset);
    reset();
  
    function reset() {
      const bounds = path.bounds(geojson);
      const topLeft = bounds[0];
      const bottomRight = bounds[1];
  
      svg.attr("width", bottomRight[0] - topLeft[0])
         .attr("height", bottomRight[1] - topLeft[1])
         .style("left", topLeft[0] + "px")
         .style("top", topLeft[1] + "px");
  
      g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");
  
      feature.attr("d", path);
    }
  
    function projectPoint(x, y) {
      const point = map.latLngToLayerPoint(new L.LatLng(y, x));
      this.stream.point(point.x, point.y);
    }
  }

  // load COG file and process the data and add markers to map
  const map = L.map('map').setView([33.8734, -115.9010], 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  
 
  