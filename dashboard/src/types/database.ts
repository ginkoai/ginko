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
      teams: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      team_members: {
        Row: {
          team_id: string
          user_id: string
          role: 'owner' | 'member'
          joined_at: string
        }
        Insert: {
          team_id: string
          user_id: string
          role?: 'owner' | 'member'
          joined_at?: string
        }
        Update: {
          team_id?: string
          user_id?: string
          role?: 'owner' | 'member'
          joined_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          github_repo_url: string | null
          github_repo_id: number | null
          visibility: 'public' | 'private'
          discoverable: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          github_repo_url?: string | null
          github_repo_id?: number | null
          visibility?: 'public' | 'private'
          discoverable?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          github_repo_url?: string | null
          github_repo_id?: number | null
          visibility?: 'public' | 'private'
          discoverable?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      project_members: {
        Row: {
          project_id: string
          user_id: string
          role: 'owner' | 'member'
          granted_at: string
          granted_by: string | null
        }
        Insert: {
          project_id: string
          user_id: string
          role?: 'owner' | 'member'
          granted_at?: string
          granted_by?: string | null
        }
        Update: {
          project_id?: string
          user_id?: string
          role?: 'owner' | 'member'
          granted_at?: string
          granted_by?: string | null
        }
      }
      project_teams: {
        Row: {
          project_id: string
          team_id: string
          granted_at: string
          granted_by: string | null
        }
        Insert: {
          project_id: string
          team_id: string
          granted_at?: string
          granted_by?: string | null
        }
        Update: {
          project_id?: string
          team_id?: string
          granted_at?: string
          granted_by?: string | null
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