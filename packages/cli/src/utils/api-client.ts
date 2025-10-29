/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-28
 * @tags: [api, client, http, authentication, cli]
 * @related: [auth-storage.ts, commands/login.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk]
 */

import chalk from 'chalk';
import { getAccessToken, isAuthenticated } from './auth-storage.js';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  requireAuth?: boolean;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

/**
 * Make an authenticated API request to Ginko API
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    body,
    headers = {},
    requireAuth = true
  } = options;

  const apiUrl = process.env.GINKO_API_URL || 'https://app.ginko.ai';
  const url = `${apiUrl}${endpoint}`;

  // Check authentication if required
  if (requireAuth) {
    if (!await isAuthenticated()) {
      console.error(chalk.red('\n✗ Not authenticated'));
      console.error(chalk.dim('  Run `ginko login` to authenticate'));
      process.exit(1);
    }

    // Get access token (will auto-refresh if expired)
    const token = await getAccessToken();

    if (!token) {
      console.error(chalk.red('\n✗ Failed to get access token'));
      console.error(chalk.dim('  Your session may have expired. Please run `ginko login` again'));
      process.exit(1);
    }

    // Add authorization header
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add content-type for JSON requests
  if (body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    let responseData: any;
    if (isJson) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      const errorMessage = (typeof responseData === 'object' && responseData)
        ? (responseData.error || responseData.message || 'Request failed')
        : 'Request failed';

      return {
        error: errorMessage,
        status: response.status,
      };
    }

    return {
      data: responseData as T,
      status: response.status,
    };

  } catch (error) {
    console.error(chalk.red('\n✗ API request failed'));

    if (error instanceof Error) {
      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        console.error(chalk.dim('  Could not connect to Ginko API'));
        console.error(chalk.dim(`  URL: ${url}`));
      } else {
        console.error(chalk.dim(`  ${error.message}`));
      }
    }

    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    };
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: <T = any>(endpoint: string, requireAuth = true) =>
    apiRequest<T>(endpoint, { method: 'GET', requireAuth }),

  post: <T = any>(endpoint: string, body: any, requireAuth = true) =>
    apiRequest<T>(endpoint, { method: 'POST', body, requireAuth }),

  put: <T = any>(endpoint: string, body: any, requireAuth = true) =>
    apiRequest<T>(endpoint, { method: 'PUT', body, requireAuth }),

  delete: <T = any>(endpoint: string, requireAuth = true) =>
    apiRequest<T>(endpoint, { method: 'DELETE', requireAuth }),

  patch: <T = any>(endpoint: string, body: any, requireAuth = true) =>
    apiRequest<T>(endpoint, { method: 'PATCH', body, requireAuth }),
};
