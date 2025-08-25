/**
 * @fileType: page
 * @status: new
 * @updated: 2025-08-05
 * @tags: [dashboard, settings, api-key, react, nextjs]
 * @related: [dashboard/page.tsx, server.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [next, supabase-ssr]
 */

'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

interface UserProfile {
  api_key_hash?: string
  api_key_prefix?: string
  api_key_created_at?: string
  github_username?: string
  subscription_tier?: string
  // Temporary storage for the actual key (only available after generation)
  temp_api_key?: string
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
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
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [supabase])

  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const generateApiKey = async () => {
    try {
      setIsGenerating(true)
      const response = await fetch('/api/generate-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const data = await response.json()
        // Store the actual key temporarily for display
        setNewApiKey(data.api_key)
        // Update profile with hash info (actual key is never stored in profile)
        setProfile(prev => ({
          ...prev,
          api_key_hash: 'stored', // Just indicate it exists
          api_key_prefix: data.api_key.substring(0, 20) + '...', // Show prefix only
          api_key_created_at: data.created_at
        }))
        // Reload profile data after a delay to get the actual DB state
        setTimeout(async () => {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: updatedProfile } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', user.id)
              .single()
            setProfile(updatedProfile)
          }
        }, 1000)
      } else {
        alert('Failed to generate API key. Please try again.')
      }
    } catch (error) {
      console.error('Error generating API key:', error)
      alert('Failed to generate API key. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyApiKey = async () => {
    if (newApiKey) {
      await navigator.clipboard.writeText(newApiKey)
      alert('✅ API key copied to clipboard!')
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your Ginko account and API configuration
        </p>
      </div>
      
      {/* API Key Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            🔑 API Key
          </h2>
          <p className="text-gray-600 mt-1">
            Use this API key to connect your development environment to Ginko
          </p>
        </div>
        <div className="p-6 space-y-4">
          {newApiKey ? (
            // Show the newly generated API key with security warning
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">🎉 New API Key Generated!</h3>
                <p className="text-sm text-green-800 mb-3">
                  <strong>⚠️ Important:</strong> Copy this key now. It won't be shown again for security reasons.
                </p>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-green-900">Your New API Key</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newApiKey}
                      readOnly
                      className="flex-1 font-mono text-sm px-3 py-2 border border-green-300 rounded-md bg-white"
                    />
                    <button
                      onClick={copyApiKey}
                      className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      📋 Copy Key
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">🚀 Using Your API Key</h4>
                <div className="space-y-3 text-sm text-blue-800">
                  <div>
                    <p className="font-medium mb-1">In your project's .mcp.json:</p>
                    <pre className="bg-blue-100 p-3 rounded text-xs font-mono overflow-x-auto">
{`{
  "mcpServers": {
    "ginko-mcp": {
      "command": "npx",
      "args": ["ginko-mcp-client"],
      "env": {
        "GINKO_MCP_SERVER_URL": "https://mcp.ginko.ai",
        "GINKO_API_KEY": "YOUR_GINKO_API_KEY",
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
export GINKO_API_KEY="YOUR_GINKO_API_KEY"
export GINKO_USER_ID="${user?.id || 'YOUR_USER_ID'}"
                    </pre>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setNewApiKey(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Dismiss this message
              </button>
            </div>
          ) : profile?.api_key_hash ? (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">API Key Status</label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-sm text-gray-600">
                        🔐 Active API Key (prefix: {profile.api_key_prefix || 'wmcp_sk_test_...'})
                      </p>
                      {profile.api_key_created_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Created: {new Date(profile.api_key_created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={generateApiKey}
                      disabled={isGenerating}
                      className="px-4 py-2 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? '⏳ Generating...' : '🔄 Regenerate'}
                    </button>
                  </div>
                </div>
                {profile.api_key_prefix?.startsWith('cmcp_') && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                    <p className="text-sm text-yellow-800">
                      ⚠️ <strong>Legacy API Key Detected</strong> - Your key uses the old format. Click "🔄 Regenerate" to get an updated key with better security.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">🚀 Using Your API Key</h4>
                <div className="space-y-3 text-sm text-blue-800">
                  <div>
                    <p className="font-medium mb-1">In your project's .mcp.json:</p>
                    <pre className="bg-blue-100 p-3 rounded text-xs font-mono overflow-x-auto">
{`{
  "mcpServers": {
    "ginko-mcp": {
      "command": "npx",
      "args": ["ginko-mcp-client"],
      "env": {
        "GINKO_MCP_SERVER_URL": "https://mcp.ginko.ai",
        "GINKO_API_KEY": "YOUR_GINKO_API_KEY",
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
export GINKO_API_KEY="YOUR_GINKO_API_KEY"
export GINKO_USER_ID="${user?.id || 'YOUR_USER_ID'}"
                    </pre>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🔑</div>
              <h3 className="font-medium text-gray-900 mb-2">No API Key Found</h3>
              <p className="text-gray-500 mb-4">
                Generate an API key to connect your development environment to Ginko
              </p>
              <div className="space-x-3">
                <button 
                  onClick={generateApiKey}
                  disabled={isGenerating}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? '⏳ Generating...' : '🔑 Generate API Key'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Account Information */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            👤 Account Information
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="text-sm text-gray-900 mt-1">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="text-sm text-gray-900 mt-1">
                {user.user_metadata?.full_name || user.user_metadata?.name || 'Not set'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">GitHub Username</label>
              <p className="text-sm text-gray-900 mt-1">
                {profile?.github_username || 'Not linked'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Subscription</label>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 mt-1">
                {profile?.subscription_tier || 'Free'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            ⚡ Quick Actions
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Create New Project</h4>
              <p className="text-sm text-gray-500">
                Use our installer to set up a new project with Ginko
              </p>
            </div>
            <div className="text-sm font-mono bg-gray-200 px-3 py-2 rounded">
              npx create-ginko-project
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}