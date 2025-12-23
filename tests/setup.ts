/**
 * Global test setup
 * Runs once before all test files
 */

import { vi, beforeAll } from 'vitest'

// Mock browser APIs that might not exist in test environment
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock shp.js library for shapefile parsing tests
// @ts-ignore
global.shp = vi.fn().mockResolvedValue({
  type: 'FeatureCollection',
  features: []
})

// Mock environment variables for tests
process.env.VITE_API_BASE_URL = 'http://localhost:8000'

// Optional: Suppress console logs during tests (uncomment if needed)
// beforeAll(() => {
//   vi.spyOn(console, 'log').mockImplementation(() => {})
//   vi.spyOn(console, 'warn').mockImplementation(() => {})
// })
