/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-07
 * @tags: [escalation, api, client, epic-004, human-intervention]
 * @related: [create.ts, list.ts, resolve.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [auth-storage]
 */

/**
 * Escalation API Client (EPIC-004 Sprint 5 TASK-7)
 *
 * Client for interacting with escalation management API endpoints
 */

import { getAccessToken, isAuthenticated } from '../../utils/auth-storage.js';

interface CreateEscalationRequest {
  taskId: string;
  agentId: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

interface CreateEscalationResponse {
  escalationId: string;
  taskId: string;
  agentId: string;
  reason: string;
  severity: string;
  status: string;
  organizationId: string;
  createdAt: string;
}

interface ListEscalationsRequest {
  status?: string;
  severity?: string;
  taskId?: string;
  agentId?: string;
  limit?: number;
  offset?: number;
}

interface ListEscalationsResponse {
  escalations: Array<{
    id: string;
    taskId: string;
    agentId: string;
    reason: string;
    severity: string;
    status: string;
    organizationId: string;
    createdAt: string;
    acknowledgedAt?: string;
    acknowledgedBy?: string;
    resolvedAt?: string;
    resolvedBy?: string;
    resolution?: string;
    metadata?: Record<string, any>;
  }>;
  total: number;
  limit: number;
  offset: number;
}

interface AcknowledgeRequest {
  acknowledgedBy: string;
}

interface AcknowledgeResponse {
  escalationId: string;
  status: string;
  acknowledgedAt: string;
  acknowledgedBy: string;
}

interface ResolveRequest {
  resolvedBy: string;
  resolution: string;
}

interface ResolveResponse {
  escalationId: string;
  status: string;
  resolvedAt: string;
  resolvedBy: string;
  resolution: string;
}

interface ApiError {
  error: {
    code: string;
    message: string;
    field?: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Escalation API client
 */
export class EscalationClient {
  private static apiUrl: string = process.env.GINKO_API_URL || 'https://app.ginkoai.com';

  /**
   * Check if user is authenticated
   */
  private static async requireAuth(): Promise<string> {
    if (!await isAuthenticated()) {
      throw new Error('Not authenticated. Run "ginko login" first.');
    }

    const token = await getAccessToken();
    if (!token) {
      throw new Error('Failed to get access token. Run "ginko login" again.');
    }

    return token;
  }

  /**
   * Make authenticated API request
   */
  private static async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const token = await this.requireAuth();
    const url = `${this.apiUrl}${endpoint}`;
    const debugMode = process.env.GINKO_DEBUG_API === 'true';

    if (debugMode) {
      console.log(`\n[Escalation API Debug] ${method} ${url}`);
      if (body) {
        console.log('[Escalation API Debug] Request body:', JSON.stringify(body, null, 2));
      }
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Client-Version': 'ginko-cli@1.2.0',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (debugMode) {
        console.log(`[Escalation API Debug] Response status: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        const errorData = await response.json() as ApiError;
        if (debugMode) {
          console.log('[Escalation API Debug] Error response:', JSON.stringify(errorData, null, 2));
        }

        throw new Error(errorData.error.message || `API error: ${response.status}`);
      }

      const responseData = await response.json() as T;
      if (debugMode) {
        console.log('[Escalation API Debug] Response data:', JSON.stringify(responseData, null, 2));
      }

      return responseData;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to ${method} ${url}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Create a new escalation
   */
  static async create(data: CreateEscalationRequest): Promise<CreateEscalationResponse> {
    return this.request<CreateEscalationResponse>('POST', '/api/v1/escalation', data);
  }

  /**
   * List escalations with optional filtering
   */
  static async list(params: ListEscalationsRequest = {}): Promise<ListEscalationsResponse> {
    const queryParams = new URLSearchParams();

    if (params.status) {
      queryParams.append('status', params.status);
    }

    if (params.severity) {
      queryParams.append('severity', params.severity);
    }

    if (params.taskId) {
      queryParams.append('taskId', params.taskId);
    }

    if (params.agentId) {
      queryParams.append('agentId', params.agentId);
    }

    if (params.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }

    if (params.offset !== undefined) {
      queryParams.append('offset', params.offset.toString());
    }

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/api/v1/escalation?${queryString}` : '/api/v1/escalation';

    return this.request<ListEscalationsResponse>('GET', endpoint);
  }

  /**
   * Acknowledge an escalation
   */
  static async acknowledge(escalationId: string, acknowledgedBy: string): Promise<AcknowledgeResponse> {
    const request: AcknowledgeRequest = { acknowledgedBy };
    return this.request<AcknowledgeResponse>(
      'POST',
      `/api/v1/escalation/${escalationId}/acknowledge`,
      request
    );
  }

  /**
   * Resolve an escalation
   */
  static async resolve(
    escalationId: string,
    resolvedBy: string,
    resolution: string
  ): Promise<ResolveResponse> {
    const request: ResolveRequest = { resolvedBy, resolution };
    return this.request<ResolveResponse>(
      'POST',
      `/api/v1/escalation/${escalationId}/resolve`,
      request
    );
  }
}

// Export types for use in command files
export type { CreateEscalationResponse, ListEscalationsResponse, ResolveResponse };
