/**
 * @fileType: model
 * @status: current
 * @updated: 2025-08-14
 * @tags: [types, database, supabase, schema, interfaces]
 * @related: [client.ts, server.ts, middleware.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [supabase]
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          username: string | null
          full_name: string | null
          avatar_url: string | null
          website: string | null
        }
        Insert: {
          id: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
        }
        Update: {
          id?: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          website?: string | null
        }
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          start_time: string
          end_time: string | null
          status: 'active' | 'completed' | 'paused'
          files_count: number
          context_size: number
          metadata: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          start_time: string
          end_time?: string | null
          status?: 'active' | 'completed' | 'paused'
          files_count?: number
          context_size?: number
          metadata?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string | null
          status?: 'active' | 'completed' | 'paused'
          files_count?: number
          context_size?: number
          metadata?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      session_analytics: {
        Row: {
          id: string
          session_id: string
          user_id: string
          event_type: string
          event_data: any | null
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          event_type: string
          event_data?: any | null
          timestamp: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          event_type?: string
          event_data?: any | null
          timestamp?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}