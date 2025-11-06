/**
 * Tests for API Client
 * Uses MSW v2 for HTTP mocking with native fetch support
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { ApiClient, ApiError, apiClient } from '@/js/shared/api/api-client.ts'

// Create mock server
const server = setupServer()

beforeEach(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
  server.close()
})

describe('ApiClient', () => {
  describe('constructor', () => {
    it('should use provided base URL', () => {
      const client = new ApiClient('http://test.example.com/api')
      expect(client.getBaseUrl()).toBe('http://test.example.com/api')
    })

    it('should use default base URL from config when not provided', () => {
      const client = new ApiClient()
      expect(client.getBaseUrl()).toContain('fire-recovery')
    })

    it('should use singleton instance correctly', () => {
      expect(apiClient).toBeInstanceOf(ApiClient)
      expect(apiClient.getBaseUrl()).toContain('fire-recovery')
    })
  })

  describe('get', () => {
    it('should make successful GET request', async () => {
      const mockData = { status: 'success', data: 'test' }

      server.use(
        http.get('http://localhost:8000/fire-recovery/test', () => {
          return HttpResponse.json(mockData)
        })
      )

      const result = await apiClient.get('/fire-recovery/test' as any)
      expect(result).toEqual(mockData)
    })

    it('should include query parameters', async () => {
      let capturedParams: URLSearchParams | null = null

      server.use(
        http.get('http://localhost:8000/fire-recovery/test', ({ request }) => {
          const url = new URL(request.url)
          capturedParams = url.searchParams
          return HttpResponse.json({ ok: true })
        })
      )

      await apiClient.get('/fire-recovery/test' as any, {
        params: { foo: 'bar', baz: 123, flag: true }
      })

      expect(capturedParams?.get('foo')).toBe('bar')
      expect(capturedParams?.get('baz')).toBe('123')
      expect(capturedParams?.get('flag')).toBe('true')
    })

    it('should include custom headers', async () => {
      let capturedHeaders: Headers | null = null

      server.use(
        http.get('http://localhost:8000/fire-recovery/test', ({ request }) => {
          capturedHeaders = request.headers
          return HttpResponse.json({ ok: true })
        })
      )

      await apiClient.get('/fire-recovery/test' as any, {
        headers: { 'X-Custom-Header': 'test-value' }
      })

      expect(capturedHeaders?.get('X-Custom-Header')).toBe('test-value')
    })

    it('should include Accept header by default', async () => {
      let capturedHeaders: Headers | null = null

      server.use(
        http.get('http://localhost:8000/fire-recovery/test', ({ request }) => {
          capturedHeaders = request.headers
          return HttpResponse.json({ ok: true })
        })
      )

      await apiClient.get('/fire-recovery/test' as any)

      expect(capturedHeaders?.get('Accept')).toBe('application/json')
    })

    it('should throw ApiError on 404', async () => {
      server.use(
        http.get('http://localhost:8000/fire-recovery/test', () => {
          return HttpResponse.json(
            { detail: 'Not found' },
            { status: 404 }
          )
        })
      )

      await expect(
        apiClient.get('/fire-recovery/test' as any)
      ).rejects.toThrow(ApiError)
    })

    it('should throw ApiError with correct status and message', async () => {
      server.use(
        http.get('http://localhost:8000/fire-recovery/test', () => {
          return HttpResponse.json(
            { detail: 'Bad request', message: 'Invalid parameters' },
            { status: 400 }
          )
        })
      )

      try {
        await apiClient.get('/fire-recovery/test' as any)
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).status).toBe(400)
        expect((error as ApiError).message).toContain('Bad request')
        expect((error as ApiError).details).toEqual({
          detail: 'Bad request',
          message: 'Invalid parameters'
        })
      }
    })

    it('should handle validation errors (422)', async () => {
      server.use(
        http.get('http://localhost:8000/fire-recovery/test', () => {
          return HttpResponse.json(
            {
              detail: [
                { msg: 'Field required', loc: ['body', 'fire_event_name'] },
                { msg: 'Invalid date', loc: ['body', 'start_date'] }
              ]
            },
            { status: 422 }
          )
        })
      )

      try {
        await apiClient.get('/fire-recovery/test' as any)
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).status).toBe(422)
        expect((error as ApiError).message).toContain('Field required')
        expect((error as ApiError).message).toContain('body.fire_event_name')
      }
    })

    it('should handle server errors (500)', async () => {
      server.use(
        http.get('http://localhost:8000/fire-recovery/test', () => {
          return HttpResponse.json(
            { detail: 'Internal server error' },
            { status: 500 }
          )
        })
      )

      try {
        await apiClient.get('/fire-recovery/test' as any)
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).status).toBe(500)
      }
    })

    it('should handle malformed error responses', async () => {
      server.use(
        http.get('http://localhost:8000/fire-recovery/test', () => {
          return new HttpResponse(null, { status: 500 })
        })
      )

      try {
        await apiClient.get('/fire-recovery/test' as any)
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).status).toBe(500)
      }
    })
  })

  describe('post', () => {
    it('should make successful POST request with body', async () => {
      const requestBody = { fire_event_name: 'Test Fire', coordinates: [[0, 0]] }
      const responseData = { job_id: '123', status: 'pending' }

      let capturedBody: any = null

      server.use(
        http.post('http://localhost:8000/fire-recovery/test', async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json(responseData)
        })
      )

      const result = await apiClient.post('/fire-recovery/test' as any, {
        body: requestBody
      })

      expect(result).toEqual(responseData)
      expect(capturedBody).toEqual(requestBody)
    })

    it('should include Content-Type header', async () => {
      let capturedHeaders: Headers | null = null

      server.use(
        http.post('http://localhost:8000/fire-recovery/test', ({ request }) => {
          capturedHeaders = request.headers
          return HttpResponse.json({ ok: true })
        })
      )

      await apiClient.post('/fire-recovery/test' as any, {
        body: { test: 'data' }
      })

      expect(capturedHeaders?.get('Content-Type')).toBe('application/json')
      expect(capturedHeaders?.get('Accept')).toBe('application/json')
    })

    it('should handle POST without body', async () => {
      server.use(
        http.post('http://localhost:8000/fire-recovery/test', () => {
          return HttpResponse.json({ ok: true })
        })
      )

      const result = await apiClient.post('/fire-recovery/test' as any)
      expect(result).toEqual({ ok: true })
    })

    it('should include custom headers', async () => {
      let capturedHeaders: Headers | null = null

      server.use(
        http.post('http://localhost:8000/fire-recovery/test', ({ request }) => {
          capturedHeaders = request.headers
          return HttpResponse.json({ ok: true })
        })
      )

      await apiClient.post('/fire-recovery/test' as any, {
        body: {},
        headers: { 'X-Request-ID': 'abc123' }
      })

      expect(capturedHeaders?.get('X-Request-ID')).toBe('abc123')
    })

    it('should throw ApiError on validation error', async () => {
      server.use(
        http.post('http://localhost:8000/fire-recovery/test', () => {
          return HttpResponse.json(
            {
              detail: [
                { msg: 'Field required', loc: ['body', 'fire_event_name'] }
              ]
            },
            { status: 422 }
          )
        })
      )

      await expect(
        apiClient.post('/fire-recovery/test' as any, { body: {} })
      ).rejects.toThrow('Field required')
    })

    it('should throw ApiError on conflict (409)', async () => {
      server.use(
        http.post('http://localhost:8000/fire-recovery/test', () => {
          return HttpResponse.json(
            { detail: 'Resource already exists' },
            { status: 409 }
          )
        })
      )

      try {
        await apiClient.post('/fire-recovery/test' as any, { body: {} })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).status).toBe(409)
        expect((error as ApiError).message).toContain('Resource already exists')
      }
    })

    it('should handle empty response body', async () => {
      server.use(
        http.post('http://localhost:8000/fire-recovery/test', () => {
          return HttpResponse.json({})
        })
      )

      const result = await apiClient.post('/fire-recovery/test' as any, {
        body: { test: 'data' }
      })
      expect(result).toEqual({})
    })
  })

  describe('upload', () => {
    it('should upload FormData successfully', async () => {
      const mockResponse = { url: 'https://example.com/file.zip' }
      let capturedContentType: string | null = null

      server.use(
        http.post('http://localhost:8000/fire-recovery/upload', ({ request }) => {
          capturedContentType = request.headers.get('content-type')
          return HttpResponse.json(mockResponse)
        })
      )

      const formData = new FormData()
      formData.append('file', new Blob(['test content'], { type: 'text/plain' }), 'test.txt')
      formData.append('name', 'test-upload')

      const result = await apiClient.upload('/fire-recovery/upload', formData)
      expect(result).toEqual(mockResponse)
      expect(capturedContentType).toContain('multipart/form-data')
    })

    it('should handle multiple files in FormData', async () => {
      const mockResponse = { files: ['file1.txt', 'file2.txt'] }

      server.use(
        http.post('http://localhost:8000/fire-recovery/upload', () => {
          return HttpResponse.json(mockResponse)
        })
      )

      const formData = new FormData()
      formData.append('file1', new Blob(['content1']), 'file1.txt')
      formData.append('file2', new Blob(['content2']), 'file2.txt')

      const result = await apiClient.upload('/fire-recovery/upload', formData)
      expect(result).toEqual(mockResponse)
    })

    it('should throw ApiError on upload failure', async () => {
      server.use(
        http.post('http://localhost:8000/fire-recovery/upload', () => {
          return HttpResponse.json(
            { detail: 'File too large' },
            { status: 413 }
          )
        })
      )

      const formData = new FormData()
      formData.append('file', new Blob(['x'.repeat(1000000)]), 'large.txt')

      await expect(
        apiClient.upload('/fire-recovery/upload', formData)
      ).rejects.toThrow('File too large')
    })

    it('should throw ApiError on unsupported file type', async () => {
      server.use(
        http.post('http://localhost:8000/fire-recovery/upload', () => {
          return HttpResponse.json(
            { detail: 'Unsupported file type' },
            { status: 415 }
          )
        })
      )

      const formData = new FormData()
      formData.append('file', new Blob(['test']), 'test.exe')

      try {
        await apiClient.upload('/fire-recovery/upload', formData)
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).status).toBe(415)
      }
    })

    it('should handle empty FormData', async () => {
      const mockResponse = { message: 'No files uploaded' }

      server.use(
        http.post('http://localhost:8000/fire-recovery/upload', () => {
          return HttpResponse.json(mockResponse)
        })
      )

      const formData = new FormData()
      const result = await apiClient.upload('/fire-recovery/upload', formData)
      expect(result).toEqual(mockResponse)
    })

    it('should not include Content-Type header (let browser set it)', async () => {
      let capturedHeaders: Headers | null = null

      server.use(
        http.post('http://localhost:8000/fire-recovery/upload', ({ request }) => {
          capturedHeaders = request.headers
          return HttpResponse.json({ ok: true })
        })
      )

      const formData = new FormData()
      formData.append('file', new Blob(['test']), 'test.txt')
      await apiClient.upload('/fire-recovery/upload', formData)

      // Browser sets Content-Type with boundary for multipart/form-data
      // We should not manually set it
      expect(capturedHeaders?.get('content-type')).toContain('multipart/form-data')
    })
  })

  describe('getBaseUrl', () => {
    it('should return the configured base URL', () => {
      const client = new ApiClient('http://test.example.com')
      expect(client.getBaseUrl()).toBe('http://test.example.com')
    })
  })
})

describe('ApiError', () => {
  it('should create error with status and message', () => {
    const error = new ApiError(404, 'Not found')
    expect(error.status).toBe(404)
    expect(error.message).toBe('Not found')
    expect(error.name).toBe('ApiError')
  })

  it('should include details when provided', () => {
    const details = { detail: 'Validation failed', field: 'email' }
    const error = new ApiError(400, 'Bad request', details)
    expect(error.details).toEqual(details)
  })

  it('should be an instance of Error', () => {
    const error = new ApiError(500, 'Server error')
    expect(error).toBeInstanceOf(Error)
  })

  it('should have correct error name', () => {
    const error = new ApiError(403, 'Forbidden')
    expect(error.name).toBe('ApiError')
  })

  it('should handle missing details', () => {
    const error = new ApiError(401, 'Unauthorized')
    expect(error.details).toBeUndefined()
  })

  it('should be throwable and caught in try-catch', () => {
    expect(() => {
      throw new ApiError(500, 'Test error')
    }).toThrow(ApiError)
  })
})
