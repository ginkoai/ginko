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
        className="inline-flex items-center px-2 py-1 text-xs bg-secondary hover:bg-secondary/80 text-foreground rounded border border-border transition-colors"
        title="Copy to clipboard"
      >
        {isCopied ? (
          <>
            <CheckIcon className="h-3 w-3 text-primary mr-1" />
            <span className="text-primary">Copied!</span>
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
          <p className="text-muted-foreground">
            First, make sure you have Claude Code installed on your system. You can download it from the official Anthropic website.
          </p>
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start">
              <InformationCircleIcon className="h-5 w-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm text-foreground">
                  <strong>Download Link:</strong> <a href="https://docs.anthropic.com/claude-code" className="text-primary hover:text-primary/80 underline" target="_blank" rel="noopener noreferrer">Claude Code Documentation</a>
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
          <p className="text-muted-foreground">
            Use our NPX installer to create a new project with Ginko AI integration pre-configured:
          </p>
          <div className="terminal">
            <div className="terminal-header">
              <div className="terminal-dot bg-red-500"></div>
              <div className="terminal-dot bg-yellow-500"></div>
              <div className="terminal-dot bg-green-500"></div>
              <div className="flex-1"></div>
              <CopyButton text="npx create-ginko-project my-ai-project" stepId="create-project" />
            </div>
            <div className="terminal-body">
              <div className="text-muted-foreground mb-2"># Create a new Ginko project</div>
              <div className="terminal-prompt">$ npx create-ginko-project my-ai-project</div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground"><strong className="text-foreground">What this does:</strong></p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Creates a new project directory with your chosen name</li>
              <li>• Sets up the project structure (React, Node.js, or basic template)</li>
              <li>• Configures Claude Code MCP integration automatically</li>
              <li>• Generates the <code className="bg-secondary px-1 rounded text-foreground">.mcp.json</code> configuration file</li>
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
          <p className="text-muted-foreground">
            You need a Ginko API key to connect your project to our intelligent context management system.
          </p>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm text-foreground">
                  <strong>First time setup:</strong> If you&apos;re running the installer interactively, it will guide you through the signup process and API key setup.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">Manual API Key Setup:</h4>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start">
                  <span className="bg-primary/20 text-primary text-xs font-medium px-2 py-1 rounded-full mr-3 mt-0.5 flex-shrink-0">1</span>
                  Visit your dashboard settings page (you&apos;re already here!)
                </li>
                <li className="flex items-start">
                  <span className="bg-primary/20 text-primary text-xs font-medium px-2 py-1 rounded-full mr-3 mt-0.5 flex-shrink-0">2</span>
                  Generate a new API key in the API Keys section
                </li>
                <li className="flex items-start">
                  <span className="bg-primary/20 text-primary text-xs font-medium px-2 py-1 rounded-full mr-3 mt-0.5 flex-shrink-0">3</span>
                  Copy the API key (starts with <code className="bg-secondary px-1 rounded text-foreground">cmcp_sk_</code>)
                </li>
                <li className="flex items-start">
                  <span className="bg-primary/20 text-primary text-xs font-medium px-2 py-1 rounded-full mr-3 mt-0.5 flex-shrink-0">4</span>
                  Use it with the installer: <code className="bg-secondary px-1 rounded text-foreground">--api-key=your_key_here</code>
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
          <p className="text-muted-foreground">
            Navigate to your new project and open it in Claude Code to start using Ginko features:
          </p>
          <div className="terminal">
            <div className="terminal-header">
              <div className="terminal-dot bg-red-500"></div>
              <div className="terminal-dot bg-yellow-500"></div>
              <div className="terminal-dot bg-green-500"></div>
              <div className="flex-1"></div>
              <CopyButton text="cd my-ai-project && code ." stepId="open-code" />
            </div>
            <div className="terminal-body space-y-2">
              <div className="text-muted-foreground"># Navigate to your project</div>
              <div className="terminal-prompt">$ cd my-ai-project</div>
              <div className="text-muted-foreground mt-2"># Open in Claude Code</div>
              <div className="terminal-prompt">$ code .</div>
            </div>
          </div>
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start">
              <CheckIcon className="h-5 w-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm text-foreground">
                  <strong>Auto-Detection:</strong> Claude Code will automatically detect the <code className="bg-secondary px-1 rounded">.mcp.json</code> file and connect to Ginko services.
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
          <p className="text-muted-foreground">
            Once connected, you&apos;ll have access to powerful AI context management features directly in Claude Code:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">Session Management</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <code className="bg-secondary px-1 rounded text-foreground">prepare_handoff</code> - Prepare session handoff</li>
                <li>• <code className="bg-secondary px-1 rounded text-foreground">list_sessions</code> - View saved sessions</li>
                <li>• <code className="bg-secondary px-1 rounded text-foreground">load_handoff</code> - Load previous session</li>
              </ul>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">AI Assistance</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <code className="bg-secondary px-1 rounded text-foreground">get_best_practices</code> - Get coding guidance</li>
                <li>• <code className="bg-secondary px-1 rounded text-foreground">find_relevant_code</code> - Smart code search</li>
                <li>• <code className="bg-secondary px-1 rounded text-foreground">get_project_overview</code> - Project insights</li>
              </ul>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">Example Workflow:</h4>
            <ol className="text-sm text-muted-foreground space-y-2">
              <li>1. Start coding in Claude Code with your Ginko-enabled project</li>
              <li>2. Use <code className="bg-secondary px-1 rounded text-foreground">get_best_practices</code> to get AI-powered coding suggestions</li>
              <li>3. Prepare handoffs for seamless context transition with <code className="bg-secondary px-1 rounded text-foreground">prepare_handoff</code></li>
              <li>4. Load previous sessions with full context using <code className="bg-secondary px-1 rounded text-foreground">load_handoff &lt;id&gt;</code></li>
              <li>5. Search for relevant code patterns with <code className="bg-secondary px-1 rounded text-foreground">find_relevant_code</code></li>
            </ol>
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Getting Started with Ginko AI
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Follow this step-by-step guide to set up intelligent context management for your Claude Code projects in under 5 minutes.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-8">
          {steps.map((step) => (
            <div key={step.id} className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <step.icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h2 className="text-xl font-semibold text-foreground">{step.title}</h2>
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
        <div className="mt-12 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg border border-primary/20 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
              <CheckIcon className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            You&apos;re All Set!
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Your project is now connected to Ginko AI. Start coding in Claude Code and experience intelligent context management, session handoff, and AI-powered development assistance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/dashboard/docs/api-reference"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
            >
              <ClipboardDocumentIcon className="h-5 w-5 mr-2" />
              API Reference
            </a>
            <a
              href="/dashboard/docs/troubleshooting"
              className="inline-flex items-center px-6 py-3 border border-border text-base font-medium rounded-md text-foreground bg-card hover:bg-secondary transition-colors"
            >
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              Troubleshooting
            </a>
          </div>
        </div>

        {/* Quick Reference */}
        <div className="mt-12 bg-card rounded-lg shadow-sm border border-border p-8">
          <h3 className="text-xl font-semibold text-foreground mb-6">Quick Reference</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-medium text-foreground mb-3">Essential Commands</h4>
              <div className="space-y-2">
                {[
                  { cmd: 'prepare_handoff', desc: 'Prepare session handoff with mode awareness' },
                  { cmd: 'list_sessions', desc: 'View all saved sessions' },
                  { cmd: 'load_handoff <id>', desc: 'Load handoff from previous session' },
                  { cmd: 'get_best_practices', desc: 'Get AI coding guidance' }
                ].map(item => (
                  <div key={item.cmd} className="flex items-start space-x-3">
                    <code className="bg-secondary text-foreground px-2 py-1 rounded text-sm font-mono whitespace-nowrap">
                      {item.cmd}
                    </code>
                    <span className="text-sm text-muted-foreground">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-3">Support Resources</h4>
              <div className="space-y-2">
                <a href="https://ginko.ai/docs" className="block text-sm text-primary hover:text-primary/80">
                  Full Documentation
                </a>
                <a href="https://github.com/ginko-ai/ginko/issues" className="block text-sm text-primary hover:text-primary/80">
                  Report Issues
                </a>
                <a href="https://docs.anthropic.com/claude-code" className="block text-sm text-primary hover:text-primary/80">
                  Claude Code Docs
                </a>
                <a href="/dashboard/settings" className="block text-sm text-primary hover:text-primary/80">
                  API Key Management
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
