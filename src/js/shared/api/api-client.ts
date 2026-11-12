/**
 * Type-Safe API Client
 * Provides type-safe HTTP methods for communicating with the Fire Recovery backend
 */

import type { paths } from '@/types/api';
import type { ApiErrorDetail } from '@/types/custom';
import { API_BASE_URL } from './config';

/**
 * Custom API error class
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: ApiErrorDetail
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Process error response from the API
 */
function processErrorResponse(errorData: ApiErrorDetail, status: number): string {
  let errorMessage = `HTTP error! Status: ${status}`;

  if (errorData.detail) {
    if (Array.isArray(errorData.detail)) {
      errorMessage = errorData.detail
        .map((err: any) => `${err.msg} (${err.loc.join('.')})`)
        .join('\n');
    } else {
      errorMessage = errorData.detail.toString();
    }
  } else if (errorData.message) {
    errorMessage = errorData.message;
  }

  return errorMessage;
}

/**
 * Base API client for making type-safe HTTP requests
 */
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a GET request
   */
  async get<TPath extends keyof paths>(
    path: TPath,
    options?: {
      params?: Record<string, string | number | boolean>;
      headers?: HeadersInit;
    }
  ): Promise<any> {
    const url = new URL(path as string, this.baseUrl);

    // Add query parameters
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...options?.headers,
      },
      mode: 'cors',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new ApiError(
        response.status,
        processErrorResponse(errorData, response.status),
        errorData
      );
    }

    return response.json();
  }

  /**
   * Make a POST request
   */
  async post<TPath extends keyof paths>(
    path: TPath,
    options?: {
      body?: unknown;
      headers?: HeadersInit;
    }
  ): Promise<any> {
    const url = new URL(path as string, this.baseUrl);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options?.headers,
      },
      mode: 'cors',
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new ApiError(
        response.status,
        processErrorResponse(errorData, response.status),
        errorData
      );
    }

    return response.json();
  }

  /**
   * Upload a file using FormData
   */
  async upload(
    path: string,
    formData: FormData
  ): Promise<any> {
    const url = new URL(path, this.baseUrl);

    const response = await fetch(url.toString(), {
      method: 'POST',
      mode: 'cors',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new ApiError(
        response.status,
        processErrorResponse(errorData, response.status),
        errorData
      );
    }

    return response.json();
  }

  /**
   * Get the base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

/**
 * Singleton instance of the API client
 */
export const apiClient = new ApiClient();
