/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-01-31
 * @tags: [api, client, http, supabase, auth, rest]
 * @related: [client.ts, use-sessions.ts, types/index.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [supabase]
 */

import { createClient } from '@/lib/supabase/client'
import type { Session, SessionAnalytics, ApiResponse, PaginatedResponse } from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_GINKO_MCP_SERVER_URL

class ApiClient {
  private supabase = createClient()
  
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession()
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      return { data }
    } catch (error) {
      console.error('API GET error:', error)
      return { 
        data: null as T, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession()
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      return { data }
    } catch (error) {
      console.error('API POST error:', error)
      return { 
        data: null as T, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  async put<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession()
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      return { data }
    } catch (error) {
      console.error('API PUT error:', error)
      return { 
        data: null as T, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession()
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      return { data }
    } catch (error) {
      console.error('API DELETE error:', error)
      return { 
        data: null as T, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export const apiClient = new ApiClient()

// Specific API functions
export const sessionApi = {
  list: (userId: string, page = 1, limit = 10) => 
    apiClient.get<PaginatedResponse<Session>>(`/api/sessions?userId=${userId}&page=${page}&limit=${limit}`),
  
  get: (sessionId: string) => 
    apiClient.get<Session>(`/api/sessions/${sessionId}`),
  
  create: (session: Partial<Session>) => 
    apiClient.post<Session>('/api/sessions', session),
  
  update: (sessionId: string, updates: Partial<Session>) => 
    apiClient.put<Session>(`/api/sessions/${sessionId}`, updates),
  
  delete: (sessionId: string) => 
    apiClient.delete<void>(`/api/sessions/${sessionId}`),
  
  analytics: (sessionId: string) => 
    apiClient.get<SessionAnalytics[]>(`/api/sessions/${sessionId}/analytics`)
}

export const analyticsApi = {
  dashboard: (userId: string) => 
    apiClient.get<any>(`/api/analytics/dashboard?userId=${userId}`),
  
  metrics: (userId: string, period = '7d') => 
    apiClient.get<any>(`/api/analytics/metrics?userId=${userId}&period=${period}`),
  
  charts: (userId: string, period = '7d') => 
    apiClient.get<any>(`/api/analytics/charts?userId=${userId}&period=${period}`)
}