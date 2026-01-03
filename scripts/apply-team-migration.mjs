/**
 * Apply team collaboration migration to Supabase
 * Run: node scripts/apply-team-migration.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://zkljpiubcaszelgilifo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprbGpwaXViY2FzemVsZ2lsaWZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjEzNDY3NiwiZXhwIjoyMDcxNzEwNjc2fQ.5aNwuTpVvoDn9S63Nn5pM1NrPkUP-s74lgJuuxvhc-w';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

async function runMigration() {
  console.log('🚀 Applying team collaboration migration...\n');

  // Read migration file
  const migrationPath = join(__dirname, '../dashboard/supabase/migrations/20260103_team_collaboration_schema.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf8');

  // Split by statement (simplistic - works for our migration)
  // We need to handle this carefully since Supabase doesn't support multi-statement SQL via REST

  // Instead, let's execute key parts individually
  const statements = [
    // Teams table
    `CREATE TABLE IF NOT EXISTS public.teams (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL CHECK (length(name) >= 1),
      slug VARCHAR(100) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
      description TEXT,
      graph_id TEXT,
      settings JSONB DEFAULT '{}',
      created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Team members table
    `CREATE TABLE IF NOT EXISTS public.team_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
      invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      last_sync_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (team_id, user_id)
    )`,

    // Team invitations table
    `CREATE TABLE IF NOT EXISTS public.team_invitations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(12) NOT NULL UNIQUE,
      team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
      expires_at TIMESTAMPTZ NOT NULL,
      inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      accepted_at TIMESTAMPTZ,
      accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_teams_slug ON public.teams(slug)`,
    `CREATE INDEX IF NOT EXISTS idx_teams_graph_id ON public.teams(graph_id)`,
    `CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id)`,
    `CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_team_invitations_code ON public.team_invitations(code)`,
    `CREATE INDEX IF NOT EXISTS idx_team_invitations_team ON public.team_invitations(team_id)`,
    `CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(email)`,

    // Enable RLS
    `ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY`,
  ];

  // RLS Policies - need special handling
  const policies = [
    // Teams policies
    {
      name: 'Users can view own teams',
      table: 'teams',
      operation: 'SELECT',
      check: `id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())`
    },
    {
      name: 'Authenticated users can create teams',
      table: 'teams',
      operation: 'INSERT',
      check: `auth.uid() IS NOT NULL`,
      isCheck: true
    },
    {
      name: 'Team owners can update teams',
      table: 'teams',
      operation: 'UPDATE',
      check: `id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role = 'owner')`
    },
    {
      name: 'Team owners can delete teams',
      table: 'teams',
      operation: 'DELETE',
      check: `id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role = 'owner')`
    },
    // Team members policies
    {
      name: 'Team members can view membership',
      table: 'team_members',
      operation: 'SELECT',
      check: `team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())`
    },
    {
      name: 'Team owners admins can add members',
      table: 'team_members',
      operation: 'INSERT',
      check: `team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))`,
      isCheck: true
    },
    {
      name: 'Team owners admins can update members',
      table: 'team_members',
      operation: 'UPDATE',
      check: `team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))`
    },
    {
      name: 'Team owners admins can remove members',
      table: 'team_members',
      operation: 'DELETE',
      check: `team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))`
    },
    // Team invitations policies
    {
      name: 'Team owners admins can view invitations',
      table: 'team_invitations',
      operation: 'SELECT',
      check: `team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))`
    },
    {
      name: 'Team owners admins can create invitations',
      table: 'team_invitations',
      operation: 'INSERT',
      check: `team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))`,
      isCheck: true
    },
    {
      name: 'Team owners admins can update invitations',
      table: 'team_invitations',
      operation: 'UPDATE',
      check: `team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))`
    },
    {
      name: 'Team owners admins can delete invitations',
      table: 'team_invitations',
      operation: 'DELETE',
      check: `team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))`
    },
  ];

  // Execute table creation and indexes
  for (const sql of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      if (error) {
        // If exec_sql doesn't exist, we need another approach
        if (error.message.includes('exec_sql')) {
          console.log('⚠️  exec_sql not available, need to use Supabase Dashboard SQL Editor');
          console.log('\n📋 Copy the migration SQL and run it in the Supabase Dashboard:');
          console.log('   https://supabase.com/dashboard/project/zkljpiubcaszelgilifo/sql');
          console.log('\n📄 Migration file: dashboard/supabase/migrations/20260103_team_collaboration_schema.sql');
          process.exit(1);
        }
        console.error(`❌ Error executing: ${sql.substring(0, 50)}...`);
        console.error(error.message);
      } else {
        console.log(`✅ ${sql.substring(0, 60)}...`);
      }
    } catch (err) {
      console.error(`❌ Exception: ${err.message}`);
    }
  }

  console.log('\n✅ Migration complete!');
}

// Check if tables exist first
async function checkTables() {
  console.log('📊 Checking existing tables...\n');

  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select('id')
    .limit(1);

  if (teamsErr && teamsErr.message.includes('does not exist')) {
    console.log('❌ teams table does not exist');
    return false;
  } else if (!teamsErr) {
    console.log('✅ teams table exists');
  }

  const { data: members, error: membersErr } = await supabase
    .from('team_members')
    .select('id')
    .limit(1);

  if (membersErr && membersErr.message.includes('does not exist')) {
    console.log('❌ team_members table does not exist');
    return false;
  } else if (!membersErr) {
    console.log('✅ team_members table exists');
  }

  const { data: invites, error: invitesErr } = await supabase
    .from('team_invitations')
    .select('id')
    .limit(1);

  if (invitesErr && invitesErr.message.includes('does not exist')) {
    console.log('❌ team_invitations table does not exist');
    return false;
  } else if (!invitesErr) {
    console.log('✅ team_invitations table exists');
  }

  return true;
}

async function main() {
  const tablesExist = await checkTables();

  if (tablesExist) {
    console.log('\n✅ All tables already exist!');
    return;
  }

  console.log('\n⚠️  Some tables missing. Need to run migration.');
  console.log('\n📋 Please run the migration SQL in the Supabase Dashboard SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/zkljpiubcaszelgilifo/sql/new');
  console.log('\n📄 Migration file: dashboard/supabase/migrations/20260103_team_collaboration_schema.sql');
}

main().catch(console.error);
