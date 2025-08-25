'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useCollaborationData, CoachingInsight } from '@/hooks/use-collaboration-data'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  ChartBarIcon,
  LightBulbIcon 
} from '@heroicons/react/24/outline'

interface CoachingInsightsProps {
  userId: string
}

const InsightIcon = ({ type }: { type: CoachingInsight['type'] }) => {
  switch (type) {
    case 'strength':
      return <CheckCircleIcon className="h-5 w-5 text-green-600" />
    case 'improvement':
      return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
    case 'trend':
      return <ChartBarIcon className="h-5 w-5 text-blue-600" />
    default:
      return <LightBulbIcon className="h-5 w-5 text-gray-600" />
  }
}

const PriorityBadge = ({ priority }: { priority: CoachingInsight['priority'] }) => {
  const variants = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800'
  }
  
  return (
    <Badge className={`text-xs ${variants[priority]}`}>
      {priority.toUpperCase()}
    </Badge>
  )
}

export function CoachingInsights({ userId }: CoachingInsightsProps) {
  const { data, loading, error } = useCollaborationData(userId)

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-red-600">Error loading coaching insights</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </Card>
    )
  }

  if (!data || !data.aggregated_insights || data.aggregated_insights.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <LightBulbIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No coaching insights available yet</p>
          <p className="text-sm text-gray-400 mt-2">
            Complete more collaboration sessions to receive personalized coaching
          </p>
        </div>
      </Card>
    )
  }

  // Sort insights by priority (high -> medium -> low) and type
  const sortedInsights = [...(data.aggregated_insights || [])].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    const typeOrder = { improvement: 0, trend: 1, strength: 2 }
    
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    return typeOrder[a.type] - typeOrder[b.type]
  })

  const insightsByType = {
    improvement: sortedInsights.filter(i => i.type === 'improvement'),
    strength: sortedInsights.filter(i => i.type === 'strength'),
    trend: sortedInsights.filter(i => i.type === 'trend')
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">AI Coaching Insights</h3>
          <Badge className="bg-blue-100 text-blue-800">
            {data.aggregated_insights.length} insights
          </Badge>
        </div>

        <div className="space-y-6">
          {/* High Priority Improvements */}
          {insightsByType.improvement.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <ExclamationTriangleIcon className="h-4 w-4 mr-2 text-yellow-600" />
                Areas for Improvement
              </h4>
              <div className="space-y-3">
                {insightsByType.improvement.slice(0, 3).map((insight, index) => (
                  <div key={index} className="border-l-4 border-yellow-400 pl-4 py-2">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <InsightIcon type={insight.type} />
                        <h5 className="font-medium text-gray-900 text-sm">{insight.title}</h5>
                      </div>
                      <PriorityBadge priority={insight.priority} />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <p className="text-sm text-yellow-800">
                        <strong>💡 Actionable Tip:</strong> {insight.actionable_tip}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Positive Trends */}
          {insightsByType.trend.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <ChartBarIcon className="h-4 w-4 mr-2 text-blue-600" />
                Positive Trends
              </h4>
              <div className="space-y-3">
                {insightsByType.trend.slice(0, 2).map((insight, index) => (
                  <div key={index} className="border-l-4 border-blue-400 pl-4 py-2">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <InsightIcon type={insight.type} />
                        <h5 className="font-medium text-gray-900 text-sm">{insight.title}</h5>
                      </div>
                      <PriorityBadge priority={insight.priority} />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-sm text-blue-800">
                        <strong>🚀 Keep it up:</strong> {insight.actionable_tip}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {insightsByType.strength.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-2 text-green-600" />
                Your Strengths
              </h4>
              <div className="space-y-3">
                {insightsByType.strength.slice(0, 2).map((insight, index) => (
                  <div key={index} className="border-l-4 border-green-400 pl-4 py-2">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <InsightIcon type={insight.type} />
                        <h5 className="font-medium text-gray-900 text-sm">{insight.title}</h5>
                      </div>
                      <PriorityBadge priority={insight.priority} />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <p className="text-sm text-green-800">
                        <strong>✨ Leverage this:</strong> {insight.actionable_tip}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* View More Button */}
        {data.aggregated_insights.length > 7 && (
          <div className="mt-6 text-center">
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
              View {data.aggregated_insights.length - 7} more insights →
            </button>
          </div>
        )}
      </Card>
    </div>
  )
}