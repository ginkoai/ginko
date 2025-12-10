'use client'

import { Card } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useCollaborationData } from '@/hooks/use-collaboration-data'

interface CollaborationMetricsProps {
  userId: string
}

export function CollaborationMetrics({ userId }: CollaborationMetricsProps) {
  const { data, loading, error } = useCollaborationData(userId)

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center justify-center h-20">
              <LoadingSpinner />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600">Error loading metrics: {error}</p>
      </Card>
    )
  }

  if (!data || !data.scorecards || data.scorecards.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">No collaboration data available yet</p>
        <p className="text-sm text-muted-foreground/70 mt-2">
          Complete sessions with handoffs to see your collaboration metrics
        </p>
      </Card>
    )
  }

  // Calculate average scores using actual database field names
  const scorecards = data.scorecards || []
  const totalSessions = scorecards.length
  const averageScores = scorecards.reduce(
    (acc, scorecard) => ({
      overall: acc.overall + (scorecard.scores?.overallCollaboration || 0),
      communication: acc.communication + (scorecard.scores?.handoffQuality || 0),
      context_sharing: acc.context_sharing + (scorecard.scores?.contextEfficiency || 0),
      problem_solving: acc.problem_solving + (scorecard.scores?.taskCompletion || 0),
      adaptability: acc.adaptability + (scorecard.scores?.sessionDrift || 0),
    }),
    { communication: 0, context_sharing: 0, problem_solving: 0, adaptability: 0, overall: 0 }
  )

  Object.keys(averageScores).forEach(key => {
    averageScores[key as keyof typeof averageScores] = 
      averageScores[key as keyof typeof averageScores] / totalSessions
  })

  const metrics = [
    {
      label: 'Overall Score',
      value: averageScores.overall,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      barColor: 'bg-blue-600',
      description: 'Average collaboration effectiveness'
    },
    {
      label: 'Communication',
      value: averageScores.communication,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      barColor: 'bg-green-600',
      description: 'Clarity and information sharing'
    },
    {
      label: 'Context Sharing',
      value: averageScores.context_sharing,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      barColor: 'bg-purple-600',
      description: 'Knowledge transfer quality'
    },
    {
      label: 'Problem Solving',
      value: averageScores.problem_solving,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      barColor: 'bg-orange-600',
      description: 'Solution approach effectiveness'
    },
    {
      label: 'Adaptability',
      value: averageScores.adaptability,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      barColor: 'bg-indigo-600',
      description: 'Flexibility and responsiveness'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className={`p-6 ${metric.bgColor} border-l-4 border-l-current ${metric.color}`}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-600">{metric.label}</h3>
              <div className={`text-2xl font-bold ${metric.color}`}>
                {metric.value.toFixed(1)}
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              {metric.description}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all duration-300 ${metric.barColor}`}
                style={{ width: `${metric.value}%` }}
              />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}