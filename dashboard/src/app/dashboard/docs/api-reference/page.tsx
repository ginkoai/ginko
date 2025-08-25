'use client'

import { useState } from 'react'
import { 
  CodeBracketIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline'

export default function ApiReferencePage() {
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set())
  
  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItems(prev => new Set([...prev, itemId]))
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev)
          newSet.delete(itemId)
          return newSet
        })
      }, 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const CopyButton = ({ text, itemId }: { text: string; itemId: string }) => {
    const isCopied = copiedItems.has(itemId)
    
    return (
      <button
        onClick={() => copyToClipboard(text, itemId)}
        className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border transition-colors"
        title="Copy to clipboard"
      >
        {isCopied ? (
          <>
            <CheckIcon className="h-3 w-3 text-green-600 mr-1" />
            <span className="text-green-600">Copied!</span>
          </>
        ) : (
          <>
            <ClipboardDocumentIcon className="h-3 w-3 mr-1" />
            Copy
          </>
        )}
      </button>
    )
  }

  const mcpTools = [
    {
      id: 'prepare_handoff',
      name: 'prepare_handoff',
      category: 'Session Management',
      description: 'Prepares a mode-aware handoff for seamless context transition to next Claude session.',
      parameters: [
        { name: 'currentTask', type: 'string', required: true, description: 'Brief description of what you are currently working on' }
      ],
      example: 'prepare_handoff "Feature development complete"',
      response: {
        success: true,
        sessionId: 'sess_abc123',
        title: 'Feature development complete',
        timestamp: '2025-08-05T20:30:00Z',
        filesCount: 12,
        contextSize: '2.4KB'
      }
    },
    {
      id: 'list_sessions',
      name: 'list_sessions',
      category: 'Session Management',
      description: 'Retrieves a list of all saved sessions with metadata and summary information.',
      parameters: [
        { name: 'limit', type: 'number', required: false, description: 'Maximum number of sessions to return (default: 20)' },
        { name: 'tag_filter', type: 'string', required: false, description: 'Filter sessions by tag' }
      ],
      example: 'list_sessions',
      response: {
        sessions: [
          {
            id: 'sess_abc123',
            title: 'Feature development complete',
            timestamp: '2025-08-05T20:30:00Z',
            tags: ['feature', 'api'],
            filesCount: 12
          }
        ],
        total: 1,
        page: 1
      }
    },
    {
      id: 'load_handoff',
      name: 'load_handoff',
      category: 'Session Management',
      description: 'Loads handoff content from a previous session with full context and mode awareness.',
      parameters: [
        { name: 'sessionId', type: 'string', required: true, description: 'The ID of the session to load handoff from' }
      ],
      example: 'load_handoff sess_abc123',
      response: {
        success: true,
        sessionId: 'sess_abc123',
        title: 'Feature development complete',
        contextRestored: true,
        filesRestored: 12,
        message: 'Session resumed successfully'
      }
    },
    {
      id: 'get_best_practices',
      name: 'get_best_practices',
      category: 'AI Guidance',
      description: 'Retrieves AI-powered best practices and coding recommendations based on current project context.',
      parameters: [
        { name: 'priority', type: 'string', required: false, description: 'Filter by priority: critical, high, medium, low' },
        { name: 'category', type: 'string', required: false, description: 'Filter by category: security, performance, maintainability, etc.' }
      ],
      example: 'get_best_practices priority=critical',
      response: {
        practices: [
          {
            id: 'bp_001',
            title: 'Input Validation',
            category: 'security',
            priority: 'critical',
            description: 'Always validate user inputs to prevent injection attacks',
            example: 'const sanitized = validator.escape(userInput)'
          }
        ],
        total: 1,
        appliedCount: 0
      }
    },
    {
      id: 'get_project_overview',
      name: 'get_project_overview',
      category: 'Project Analysis',
      description: 'Provides an intelligent overview of the current project including architecture, patterns, and insights.',
      parameters: [],
      example: 'get_project_overview',
      response: {
        project: {
          name: 'my-ai-project',
          type: 'React TypeScript',
          structure: 'Standard MVC pattern',
          complexity: 'Medium',
          techStack: ['React', 'TypeScript', 'Node.js'],
          insights: [
            'Project follows modern React patterns',
            'Good TypeScript coverage',
            'Consider adding unit tests'
          ]
        }
      }
    },
    {
      id: 'find_relevant_code',
      name: 'find_relevant_code',
      category: 'Code Search',
      description: 'Performs intelligent code search using semantic understanding and pattern matching.',
      parameters: [
        { name: 'query', type: 'string', required: true, description: 'Search query or description' },
        { name: 'file_pattern', type: 'string', required: false, description: 'Limit search to specific file patterns' }
      ],
      example: 'find_relevant_code "authentication logic"',
      response: {
        results: [
          {
            file: 'src/auth/AuthService.ts',
            line: 42,
            relevance: 0.95,
            context: 'export class AuthService { async authenticate(token: string) { ... }',
            description: 'Main authentication service implementation'
          }
        ],
        total: 1,
        query: 'authentication logic'
      }
    },
    {
      id: 'get_file_context',
      name: 'get_file_context',
      category: 'Code Analysis',
      description: 'Analyzes a specific file and provides context about its purpose, dependencies, and usage patterns.',
      parameters: [
        { name: 'file_path', type: 'string', required: true, description: 'Path to the file to analyze' }
      ],
      example: 'get_file_context src/components/UserProfile.tsx',
      response: {
        file: 'src/components/UserProfile.tsx',
        type: 'React Component',
        purpose: 'User profile display and editing',
        dependencies: ['react', 'typescript'],
        exports: ['UserProfile', 'UserProfileProps'],
        usedBy: ['src/pages/Dashboard.tsx', 'src/pages/Settings.tsx'],
        complexity: 'Low',
        suggestions: ['Add PropTypes validation', 'Consider memoization']
      }
    },
    {
      id: 'get_team_activity',
      name: 'get_team_activity',
      category: 'Team Collaboration',
      description: 'Shows recent team activity and collaborative development insights.',
      parameters: [
        { name: 'timeframe', type: 'string', required: false, description: 'Time period: day, week, month (default: week)' }
      ],
      example: 'get_team_activity timeframe=week',
      response: {
        activity: [
          {
            type: 'session_capture',
            user: 'john@example.com',
            timestamp: '2025-08-05T15:30:00Z',
            description: 'Captured session: API refactoring complete'
          }
        ],
        insights: [
          'Team is focused on API development',
          'High activity in authentication modules'
        ],
        timeframe: 'week'
      }
    }
  ]

  const categories = [...new Set(mcpTools.map(tool => tool.category))]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            📚 API Reference
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl">
            Complete reference for all Ginko AI MCP tools available in Claude Code. These tools provide intelligent context management, session handoff, and AI-powered development assistance.
          </p>
        </div>

        {/* Overview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <InformationCircleIcon className="h-6 w-6 text-blue-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-medium text-blue-900 mb-2">MCP Tool Usage</h3>
              <p className="text-blue-800 mb-4">
                All tools are available directly in Claude Code when your project is connected to Ginko AI. Simply type the tool name as a command.
              </p>
              <div className="bg-blue-900 text-blue-100 rounded p-3 font-mono text-sm">
                <div className="space-y-1">
                  <div className="text-yellow-300"># Example usage in Claude Code:</div>
                  <div>prepare_handoff "Completed user authentication"</div>
                  <div>get_best_practices priority=high</div>
                  <div>find_relevant_code "database queries"</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Tool Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category) => (
              <div key={category} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="text-sm font-medium text-gray-900">{category}</div>
                <div className="text-xs text-gray-500">
                  {mcpTools.filter(tool => tool.category === category).length} tools
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tools */}
        <div className="space-y-8">
          {categories.map((category) => (
            <div key={category} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <CodeBracketIcon className="h-6 w-6 mr-2" />
                  {category}
                </h2>
              </div>
              <div className="divide-y divide-gray-200">
                {mcpTools.filter(tool => tool.category === category).map((tool) => (
                  <div key={tool.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 font-mono">
                          {tool.name}
                        </h3>
                        <p className="text-gray-700">{tool.description}</p>
                      </div>
                      <CopyButton text={tool.example} itemId={`example-${tool.id}`} />
                    </div>

                    {/* Parameters */}
                    {tool.parameters.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Parameters:</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-2 px-3 font-medium text-gray-900">Name</th>
                                <th className="text-left py-2 px-3 font-medium text-gray-900">Type</th>
                                <th className="text-left py-2 px-3 font-medium text-gray-900">Required</th>
                                <th className="text-left py-2 px-3 font-medium text-gray-900">Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tool.parameters.map((param, index) => (
                                <tr key={index} className="border-b border-gray-100">
                                  <td className="py-2 px-3 font-mono text-blue-600">{param.name}</td>
                                  <td className="py-2 px-3 font-mono text-gray-600">{param.type}</td>
                                  <td className="py-2 px-3">
                                    {param.required ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        Required
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                        Optional
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-gray-600">{param.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Example */}
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Example Usage:</h4>
                      <div className="bg-gray-900 text-gray-100 rounded p-3 font-mono text-sm">
                        {tool.example}
                      </div>
                    </div>

                    {/* Response */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Example Response:</h4>
                      <div className="bg-gray-50 border border-gray-200 rounded p-3 font-mono text-sm overflow-x-auto">
                        <pre className="text-gray-800">{JSON.stringify(tool.response, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Error Handling */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 mr-2 text-orange-500" />
            Error Handling
          </h3>
          <div className="space-y-4">
            <p className="text-gray-700">
              All MCP tools return structured error responses when something goes wrong. Common error patterns:
            </p>
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <h4 className="font-medium text-red-900 mb-2">Authentication Error</h4>
              <div className="bg-gray-900 text-gray-100 rounded p-3 font-mono text-sm">
                <pre>{JSON.stringify({
                  error: "authentication_failed",
                  message: "Invalid API key",
                  code: 401
                }, null, 2)}</pre>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Rate Limit Error</h4>
              <div className="bg-gray-900 text-gray-100 rounded p-3 font-mono text-sm">
                <pre>{JSON.stringify({
                  error: "rate_limit_exceeded",
                  message: "Too many requests",
                  retryAfter: 60,
                  code: 429
                }, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* Rate Limits */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <CommandLineIcon className="h-6 w-6 mr-2" />
            Rate Limits & Quotas
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Free Tier Limits</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• 100 API calls per hour</li>
                <li>• 10 sessions stored</li>
                <li>• 1MB context storage</li>
                <li>• Basic best practices access</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Pro Tier Limits</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• 1,000 API calls per hour</li>
                <li>• Unlimited sessions</li>
                <li>• 100MB context storage</li>
                <li>• Advanced AI insights</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}