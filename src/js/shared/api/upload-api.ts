/**
 * File Upload API
 * Type-safe API calls for shapefile and GeoJSON uploads
 */

import { apiClient } from './api-client';

/**
 * Upload shapefile
 */
export async function uploadShapefile(
  fireEventName: string,
  shapefileData: File | Blob
): Promise<any> {
  const formData = new FormData();
  formData.append('fire_event_name', fireEventName);
  formData.append('shapefile', shapefileData);
  formData.append('boundary_type', 'refined');

  return apiClient.upload('/fire-recovery/upload/shapefile', formData);
}

/**
 * Upload GeoJSON
 */
export async function uploadGeojson(
  fireEventName: string,
  geojsonData: object
): Promise<any> {
  const data = {
    fire_event_name: fireEventName,
    geojson: geojsonData,
    boundary_type: 'coarse'
  };

  return apiClient.post('/fire-recovery/upload/geojson', {
    body: data,
  });
}
