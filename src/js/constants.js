const COGdir = './COGs';

// fire severity
const vegMapCOG = `https://storage.googleapis.com/national_park_service/mock_assets_frontend/MN_Geo/JOTRvegMap.tif`;

// veg model 
const vegModelCOG = `${COGdir}/Copernicus_DSM_COG_10_N33_00_W117_00_DEM.tif`; // elevation placeholder

// CSV data
const fireVegMatrixURL = 'https://storage.googleapis.com/national_park_service/mock_assets_frontend/MN_Geo/fire_veg_matrix.csv';

export {COGdir, vegMapCOG, vegModelCOG, fireVegMatrixURL};