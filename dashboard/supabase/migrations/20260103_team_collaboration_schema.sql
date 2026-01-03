-- Migration: Team Collaboration Schema for EPIC-008
-- Purpose: Create teams, team_members, and team_invitations tables
-- Date: 2026-01-03
-- Sprint: EPIC-008 Sprint 1 - Team Collaboration Foundation

-- =============================================================================
-- TEAMS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL CHECK (length(name) >= 1),
  slug VARCHAR(100) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  description TEXT,
  graph_id TEXT,  -- Links team to Neo4j graph
  settings JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.teams IS 'Teams for collaboration on projects (EPIC-008)';
COMMENT ON COLUMN public.teams.graph_id IS 'The Neo4j graph ID this team is associated with';

-- =============================================================================
-- TEAM MEMBERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_sync_at TIMESTAMPTZ,  -- For staleness detection (EPIC-008)
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (team_id, user_id)
);

COMMENT ON TABLE public.team_members IS 'Team membership with role-based access (EPIC-008)';
COMMENT ON COLUMN public.team_members.role IS 'Access level: owner, admin, member, viewer';
COMMENT ON COLUMN public.team_members.last_sync_at IS 'Last time user synced project context';

-- =============================================================================
-- TEAM INVITATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(12) NOT NULL UNIQUE,  -- 12-char hex invite code
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.team_invitations IS 'Team invitation codes with expiry (EPIC-008)';
COMMENT ON COLUMN public.team_invitations.code IS 'Unique 12-character hex invite code';
COMMENT ON COLUMN public.team_invitations.status IS 'Invitation status: pending, accepted, expired, revoked';

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_teams_slug ON public.teams(slug);
CREATE INDEX IF NOT EXISTS idx_teams_graph_id ON public.teams(graph_id);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON public.teams(created_by);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON public.team_members(team_id, role);
CREATE INDEX IF NOT EXISTS idx_team_members_last_sync ON public.team_members(last_sync_at);

CREATE INDEX IF NOT EXISTS idx_team_invitations_code ON public.team_invitations(code);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team ON public.team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON public.team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires ON public.team_invitations(expires_at);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Users can view own teams" ON public.teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create teams" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Team owners can update teams" ON public.teams
  FOR UPDATE USING (
    id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Team owners can delete teams" ON public.teams
  FOR DELETE USING (
    id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- Team members policies
CREATE POLICY "Team members can view membership" ON public.team_members
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Team owners/admins can add members" ON public.team_members
  FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "Team owners/admins can update members" ON public.team_members
  FOR UPDATE USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "Team owners/admins can remove members" ON public.team_members
  FOR DELETE USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Team invitations policies
CREATE POLICY "Team owners/admins can view invitations" ON public.team_invitations
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "Team owners/admins can create invitations" ON public.team_invitations
  FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "Team owners/admins can update invitations" ON public.team_invitations
  FOR UPDATE USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "Team owners/admins can delete invitations" ON public.team_invitations
  FOR DELETE USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- =============================================================================
-- HELPER FUNCTION: Create team with owner
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_team_with_owner(
  team_name VARCHAR(255),
  team_slug VARCHAR(100),
  team_description TEXT DEFAULT NULL,
  team_graph_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_team_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to create team';
  END IF;

  INSERT INTO public.teams (name, slug, description, graph_id, created_by)
  VALUES (team_name, team_slug, team_description, team_graph_id, current_user_id)
  RETURNING id INTO new_team_id;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (new_team_id, current_user_id, 'owner');

  RETURN new_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_team_with_owner IS 'Create team and add creator as owner (EPIC-008)';

-- =============================================================================
-- TRIGGER: Auto-update updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'EPIC-008 Team Collaboration schema migration complete';
END $$;
