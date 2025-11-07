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
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
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
      
      {/* API Key Section - Redirect to dedicated page */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            🔑 API Key Management
          </h2>
          <p className="text-gray-600 mt-1">
            Manage your Ginko API keys for development environment integration
          </p>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🔑</div>
            <h3 className="font-medium text-gray-900 mb-2">API Key Management</h3>
            <p className="text-gray-500 mb-6">
              Generate, view, and manage your API keys in the dedicated API keys section
            </p>
            <div className="space-x-3">
              <button
                onClick={() => router.push('/dashboard/settings/api-keys')}
                className="inline-flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                🔑 Manage API Keys
              </button>
            </div>
          </div>
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