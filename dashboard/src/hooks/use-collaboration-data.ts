'use client'

import { useEffect, useState } from 'react'

export interface CollaborationScore {
  communication: number
  context_sharing: number
  problem_solving: number
  adaptability: number
  overall: number
}

export interface CoachingInsight {
  type: 'strength' | 'improvement' | 'trend'
  title: string
  description: string
  actionable_tip: string
  priority: 'high' | 'medium' | 'low'
}

export interface SessionScorecard {
  id: string
  session_id: string
  user_id: string
  created_at: string
  scores: CollaborationScore
  insights: CoachingInsight[]
  session_summary: string
  handoff_quality: number
}

export interface CollaborationData {
  scorecards: SessionScorecard[]
  trends: {
    scores: Array<{ date: string; scores: CollaborationScore }>
    handoff_quality: Array<{ date: string; quality: number }>
  }
  aggregated_insights: CoachingInsight[]
}

export function useCollaborationData(userId: string) {
  const [data, setData] = useState<CollaborationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCollaborationData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/sessions/scorecards?userId=${userId}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch collaboration data: ${response.statusText}`)
        }

        const collaborationData: CollaborationData = await response.json()
        setData(collaborationData)
      } catch (err) {
        console.error('Error fetching collaboration data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch collaboration data')
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchCollaborationData()
    }
  }, [userId])

  return {
    data,
    loading,
    error,
    refetch: () => {
      if (userId) {
        setLoading(true)
        setError(null)
        // Trigger a re-fetch by updating a dependency or calling fetchCollaborationData again
      }
    }
  }
}