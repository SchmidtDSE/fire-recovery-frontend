// script code to load map with georaster layer from a locally saved file
import {vegModelCOG} from './constants.js';


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

  
  // ****************** USE BELOW FOR LOADING FROM LOCAL ******************
  fetch(vegModelCOG)
//   fetch('../COGs/JOTRcog_optimized10.tif')
  .then(response => response.arrayBuffer())
  .then(arrayBuffer => {
      parseGeoraster(arrayBuffer).then(georaster => {
      console.log("georaster:", georaster);
  
  
      
      var layer = new GeoRasterLayer({
          georaster: georaster,
          opacity: 0.5,
          // adjust value and color scale for success, density, survivability?
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
          resolution: 64 // optional parameter for adjusting display resolution
      });
  
      layer.addTo(map);
      map.fitBounds(layer.getBounds());
      });
  });