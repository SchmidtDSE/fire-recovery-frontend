/**
 * Core Application Configuration
 * Centralized configuration constants for the entire application
 */

// Asset directories
const COG_DIR = './COGs';

// Map defaults
const DEFAULT_MAP_CENTER = [33.8734, -115.9010];
const DEFAULT_ZOOM_LEVEL = 10;

// Map tile servers
const MAP_TILES = {
  STREET: {
    URL: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    ATTRIBUTION: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    MAX_ZOOM: 19
  },
  SATELLITE: {
    URL: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    SUBDOMAINS: ['mt0', 'mt1', 'mt2', 'mt3'],
    ATTRIBUTION: 'Imagery ©2023 Google',
    MAX_ZOOM: 20
  }
};

// Fire severity
const FIRE_SEVERITY_METRICS = {
  RBR: 'Relativized Burn Ratio (RBR)',
  dNBR: 'Differenced Normalized Burn Ratio (dNBR)',
  RdNBR: 'Relativized dNBR (RdNBR)'
};

// Asset URLs
const ASSETS = {
  // Vegetation mapping
  VEG_MAP_COG: `https://storage.googleapis.com/national_park_service/mock_assets_frontend/MN_Geo/JOTRvegMap.tif`,
  
  // Elevation model (placeholder)
  VEG_MODEL_COG: `${COG_DIR}/Copernicus_DSM_COG_10_N33_00_W117_00_DEM.tif`,
  
  // Data files
  FIRE_VEG_MATRIX_URL: 'https://storage.googleapis.com/national_park_service/mock_assets_frontend/MN_Geo/fire_veg_matrix.csv'
};

// Park units with their associated assets
const PARK_UNITS = [
  { 
    id: 'JOTR', 
    name: 'Joshua Tree National Park',
    veg_cog_url: 'https://storage.googleapis.com/national_park_service/mock_assets_frontend/JOTR/JOTRvegMap.tif',
    veg_geopkg_url: 'https://storage.googleapis.com/national_park_service/mock_assets_frontend/JOTR/JOTRvegMap.gpkg'
  },
  { 
    id: 'YOSE', 
    name: 'Yosemite National Park',
    veg_cog_url: 'https://storage.googleapis.com/national_park_service/mock_assets_frontend/YOSE/YOSEvegMap.tif',
    veg_geopkg_url: 'https://storage.googleapis.com/national_park_service/mock_assets_frontend/YOSE/YOSEvegMap.gpkg'
  }
];

// Color scheme for visualization
const COLOR_SCHEME = {
  PRIMARY: 'rgb(55, 8, 85)',
  SECONDARY: 'rgb(39, 80, 123)',
  TERTIARY: 'rgb(31, 120, 122)',
  QUATERNARY: 'rgb(52, 178, 98)',
  QUINARY: 'rgb(171, 219, 32)',
  ERROR: '#900505',
  WARNING: '#e1e100'
};

// Application state
const APP_STATES = {
  IDLE: 'idle',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error'
};

// Process steps
const PROCESS_STEPS = {
  UPLOAD: 'upload',
  ANALYZE: 'analyze',
  REFINE: 'refine',
  RESOLVE: 'resolve'
};

// Export all configuration constants
export {
  COG_DIR,
  DEFAULT_MAP_CENTER,
  DEFAULT_ZOOM_LEVEL,
  MAP_TILES,
  FIRE_SEVERITY_METRICS,
  ASSETS,
  PARK_UNITS,
  COLOR_SCHEME,
  APP_STATES,
  PROCESS_STEPS
};

// Legacy exports for backward compatibility
export const COGdir = COG_DIR;
export const vegMapCOG = ASSETS.VEG_MAP_COG;
export const vegModelCOG = ASSETS.VEG_MODEL_COG;
export const fireVegMatrixURL = ASSETS.FIRE_VEG_MATRIX_URL;