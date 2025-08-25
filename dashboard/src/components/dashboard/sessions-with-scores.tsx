'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useCollaborationData } from '@/hooks/use-collaboration-data'
import { formatDistanceToNow } from 'date-fns'
import { 
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline'

interface SessionsWithScoresProps {
  userId: string
}

interface SessionScore {
  overall: number
  communication: number
  contextSharing: number
  problemSolving: number
  adaptability: number
}

interface SessionWithScore {
  id: string
  title: string
  description: string
  startTime: Date
  endTime: Date | null
  status: 'active' | 'completed' | 'paused'
  scores?: SessionScore
  coachingTips?: string[]
  insights?: string
}

export function SessionsWithScores({ userId }: SessionsWithScoresProps) {
  const { data, loading, error } = useCollaborationData(userId)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  
  const toggleExpanded = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions)
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId)
    } else {
      newExpanded.add(sessionId)
    }
    setExpandedSessions(newExpanded)
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <LoadingSpinner size="lg" />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600">Error loading sessions: {error}</p>
      </Card>
    )
  }

  // Convert scorecard data to sessions format
  const sessions: SessionWithScore[] = data?.scorecards?.map((scorecard: any, index: number) => ({
    id: scorecard.session_id || `session-${index}`,
    title: `Collaboration Session ${index + 1}`,
    description: 'AI collaboration session with handoff and coaching insights',
    startTime: new Date(scorecard.session_start || Date.now() - (index + 1) * 2 * 60 * 60 * 1000),
    endTime: new Date(scorecard.session_end || Date.now() - index * 2 * 60 * 60 * 1000),
    status: 'completed' as const,
    scores: {
      overall: scorecard.scores?.overallCollaboration || 0,
      communication: scorecard.scores?.handoffQuality || 0,
      contextSharing: scorecard.scores?.contextEfficiency || 0,
      problemSolving: scorecard.scores?.taskCompletion || 0,
      adaptability: scorecard.scores?.sessionDrift || 0
    },
    coachingTips: generateCoachingTips(scorecard.scores),
    insights: generateInsights(scorecard.scores)
  })) || []

  if (sessions.length === 0) {
    return (
      <Card className="p-6 text-center">
        <div className="text-center py-8">
          <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Sessions Yet</h3>
          <p className="text-gray-500">
            Complete sessions with handoffs to see your collaboration history and coaching insights.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Recent Sessions</h2>
        <Badge variant="secondary">{sessions.length} sessions</Badge>
      </div>
      
      <div className="space-y-4">
        {sessions.map((session) => {
          const isExpanded = expandedSessions.has(session.id)
          const overallScore = session.scores?.overall || 0
          
          return (
            <div key={session.id} className="border border-gray-200 rounded-lg">
              {/* Session Header */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpanded(session.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {isExpanded ? (
                      <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900">{session.title}</h3>
                      <p className="text-sm text-gray-500">{session.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {/* Overall Score */}
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${
                        overallScore >= 80 ? 'text-green-600' :
                        overallScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {overallScore}%
                      </div>
                      <div className="text-xs text-gray-500">Overall</div>
                    </div>
                    
                    {/* Status */}
                    <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                      {session.status}
                    </Badge>
                    
                    {/* Time */}
                    <div className="text-right text-sm text-gray-500">
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {formatDistanceToNow(session.startTime, { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Detailed Scores */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                        Collaboration Scores
                      </h4>
                      <div className="space-y-3">
                        {[
                          { label: 'Communication', value: session.scores?.communication, key: 'communication' },
                          { label: 'Context Sharing', value: session.scores?.contextSharing, key: 'contextSharing' },
                          { label: 'Problem Solving', value: session.scores?.problemSolving, key: 'problemSolving' },
                          { label: 'Adaptability', value: session.scores?.adaptability, key: 'adaptability' }
                        ].map((score) => (
                          <div key={score.key} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{score.label}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    (score.value || 0) >= 80 ? 'bg-green-500' :
                                    (score.value || 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${score.value || 0}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-gray-900 w-10 text-right">
                                {score.value || 0}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Coaching Tips */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <LightBulbIcon className="h-5 w-5 text-blue-500 mr-2" />
                        Coaching Insights
                      </h4>
                      {session.insights && (
                        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">{session.insights}</p>
                        </div>
                      )}
                      {session.coachingTips && session.coachingTips.length > 0 && (
                        <ul className="space-y-2">
                          {session.coachingTips.map((tip, index) => (
                            <li key={index} className="flex items-start text-sm text-gray-600">
                              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function generateCoachingTips(scores: any): string[] {
  const tips: string[] = []
  
  if (!scores) return tips
  
  if (scores.handoffQuality < 70) {
    tips.push("Focus on providing clearer context and next steps in your handoffs")
  }
  
  if (scores.contextEfficiency < 70) {
    tips.push("Use the /start command more consistently to load context efficiently")
  }
  
  if (scores.taskCompletion < 70) {
    tips.push("Break down larger tasks into smaller, more manageable chunks")
  }
  
  if (scores.sessionDrift > 80) {
    tips.push("Consider using the vibecheck pattern when you feel the session going off track")
  }
  
  return tips
}

function generateInsights(scores: any): string {
  if (!scores) return "No insights available for this session."
  
  const overallScore = scores.overallCollaboration || 0
  
  if (overallScore >= 80) {
    return "Excellent collaboration! You and Claude worked together very effectively."
  } else if (overallScore >= 60) {
    return "Good collaboration with some areas for improvement. Keep practicing!"
  } else {
    return "This session had challenges. Review the coaching tips to improve future collaborations."
  }
}