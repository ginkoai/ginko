'use client'

import { useState, useEffect, useCallback } from 'react'
import { analyticsApi } from '@/utils/api'

export function useAnalytics(userId: string, period = '7d') {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fetchAnalytics = useCallback(async () => {
    if (!userId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await analyticsApi.dashboard(userId)
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])
  
  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])
  
  return {
    data,
    loading,
    error,
    refetch: fetchAnalytics
  }
}

export function useAnalyticsMetrics(userId: string, period = '7d') {
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fetchMetrics = useCallback(async () => {
    if (!userId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await analyticsApi.metrics(userId, period)
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      setMetrics(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
      console.error('Error fetching metrics:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, period])
  
  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])
  
  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics
  }
}

export function useAnalyticsCharts(userId: string, period = '7d') {
  const [charts, setCharts] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fetchCharts = useCallback(async () => {
    if (!userId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await analyticsApi.charts(userId, period)
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      setCharts(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch charts')
      console.error('Error fetching charts:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, period])
  
  useEffect(() => {
    fetchCharts()
  }, [fetchCharts])
  
  return {
    charts,
    loading,
    error,
    refetch: fetchCharts
  }
}