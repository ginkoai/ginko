/**
 * @fileType: page
 * @status: current
 * @updated: 2025-12-10
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
import {
  KeyIcon,
  ClipboardDocumentIcon,
  ShieldCheckIcon,
  RocketLaunchIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

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
        console.log('[API_KEYS] Loading user data')
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        console.log('[API_KEYS] User loaded:', user ? user.id : 'none', 'Error:', userError?.message)
        setUser(user)

        if (user) {
          console.log('[API_KEYS] Fetching user profile')
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          console.log('[API_KEYS] Profile loaded:', !!profile, 'Error:', profileError?.message)
          setProfile(profile)
        }
      } catch (error) {
        console.error('[API_KEYS] Error loading user data:', error)
        setError('Failed to load user data')
      } finally {
        console.log('[API_KEYS] Loading complete')
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
          <h1 className="text-3xl font-bold text-foreground">API Keys</h1>
          <p className="text-muted-foreground mt-2">Loading...</p>
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
        <h1 className="text-3xl font-bold text-foreground">API Keys</h1>
        <p className="text-muted-foreground mt-2">
          Manage your Ginko API keys for development environment integration
        </p>
      </div>

      {error && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <div className="flex items-center gap-2 text-foreground">
            <XCircleIcon className="h-5 w-5 text-destructive" />
            <span><strong>Error:</strong> {error}</span>
          </div>
        </Alert>
      )}

      {showCopiedAlert && (
        <Alert className="border-primary/50 bg-primary/10">
          <div className="flex items-center gap-2 text-foreground">
            <CheckCircleIcon className="h-5 w-5 text-primary" />
            <span><strong>Success:</strong> API key copied to clipboard!</span>
          </div>
        </Alert>
      )}

      {/* New API Key Display */}
      {newApiKey && (
        <Card className="p-6 border-primary/50 bg-primary/10">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-6 w-6 text-primary" />
              <h3 className="font-semibold text-foreground">New API Key Generated!</h3>
            </div>
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <div className="flex items-center gap-2 text-foreground">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                <span><strong>Important:</strong> Copy this key now. It won&apos;t be shown again for security reasons.</span>
              </div>
            </Alert>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Your New API Key</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newApiKey}
                  readOnly
                  className="flex-1 font-mono text-sm px-3 py-2 border border-border rounded-md bg-card text-foreground"
                />
                <Button
                  onClick={copyApiKey}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
                  Copy Key
                </Button>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <RocketLaunchIcon className="h-5 w-5 text-primary" />
                Using Your API Key
              </h4>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium mb-1 text-foreground">In your project&apos;s .mcp.json:</p>
                  <div className="terminal">
                    <div className="terminal-body py-3 text-xs">
                      <pre className="whitespace-pre-wrap">{`{
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
}`}</pre>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="font-medium mb-1 text-foreground">Or as environment variable:</p>
                  <div className="terminal">
                    <div className="terminal-body py-3 text-xs">
                      <pre>{`export GINKO_API_KEY="${newApiKey}"
export GINKO_USER_ID="${user?.id || 'YOUR_USER_ID'}"`}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={dismissNewKey}
                variant="outline"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                Dismiss this message
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* API Key Management */}
      <Card className="p-6 bg-card border-border">
        <div className="space-y-4">
          <div className="border-b border-border pb-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <KeyIcon className="h-5 w-5 text-primary" />
              API Key Management
            </h2>
            <p className="text-muted-foreground mt-1">
              Securely generate and manage your Ginko API keys
            </p>
          </div>

          {hasApiKey ? (
            <div className="space-y-4">
              {/* Current API Key Status */}
              <div className="bg-secondary border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm text-foreground font-medium flex items-center gap-2">
                      <ShieldCheckIcon className="h-4 w-4 text-primary" />
                      Active API Key
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Prefix: {profile.api_key_prefix}...
                    </p>
                    {profile.api_key_created_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Created: {new Date(profile.api_key_created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={generateApiKey}
                      disabled={isGenerating}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {isGenerating ? 'Generating...' : 'Regenerate'}
                    </Button>
                    <Button
                      onClick={revokeApiKey}
                      disabled={isRevoking}
                      variant="outline"
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                    >
                      {isRevoking ? 'Revoking...' : 'Revoke'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <Alert className="border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheckIcon className="h-5 w-5 text-primary" />
                  <span><strong className="text-foreground">Security Note:</strong> Your API key is stored as a secure hash.
                  If you lose your key, you&apos;ll need to regenerate a new one.</span>
                </div>
              </Alert>

              {/* Legacy Key Warning */}
              {profile.api_key_prefix?.startsWith('cmcp_') && (
                <Alert className="border-yellow-500/50 bg-yellow-500/10">
                  <div className="flex items-center gap-2 text-foreground">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                    <span><strong>Legacy API Key Detected:</strong> Your key uses the old format.
                    Click &quot;Regenerate&quot; to get an updated key with the new gk_ format and better security.</span>
                  </div>
                </Alert>
              )}
            </div>
          ) : (
            /* No API Key State */
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <KeyIcon className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="font-medium text-foreground mb-2">No API Key Found</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Generate a secure API key to connect your development environment to Ginko.
                The key will be generated using crypto.randomBytes for maximum security.
              </p>
              <Button
                onClick={generateApiKey}
                disabled={isGenerating}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <KeyIcon className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate API Key'}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* API Key Format Information */}
      <Card className="p-6 bg-card border-border">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <InformationCircleIcon className="h-5 w-5 text-primary" />
            API Key Format
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• <strong className="text-foreground">Format:</strong> <code className="bg-secondary px-2 py-1 rounded text-foreground">gk_[64-character-hex-string]</code></p>
            <p>• <strong className="text-foreground">Security:</strong> Generated using crypto.randomBytes(32)</p>
            <p>• <strong className="text-foreground">Storage:</strong> Only SHA256 hash stored in database (never plain text)</p>
            <p>• <strong className="text-foreground">Prefix Display:</strong> Only first 12 characters shown for identification</p>
          </div>
        </div>
      </Card>

      {/* Quick Setup Guide */}
      <Card className="p-6 bg-card border-border">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <RocketLaunchIcon className="h-5 w-5 text-primary" />
            Quick Setup Guide
          </h3>
          <div className="space-y-3 text-sm">
            <div className="bg-secondary rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">1. Generate API Key</h4>
              <p className="text-muted-foreground">Click &quot;Generate API Key&quot; above to create your secure key.</p>
            </div>
            <div className="bg-secondary rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">2. Install MCP Client</h4>
              <div className="terminal">
                <div className="terminal-body py-2 text-xs">npm install ginko-mcp-client</div>
              </div>
            </div>
            <div className="bg-secondary rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">3. Configure Environment</h4>
              <p className="text-muted-foreground">Add your API key to .mcp.json or environment variables as shown above.</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
