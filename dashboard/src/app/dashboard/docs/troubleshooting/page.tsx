'use client'

import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  WrenchScrewdriverIcon,
  CommandLineIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline'

export default function TroubleshootingPage() {
  const commonIssues = [
    {
      id: 'mcp-not-connecting',
      title: 'MCP Server Not Connecting',
      symptoms: [
        'Claude Code shows "MCP server not found" error',
        'Ginko tools are not available in Claude Code',
        'Connection timeout errors'
      ],
      solutions: [
        {
          title: 'Verify API Key',
          description: 'Check that your API key is correct and starts with "cmcp_sk_"',
          code: `# In your .mcp.json file, verify:
{
  "mcpServers": {
    "ginko-context": {
      "env": {
        "MCP_API_KEY": "cmcp_sk_your_actual_key_here"
      }
    }
  }
}`
        },
        {
          title: 'Check Package Installation',
          description: 'Ensure the Ginko MCP client package is available',
          code: 'npx ginko-mcp-client --help'
        },
        {
          title: 'Verify Network Connection',
          description: 'Test connectivity to the MCP server',
          code: 'curl -H "Authorization: Bearer your_api_key" https://mcp.ginko.ai/api/mcp/health'
        }
      ]
    },
    {
      id: 'api-key-invalid',
      title: 'Invalid API Key Error',
      symptoms: [
        '401 Unauthorized responses',
        'API key validation failed messages',
        'Authentication errors in logs'
      ],
      solutions: [
        {
          title: 'Generate New API Key',
          description: 'Create a fresh API key from the dashboard',
          code: '1. Go to Dashboard → Settings\n2. Click "Generate New API Key"\n3. Copy the new key (starts with cmcp_sk_)\n4. Update your .mcp.json file'
        },
        {
          title: 'Check Key Format',
          description: 'Ensure the API key format is correct',
          code: '# Valid format:\ncmcp_sk_[base64-encoded-string]\n\n# Example:\ncmcp_sk_AbCdEf123456789...'
        }
      ]
    },
    {
      id: 'installer-fails',
      title: 'NPX Installer Fails',
      symptoms: [
        'Package not found errors',
        'Installation hangs or times out',
        'Permission denied errors'
      ],
      solutions: [
        {
          title: 'Use Latest NPX',
          description: 'Update npm and npx to the latest versions',
          code: 'npm install -g npm@latest\nnpm install -g npx@latest'
        },
        {
          title: 'Clear NPX Cache',
          description: 'Clear the npx cache and try again',
          code: 'npx clear-npx-cache\nnpx create-ginko-project my-project'
        },
        {
          title: 'Manual Installation',
          description: 'Install the package manually if npx fails',
          code: 'npm install -g create-ginko-project\ncreate-ginko-project my-project'
        }
      ]
    },
    {
      id: 'session-not-saving',
      title: 'Sessions Not Saving',
      symptoms: [
        'prepare_handoff command fails',
        'Sessions not appearing in list_sessions',
        'Context not preserved between sessions'
      ],
      solutions: [
        {
          title: 'Check Server Status',
          description: 'Verify the Ginko server is operational',
          code: 'curl https://mcp.ginko.ai/api/mcp/health'
        },
        {
          title: 'Verify Project Context',
          description: 'Ensure Claude Code is running in a valid project directory',
          code: '# Make sure you have:\n# - .mcp.json file in project root\n# - Valid project structure\n# - Proper API key configuration'
        },
        {
          title: 'Check Storage Quota',
          description: 'Verify you haven\'t exceeded storage limits',
          code: '# Check your dashboard analytics for:\n# - Session count\n# - Storage usage\n# - Plan limits'
        }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Troubleshooting Guide
          </h1>
          <p className="text-lg text-muted-foreground">
            Having issues with Ginko AI? Find solutions to common problems below.
          </p>
        </div>

        {/* Quick Diagnostic */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <InformationCircleIcon className="h-6 w-6 text-primary mt-1 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">Quick Diagnostic</h3>
              <p className="text-muted-foreground mb-4">
                Run these commands to quickly diagnose common issues:
              </p>
              <div className="terminal">
                <div className="terminal-header">
                  <div className="terminal-dot bg-red-500"></div>
                  <div className="terminal-dot bg-yellow-500"></div>
                  <div className="terminal-dot bg-green-500"></div>
                </div>
                <div className="terminal-body">
                  <div className="text-muted-foreground"># Test MCP client installation</div>
                  <div className="terminal-prompt">npx ginko-mcp-client --help</div>
                  <div className="text-muted-foreground mt-2"># Test server connectivity</div>
                  <div className="terminal-prompt">curl https://mcp.ginko.ai/api/mcp/health</div>
                  <div className="text-muted-foreground mt-2"># Check .mcp.json configuration</div>
                  <div className="terminal-prompt">cat .mcp.json</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Common Issues */}
        <div className="space-y-8">
          {commonIssues.map((issue) => (
            <div key={issue.id} className="bg-card rounded-lg shadow-sm border border-border">
              <div className="p-6">
                <div className="flex items-start mb-4">
                  <ExclamationTriangleIcon className="h-6 w-6 text-destructive mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      {issue.title}
                    </h2>
                    <div className="mb-4">
                      <h4 className="font-medium text-foreground mb-2">Common Symptoms:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {issue.symptoms.map((symptom, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-destructive mr-2">•</span>
                            {symptom}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="ml-9">
                  <h4 className="font-medium text-foreground mb-4">Solutions:</h4>
                  <div className="space-y-6">
                    {issue.solutions.map((solution, index) => (
                      <div key={index} className="border-l-4 border-primary pl-4">
                        <div className="flex items-start mb-2">
                          <CheckCircleIcon className="h-5 w-5 text-primary mt-0.5 mr-2 flex-shrink-0" />
                          <h5 className="font-medium text-foreground">{solution.title}</h5>
                        </div>
                        <p className="text-muted-foreground mb-3 ml-7">{solution.description}</p>
                        {solution.code && (
                          <div className="ml-7">
                            <div className="terminal">
                              <div className="terminal-body py-3">
                                <pre className="whitespace-pre-wrap text-muted-foreground">{solution.code}</pre>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* System Requirements */}
        <div className="mt-12 bg-card rounded-lg shadow-sm border border-border p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
            <WrenchScrewdriverIcon className="h-6 w-6 mr-2" />
            System Requirements
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-foreground mb-3">Minimum Requirements</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-primary mr-2" />
                  Node.js 18.0.0 or higher
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-primary mr-2" />
                  Claude Code (latest version)
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-primary mr-2" />
                  Internet connection for MCP server
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-primary mr-2" />
                  Valid Ginko API key
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-3">Supported Platforms</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-primary mr-2" />
                  macOS (Intel & Apple Silicon)
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-primary mr-2" />
                  Windows 10/11
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-primary mr-2" />
                  Linux (Ubuntu, Debian, CentOS)
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-primary mr-2" />
                  WSL2 (Windows Subsystem for Linux)
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Debug Information */}
        <div className="mt-8 bg-secondary border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <CommandLineIcon className="h-5 w-5 mr-2" />
            Collecting Debug Information
          </h3>
          <p className="text-muted-foreground mb-4">
            When reporting issues, please include the following information:
          </p>
          <div className="terminal">
            <div className="terminal-header">
              <div className="terminal-dot bg-red-500"></div>
              <div className="terminal-dot bg-yellow-500"></div>
              <div className="terminal-dot bg-green-500"></div>
            </div>
            <div className="terminal-body">
              <div className="terminal-prompt"># System Information</div>
              <div>node --version</div>
              <div>npm --version</div>
              <div>npx --version</div>
              <div className="mt-3 terminal-prompt"># Ginko Information</div>
              <div>cat .mcp.json</div>
              <div>npx ginko-mcp-client --version</div>
              <div className="mt-3 terminal-prompt"># Server Status</div>
              <div>curl -v https://mcp.ginko.ai/api/mcp/health</div>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-8 bg-primary/10 border border-primary/20 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">Still Need Help?</h3>
          <p className="text-muted-foreground mb-4">
            If you&apos;re still experiencing issues after trying these solutions, we&apos;re here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://github.com/ginko-ai/ginko/issues"
              className="inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-foreground bg-card hover:bg-secondary transition-colors"
            >
              <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
              Report Issue on GitHub
            </a>
            <a
              href="mailto:support@ginko.ai"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
