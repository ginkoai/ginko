#!/usr/bin/env node

/**
 * Create test users in Supabase auth for MCP server testing
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const testUsers = [
  {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'e2e-test@ginko.ai',
    password: 'test-password-123',
    email_confirm: true,
    user_metadata: {
      full_name: 'E2E Test User',
      role: 'test'
    }
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'dev@localhost',
    password: 'dev-password-123', 
    email_confirm: true,
    user_metadata: {
      full_name: 'Development User',
      role: 'developer'
    }
  }
]

async function createTestUsers() {
  console.log('Creating test users in Supabase auth...')
  
  for (const userData of testUsers) {
    try {
      console.log(`Creating user: ${userData.email} (${userData.id})`)
      
      const { data, error } = await supabase.auth.admin.createUser({
        user_id: userData.id,
        email: userData.email,
        password: userData.password,
        email_confirm: userData.email_confirm,
        user_metadata: userData.user_metadata
      })
      
      if (error) {
        if (error.message.includes('already exists')) {
          console.log(`✓ User ${userData.email} already exists`)
        } else {
          console.error(`✗ Error creating ${userData.email}:`, error.message)
        }
      } else {
        console.log(`✓ Created user ${userData.email} successfully`)
      }
      
    } catch (error) {
      console.error(`✗ Failed to create ${userData.email}:`, error.message)
    }
  }
  
  // Verify users exist
  console.log('\nVerifying users exist...')
  
  for (const userData of testUsers) {
    try {
      const { data: user, error } = await supabase.auth.admin.getUserById(userData.id)
      
      if (error) {
        console.error(`✗ User ${userData.email} not found:`, error.message)
      } else {
        console.log(`✓ User ${userData.email} exists and is verified`)
      }
    } catch (error) {
      console.error(`✗ Error verifying ${userData.email}:`, error.message)
    }
  }
  
  console.log('\nTest user creation complete!')
}

createTestUsers().catch(console.error)