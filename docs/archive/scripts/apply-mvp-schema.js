// Apply MVP schema to production Supabase database
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = 'https://fmmqrtzmfxmgrtguyzeh.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtbXFydHptZnhtZ3J0Z3V5emVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDAwMjQ1OCwiZXhwIjoyMDY5NTc4NDU4fQ.qSX9wNHdf9oG-yL4L2dYgucmu0CTalluDlp_0IqRkdg'

async function applyMvpSchema() {
  const supabase = createClient(supabaseUrl, serviceRoleKey)
  
  try {
    console.log('🔄 Applying MVP schema to production database...')
    
    // First, check current user_profiles table structure
    console.log('📊 Checking current user_profiles structure...')
    const { data: currentStructure, error: structureError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1)
      
    if (structureError && !structureError.message.includes('relation "public.user_profiles" does not exist')) {
      console.error('Error checking structure:', structureError)
    }
    
    if (currentStructure && currentStructure.length > 0) {
      console.log('✅ user_profiles table exists')
      console.log('Current columns:', Object.keys(currentStructure[0]))
    } else {
      console.log('⚠️  user_profiles table does not exist or is empty')
    }
    
    // Read the MVP schema
    const mvpSchema = readFileSync('./database/mvp-schema.sql', 'utf8')
    
    console.log('📝 MVP schema loaded, size:', mvpSchema.length, 'characters')
    console.log('❌ Cannot apply schema directly via JavaScript client')
    console.log('📋 Manual application required:')
    console.log('1. Go to https://supabase.com/dashboard/project/fmmqrtzmfxmgrtguyzeh/sql')
    console.log('2. Copy the contents of database/mvp-schema.sql')
    console.log('3. Run the SQL in the editor')
    console.log('4. This will create/update the user_profiles table with api_key_hash column')
    
    console.log('\n🔍 Key columns that need to be added to user_profiles:')
    console.log('- api_key_hash TEXT UNIQUE NOT NULL')
    console.log('- api_key_prefix TEXT NOT NULL')
    console.log('- api_key_created_at TIMESTAMPTZ DEFAULT NOW()')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.code === 'ENOENT') {
      console.log('📁 Please run this from the ginko root directory')
    }
  }
}

applyMvpSchema()