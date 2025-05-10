/**
 * Application configuration constants
 */

const COGdir = './COGs';

// Fire severity
const vegMapCOG = `https://storage.googleapis.com/national_park_service/mock_assets_frontend/MN_Geo/JOTRvegMap.tif`;

// Vegetation modeling
const vegModelCOG = `${COGdir}/Copernicus_DSM_COG_10_N33_00_W117_00_DEM.tif`; // elevation placeholder

// CSV data
const fireVegMatrixURL = 'https://storage.googleapis.com/national_park_service/mock_assets_frontend/MN_Geo/fire_veg_matrix.csv';

// API config
const API_BASE_URL = 'http://localhost:8000';

export {
  COGdir, 
  vegMapCOG, 
  vegModelCOG, 
  fireVegMatrixURL,
  API_BASE_URL
};