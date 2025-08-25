/**
 * @fileType: model
 * @status: current
 * @updated: 2025-08-14
 * @tags: [types, interfaces, models, core-entities]
 * @related: [database.ts, auth-form.tsx, sessions-table.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */
export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  user_id: string
  title: string
  description?: string
  start_time: Date
  end_time?: Date
  status: 'active' | 'completed' | 'paused'
  files_count: number
  context_size: number
  metadata?: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface SessionAnalytics {
  id: string
  session_id: string
  user_id: string
  event_type: string
  event_data?: Record<string, any>
  timestamp: Date
  created_at: Date
}

export interface DashboardStats {
  totalSessions: number
  activeSessions: number
  totalDuration: number
  avgSessionLength: number
  productivityScore: number
  weeklyGrowth: number
}

export interface ChartDataPoint {
  name: string
  value: number
  date?: string
}

export interface ApiResponse<T> {
  data: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type SessionStatus = 'active' | 'completed' | 'paused'
export type EventType = 'session_start' | 'session_end' | 'file_analyzed' | 'context_updated'