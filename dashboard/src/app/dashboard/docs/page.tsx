'use client'

import { useState } from 'react'
import { 
  PlayIcon, 
  ClipboardDocumentIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CommandLineIcon,
  CodeBracketIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

export default function DocsPage() {
  const [copiedSteps, setCopiedSteps] = useState<Set<string>>(new Set())
  
  const copyToClipboard = async (text: string, stepId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedSteps(prev => new Set([...prev, stepId]))
      setTimeout(() => {
        setCopiedSteps(prev => {
          const newSet = new Set(prev)
          newSet.delete(stepId)
          return newSet
        })
      }, 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const CopyButton = ({ text, stepId }: { text: string; stepId: string }) => {
    const isCopied = copiedSteps.has(stepId)
    
    return (
      <button
        onClick={() => copyToClipboard(text, stepId)}
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

  const steps = [
    {
      id: 'step-1',
      title: '1. Install Claude Code',
      icon: CommandLineIcon,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            First, make sure you have Claude Code installed on your system. You can download it from the official Anthropic website.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-800">
                  <strong>Download Link:</strong> <a href="https://docs.anthropic.com/claude-code" className="underline hover:text-blue-900" target="_blank" rel="noopener noreferrer">Claude Code Documentation</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'step-2',
      title: '2. Create Your First Project',
      icon: CodeBracketIcon,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Use our NPX installer to create a new project with Ginko AI integration pre-configured:
          </p>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400"># Create a new Ginko project</span>
              <CopyButton text="npx create-ginko-project my-ai-project" stepId="create-project" />
            </div>
            <div className="text-green-400">$ npx create-ginko-project my-ai-project</div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-600"><strong>What this does:</strong></p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• Creates a new project directory with your chosen name</li>
              <li>• Sets up the project structure (React, Node.js, or basic template)</li>
              <li>• Configures Claude Code MCP integration automatically</li>
              <li>• Generates the <code className="bg-gray-100 px-1 rounded">.mcp.json</code> configuration file</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'step-3',
      title: '3. Get Your API Key',
      icon: Cog6ToothIcon,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            You need a Ginko API key to connect your project to our intelligent context management system.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm text-yellow-800">
                  <strong>First time setup:</strong> If you're running the installer interactively, it will guide you through the signup process and API key setup.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="bg-gray-50 border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Manual API Key Setup:</h4>
              <ol className="text-sm text-gray-700 space-y-2">
                <li className="flex items-start">
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full mr-3 mt-0.5 flex-shrink-0">1</span>
                  Visit your dashboard settings page (you're already here!)
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full mr-3 mt-0.5 flex-shrink-0">2</span>
                  Generate a new API key in the API Keys section
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full mr-3 mt-0.5 flex-shrink-0">3</span>
                  Copy the API key (starts with <code className="bg-gray-100 px-1 rounded">cmcp_sk_</code>)
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full mr-3 mt-0.5 flex-shrink-0">4</span>
                  Use it with the installer: <code className="bg-gray-100 px-1 rounded">--api-key=your_key_here</code>
                </li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'step-4',
      title: '4. Open in Claude Code',
      icon: PlayIcon,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Navigate to your new project and open it in Claude Code to start using Ginko features:
          </p>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400"># Navigate to your project</span>
              <CopyButton text="cd my-ai-project" stepId="cd-project" />
            </div>
            <div className="text-green-400">$ cd my-ai-project</div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-400"># Open in Claude Code</span>
              <CopyButton text="code ." stepId="open-code" />
            </div>
            <div className="text-green-400">$ code .</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <CheckIcon className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm text-green-800">
                  <strong>Auto-Detection:</strong> Claude Code will automatically detect the <code className="bg-green-100 px-1 rounded">.mcp.json</code> file and connect to Ginko services.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'step-5',
      title: '5. Start Using Ginko Features',
      icon: Cog6ToothIcon,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Once connected, you'll have access to powerful AI context management features directly in Claude Code:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Session Management</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <code className="bg-blue-100 px-1 rounded">prepare_handoff</code> - Prepare session handoff</li>
                <li>• <code className="bg-blue-100 px-1 rounded">list_sessions</code> - View saved sessions</li>
                <li>• <code className="bg-blue-100 px-1 rounded">load_handoff</code> - Load previous session</li>
              </ul>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-medium text-purple-900 mb-2">AI Assistance</h4>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• <code className="bg-purple-100 px-1 rounded">get_best_practices</code> - Get coding guidance</li>
                <li>• <code className="bg-purple-100 px-1 rounded">find_relevant_code</code> - Smart code search</li>
                <li>• <code className="bg-purple-100 px-1 rounded">get_project_overview</code> - Project insights</li>
              </ul>
            </div>
          </div>
          <div className="bg-gray-50 border rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Example Workflow:</h4>
            <ol className="text-sm text-gray-700 space-y-2">
              <li>1. Start coding in Claude Code with your Ginko-enabled project</li>
              <li>2. Use <code className="bg-gray-100 px-1 rounded">get_best_practices</code> to get AI-powered coding suggestions</li>
              <li>3. Prepare handoffs for seamless context transition with <code className="bg-gray-100 px-1 rounded">prepare_handoff</code></li>
              <li>4. Load previous sessions with full context using <code className="bg-gray-100 px-1 rounded">load_handoff &lt;id&gt;</code></li>
              <li>5. Search for relevant code patterns with <code className="bg-gray-100 px-1 rounded">find_relevant_code</code></li>
            </ol>
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🏔️ Getting Started with Ginko AI
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Follow this step-by-step guide to set up intelligent context management for your Claude Code projects in under 5 minutes.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-8">
          {steps.map((step, index) => (
            <div key={step.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <step.icon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h2 className="text-xl font-semibold text-gray-900">{step.title}</h2>
                  </div>
                </div>
                <div className="ml-14">
                  {step.content}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Success Section */}
        <div className="mt-12 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            🎉 You're All Set!
          </h3>
          <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
            Your project is now connected to Ginko AI. Start coding in Claude Code and experience intelligent context management, session handoff, and AI-powered development assistance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/dashboard/docs/api-reference"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <ClipboardDocumentIcon className="h-5 w-5 mr-2" />
              API Reference
            </a>
            <a
              href="/dashboard/docs/troubleshooting"
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              Troubleshooting
            </a>
          </div>
        </div>

        {/* Quick Reference */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Reference</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Essential Commands</h4>
              <div className="space-y-2">
                {[
                  { cmd: 'prepare_handoff', desc: 'Prepare session handoff with mode awareness' },
                  { cmd: 'list_sessions', desc: 'View all saved sessions' },
                  { cmd: 'load_handoff <id>', desc: 'Load handoff from previous session' },
                  { cmd: 'get_best_practices', desc: 'Get AI coding guidance' }
                ].map(item => (
                  <div key={item.cmd} className="flex items-start space-x-3">
                    <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono whitespace-nowrap">
                      {item.cmd}
                    </code>
                    <span className="text-sm text-gray-600">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Support Resources</h4>
              <div className="space-y-2">
                <a href="https://ginko.ai/docs" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  📚 Full Documentation
                </a>
                <a href="https://github.com/ginko-ai/ginko/issues" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  🐛 Report Issues
                </a>
                <a href="https://docs.anthropic.com/claude-code" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  🔧 Claude Code Docs
                </a>
                <a href="/dashboard/settings" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  ⚙️ API Key Management
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}