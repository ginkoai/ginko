/**
 * @fileType: hook
 * @status: current
 * @updated: 2025-01-31
 * @tags: [hook, sessions, state-management, react, api, data-fetching]
 * @related: [api.ts, sessions-table.tsx, types/index.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react]
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { sessionApi } from '@/utils/api'
import type { Session, PaginatedResponse } from '@/types'

export function useSessions(userId: string, page = 1, limit = 10) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  
  const fetchSessions = useCallback(async () => {
    if (!userId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await sessionApi.list(userId, page, limit)
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      if (response.data) {
        setSessions(response.data.data)
        setPagination(response.data.pagination)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions')
      console.error('Error fetching sessions:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, page, limit])
  
  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])
  
  const createSession = async (sessionData: Partial<Session>) => {
    try {
      const response = await sessionApi.create(sessionData)
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      if (response.data) {
        setSessions(prev => [response.data, ...prev])
        return response.data
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create session'
      setError(error)
      throw new Error(error)
    }
  }
  
  const updateSession = async (sessionId: string, updates: Partial<Session>) => {
    try {
      const response = await sessionApi.update(sessionId, updates)
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      if (response.data) {
        setSessions(prev => 
          prev.map(session => 
            session.id === sessionId ? response.data : session
          )
        )
        return response.data
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to update session'
      setError(error)
      throw new Error(error)
    }
  }
  
  const deleteSession = async (sessionId: string) => {
    try {
      const response = await sessionApi.delete(sessionId)
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      setSessions(prev => prev.filter(session => session.id !== sessionId))
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete session'
      setError(error)
      throw new Error(error)
    }
  }
  
  return {
    sessions,
    loading,
    error,
    pagination,
    refetch: fetchSessions,
    createSession,
    updateSession,
    deleteSession
  }
}

export function useSession(sessionId: string) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fetchSession = useCallback(async () => {
    if (!sessionId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await sessionApi.get(sessionId)
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      setSession(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch session')
      console.error('Error fetching session:', err)
    } finally {
      setLoading(false)
    }
  }, [sessionId])
  
  useEffect(() => {
    fetchSession()
  }, [fetchSession])
  
  return {
    session,
    loading,
    error,
    refetch: fetchSession
  }
}