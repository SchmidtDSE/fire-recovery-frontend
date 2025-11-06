/**
 * Shared test utilities and helpers
 */

/**
 * Create a mock GeoJSON Polygon for testing
 */
export function createMockPolygon(coordinates?: number[][][]) {
  return {
    type: 'Polygon' as const,
    coordinates: coordinates || [
      [
        [-117.1, 33.9],
        [-117.0, 33.9],
        [-117.0, 34.0],
        [-117.1, 34.0],
        [-117.1, 33.9]
      ]
    ]
  }
}

/**
 * Create a mock GeoJSON Feature for testing
 */
export function createMockFeature(properties = {}) {
  return {
    type: 'Feature' as const,
    geometry: createMockPolygon(),
    properties
  }
}

/**
 * Create a mock API response for testing
 */
export function createMockApiResponse<T>(data: T, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response
}

/**
 * Wait for async operations to complete
 */
export function waitFor(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Flush all pending promises
 */
export async function flushPromises() {
  return new Promise(resolve => setImmediate(resolve))
}

/**
 * Mock the API base URL for tests
 */
export function mockApiBaseUrl(url: string = 'http://localhost:8000') {
  const originalEnv = import.meta.env.VITE_API_BASE_URL

  // @ts-ignore
  import.meta.env.VITE_API_BASE_URL = url

  return () => {
    // @ts-ignore
    import.meta.env.VITE_API_BASE_URL = originalEnv
  }
}
