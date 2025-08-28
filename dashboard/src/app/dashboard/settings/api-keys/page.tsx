/**
 * @fileType: page
 * @status: new
 * @updated: 2025-08-26
 * @tags: [dashboard, settings, api-keys, react, nextjs, security]
 * @related: [dashboard/settings/page.tsx, api/generate-api-key/route.ts, api/revoke-api-key/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next, supabase-ssr, react]
 */

'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

interface UserProfile {
  api_key_hash?: string
  api_key_prefix?: string
  api_key_created_at?: string
  github_username?: string
  subscription_tier?: string
}

export default function ApiKeysPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [showCopiedAlert, setShowCopiedAlert] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          
          setProfile(profile)
        }
      } catch (error) {
        console.error('Error loading user data:', error)
        setError('Failed to load user data')
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [supabase])

  const generateApiKey = async () => {
    try {
      setIsGenerating(true)
      setError(null)
      
      const response = await fetch('/api/generate-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Store the actual key temporarily for display
        setNewApiKey(data.api_key)
        
        // Reload profile data to get updated information
        if (user) {
          const { data: updatedProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          setProfile(updatedProfile)
        }
      } else {
        setError(data.error || 'Failed to generate API key')
      }
    } catch (error) {
      console.error('Error generating API key:', error)
      setError('Failed to generate API key. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const revokeApiKey = async () => {
    if (!confirm('Are you sure you want to revoke your API key? This action cannot be undone and will break any existing integrations.')) {
      return
    }

    try {
      setIsRevoking(true)
      setError(null)
      
      const response = await fetch('/api/revoke-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Clear the new API key display and update profile
        setNewApiKey(null)
        setProfile(prev => prev ? {
          ...prev,
          api_key_hash: undefined,
          api_key_prefix: undefined,
          api_key_created_at: undefined
        } : null)
      } else {
        setError(data.error || 'Failed to revoke API key')
      }
    } catch (error) {
      console.error('Error revoking API key:', error)
      setError('Failed to revoke API key. Please try again.')
    } finally {
      setIsRevoking(false)
    }
  }

  const copyApiKey = async () => {
    if (newApiKey) {
      await navigator.clipboard.writeText(newApiKey)
      setShowCopiedAlert(true)
      setTimeout(() => setShowCopiedAlert(false), 3000)
    }
  }

  const dismissNewKey = () => {
    setNewApiKey(null)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-600 mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const hasApiKey = profile?.api_key_hash

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
        <p className="text-gray-600 mt-2">
          Manage your Ginko API keys for development environment integration
        </p>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <div className="text-red-800">
            <strong>Error:</strong> {error}
          </div>
        </Alert>
      )}

      {showCopiedAlert && (
        <Alert className="border-green-200 bg-green-50">
          <div className="text-green-800">
            <strong>Success:</strong> API key copied to clipboard!
          </div>
        </Alert>
      )}

      {/* New API Key Display */}
      {newApiKey && (
        <Card className="p-6 border-green-200 bg-green-50">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-green-900">🎉 New API Key Generated!</h3>
            </div>
            <Alert className="border-amber-200 bg-amber-50">
              <div className="text-amber-800">
                <strong>⚠️ Important:</strong> Copy this key now. It won't be shown again for security reasons.
              </div>
            </Alert>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-green-900">Your New API Key</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newApiKey}
                  readOnly
                  className="flex-1 font-mono text-sm px-3 py-2 border border-green-300 rounded-md bg-white"
                />
                <Button
                  onClick={copyApiKey}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Copy Key
                </Button>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h4 className="font-medium text-blue-900 mb-2">🚀 Using Your API Key</h4>
              <div className="space-y-3 text-sm text-blue-800">
                <div>
                  <p className="font-medium mb-1">In your project's .mcp.json:</p>
                  <pre className="bg-blue-100 p-3 rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`{
  "mcpServers": {
    "ginko-mcp": {
      "command": "npx",
      "args": ["ginko-mcp-client"],
      "env": {
        "GINKO_MCP_SERVER_URL": "https://mcp.ginko.ai",
        "GINKO_API_KEY": "${newApiKey}",
        "GINKO_USER_ID": "${user?.id || 'YOUR_USER_ID'}",
        "GINKO_TEAM_ID": "auto",
        "GINKO_PROJECT_ID": "auto"
      }
    }
  }
}`}
                  </pre>
                </div>
                <div>
                  <p className="font-medium mb-1">Or as environment variable:</p>
                  <pre className="bg-blue-100 p-3 rounded text-xs font-mono overflow-x-auto">
export GINKO_API_KEY="${newApiKey}"
export GINKO_USER_ID="${user?.id || 'YOUR_USER_ID'}"
                  </pre>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button
                onClick={dismissNewKey}
                variant="outline"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                Dismiss this message
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* API Key Management */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="border-b border-gray-200 pb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              🔑 API Key Management
            </h2>
            <p className="text-gray-600 mt-1">
              Securely generate and manage your Ginko API keys
            </p>
          </div>

          {hasApiKey ? (
            <div className="space-y-4">
              {/* Current API Key Status */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm text-gray-600 font-medium">
                      🔐 Active API Key
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Prefix: {profile.api_key_prefix}...
                    </p>
                    {profile.api_key_created_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        Created: {new Date(profile.api_key_created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={generateApiKey}
                      disabled={isGenerating}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isGenerating ? 'Generating...' : 'Regenerate'}
                    </Button>
                    <Button
                      onClick={revokeApiKey}
                      disabled={isRevoking}
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      {isRevoking ? 'Revoking...' : 'Revoke'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <Alert className="border-blue-200 bg-blue-50">
                <div className="text-blue-800">
                  <strong>🔒 Security Note:</strong> Your API key is stored as a secure hash. 
                  If you lose your key, you'll need to regenerate a new one.
                </div>
              </Alert>

              {/* Legacy Key Warning */}
              {profile.api_key_prefix?.startsWith('cmcp_') && (
                <Alert className="border-amber-200 bg-amber-50">
                  <div className="text-amber-800">
                    <strong>⚠️ Legacy API Key Detected:</strong> Your key uses the old format. 
                    Click "Regenerate" to get an updated key with the new gk_ format and better security.
                  </div>
                </Alert>
              )}
            </div>
          ) : (
            /* No API Key State */
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🔑</div>
              <h3 className="font-medium text-gray-900 mb-2">No API Key Found</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Generate a secure API key to connect your development environment to Ginko. 
                The key will be generated using crypto.randomBytes for maximum security.
              </p>
              <Button 
                onClick={generateApiKey}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isGenerating ? 'Generating...' : '🔑 Generate API Key'}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* API Key Format Information */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">📋 API Key Format</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• <strong>Format:</strong> <code className="bg-gray-100 px-2 py-1 rounded">gk_[64-character-hex-string]</code></p>
            <p>• <strong>Security:</strong> Generated using crypto.randomBytes(32)</p>
            <p>• <strong>Storage:</strong> Only SHA256 hash stored in database (never plain text)</p>
            <p>• <strong>Prefix Display:</strong> Only first 12 characters shown for identification</p>
          </div>
        </div>
      </Card>

      {/* Quick Setup Guide */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">🚀 Quick Setup Guide</h3>
          <div className="space-y-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">1. Generate API Key</h4>
              <p className="text-gray-600">Click "Generate API Key" above to create your secure key.</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">2. Install MCP Client</h4>
              <pre className="bg-gray-200 p-2 rounded text-xs font-mono">npm install ginko-mcp-client</pre>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">3. Configure Environment</h4>
              <p className="text-gray-600">Add your API key to .mcp.json or environment variables as shown above.</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}