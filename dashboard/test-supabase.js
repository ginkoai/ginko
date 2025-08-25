// Quick test of Supabase connection
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fmmqrtzmfxmgrtguyzeh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtbXFydHptZnhtZ3J0Z3V5emVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMDI0NTgsImV4cCI6MjA2OTU3ODQ1OH0.U5mmUxyJ2MsehDYnfXSwXsH9JocCbSmUbcn4e2pHtmI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1)
      
    console.log('Supabase connection test:', { data, error })
    
    // Test auth status
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Auth test:', { user: user?.email || 'not logged in', authError })
    
  } catch (err) {
    console.error('Test failed:', err)
  }
}

test()