-- Migration 003: Multi-Tenancy Schema
-- Adds teams, team_members, project_members, and project_teams tables
-- Updates projects table with visibility and discovery features
-- Created: 2025-10-29
-- For: TASK-020 Multi-Tenancy Database Schema

-- =============================================================================
-- TEAMS
-- =============================================================================

/**
 * Teams - Collaboration units for organizing users and projects
 * Design Decision: Skip organizations table for MVP, start with teams as top-level entity
 * Rationale: TASK-020 doesn't require org-level multi-tenancy, teams provide sufficient isolation
 */
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL CHECK (length(name) >= 1),
  slug VARCHAR(100) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  description TEXT,
  settings JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.teams IS 'Top-level collaboration units containing users and projects';
COMMENT ON COLUMN public.teams.slug IS 'URL-friendly unique identifier (lowercase, hyphens only)';
COMMENT ON COLUMN public.teams.created_by IS 'User who created this team (nullable if user deleted)';

/**
 * Team Members - User membership in teams with role-based access
 * Roles: owner (full control), admin (manage projects), member (contribute), viewer (read-only)
 */
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ,

  -- Ensure unique membership per user per team
  UNIQUE (team_id, user_id)
);

COMMENT ON TABLE public.team_members IS 'User membership in teams with role-based permissions';
COMMENT ON COLUMN public.team_members.role IS 'Access level: owner (full control), admin (manage projects), member (contribute), viewer (read-only)';
COMMENT ON COLUMN public.team_members.permissions IS 'Optional fine-grained permissions (future use)';

-- Constraint: Every team must have at least one owner
CREATE OR REPLACE FUNCTION public.check_team_has_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.role != 'owner')) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = COALESCE(OLD.team_id, NEW.team_id)
      AND role = 'owner'
      AND id != OLD.id
    ) THEN
      RAISE EXCEPTION 'Cannot remove last owner from team';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_team_has_owner
  BEFORE UPDATE OR DELETE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.check_team_has_owner();

-- =============================================================================
-- PROJECTS (Updates to existing table)
-- =============================================================================

/**
 * Projects table already exists from migration 002_create_project_contexts.sql
 * We're adding new columns for multi-tenancy features:
 * - visibility: public/private access control
 * - github_repo_id: GitHub repository identifier for sync
 * - discoverable: whether project appears in public directory
 * - created_by: track project creator
 */

DO $$
BEGIN
  -- Add visibility column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'projects' AND column_name = 'visibility') THEN
    ALTER TABLE public.projects
      ADD COLUMN visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('public', 'private'));
    COMMENT ON COLUMN public.projects.visibility IS 'Access control: public (anyone can read), private (members only)';
  END IF;

  -- Add github_repo_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'projects' AND column_name = 'github_repo_id') THEN
    ALTER TABLE public.projects
      ADD COLUMN github_repo_id INTEGER;
    COMMENT ON COLUMN public.projects.github_repo_id IS 'GitHub repository ID for webhook integration and sync';
  END IF;

  -- Add discoverable column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'projects' AND column_name = 'discoverable') THEN
    ALTER TABLE public.projects
      ADD COLUMN discoverable BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN public.projects.discoverable IS 'Whether project appears in public discovery/search (requires visibility=public)';
  END IF;

  -- Add created_by column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'projects' AND column_name = 'created_by') THEN
    ALTER TABLE public.projects
      ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    COMMENT ON COLUMN public.projects.created_by IS 'User who created this project (nullable if user deleted)';
  END IF;

  -- Add description column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'projects' AND column_name = 'description') THEN
    ALTER TABLE public.projects
      ADD COLUMN description TEXT;
    COMMENT ON COLUMN public.projects.description IS 'Project description for discovery and documentation';
  END IF;
END $$;

-- Constraint: Discoverable projects must be public
ALTER TABLE public.projects
  ADD CONSTRAINT discoverable_requires_public
  CHECK (NOT discoverable OR visibility = 'public');

-- =============================================================================
-- PROJECT MEMBERS
-- =============================================================================

/**
 * Project Members - Individual user access to specific projects
 * Provides fine-grained access control beyond team membership
 * Roles: owner (full control), member (contribute)
 */
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Ensure unique membership per user per project
  UNIQUE (project_id, user_id)
);

COMMENT ON TABLE public.project_members IS 'Individual user access to projects with role-based permissions';
COMMENT ON COLUMN public.project_members.role IS 'Access level: owner (full control), member (contribute)';
COMMENT ON COLUMN public.project_members.granted_by IS 'User who granted this access (audit trail)';

-- Constraint: Every project must have at least one owner
CREATE OR REPLACE FUNCTION public.check_project_has_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.role != 'owner')) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = COALESCE(OLD.project_id, NEW.project_id)
      AND role = 'owner'
      AND id != OLD.id
    ) THEN
      RAISE EXCEPTION 'Cannot remove last owner from project';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_project_has_owner
  BEFORE UPDATE OR DELETE ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public.check_project_has_owner();

-- =============================================================================
-- PROJECT TEAMS
-- =============================================================================

/**
 * Project Teams - Grant entire teams access to projects
 * Enables team-based collaboration without individual grants
 * Access is additive: team access + individual project_member access
 */
CREATE TABLE IF NOT EXISTS public.project_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Ensure unique grant per team per project
  UNIQUE (project_id, team_id)
);

COMMENT ON TABLE public.project_teams IS 'Grant entire teams access to projects (all team members inherit access)';
COMMENT ON COLUMN public.project_teams.granted_by IS 'User who granted team access (audit trail)';

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Teams indexes
CREATE INDEX IF NOT EXISTS idx_teams_slug ON public.teams(slug);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON public.teams(created_by);

-- Team members indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON public.team_members(team_id, role);

-- Projects indexes (new columns)
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON public.projects(visibility);
CREATE INDEX IF NOT EXISTS idx_projects_github_repo ON public.projects(github_repo_id);
CREATE INDEX IF NOT EXISTS idx_projects_discoverable ON public.projects(discoverable) WHERE discoverable = TRUE;
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);

-- Project members indexes
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON public.project_members(project_id, role);

-- Project teams indexes
CREATE INDEX IF NOT EXISTS idx_project_teams_project ON public.project_teams(project_id);
CREATE INDEX IF NOT EXISTS idx_project_teams_team ON public.project_teams(team_id);

COMMENT ON INDEX idx_projects_discoverable IS 'Partial index for efficient public project discovery queries';

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;  -- May already be enabled
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_teams ENABLE ROW LEVEL SECURITY;

-- ----------------
-- TEAMS POLICIES
-- ----------------

/**
 * Users can view teams they're members of
 */
CREATE POLICY "Users can view own teams" ON public.teams
  FOR SELECT
  USING (
    id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

/**
 * Team owners can update their teams
 */
CREATE POLICY "Team owners can update teams" ON public.teams
  FOR UPDATE
  USING (
    id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

/**
 * Authenticated users can create teams (and become owner automatically)
 */
CREATE POLICY "Authenticated users can create teams" ON public.teams
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

/**
 * Team owners can delete their teams
 */
CREATE POLICY "Team owners can delete teams" ON public.teams
  FOR DELETE
  USING (
    id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ----------------
-- TEAM MEMBERS POLICIES
-- ----------------

/**
 * Team members can view other members of their teams
 */
CREATE POLICY "Team members can view team membership" ON public.team_members
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

/**
 * Team owners and admins can add members
 */
CREATE POLICY "Team owners/admins can add members" ON public.team_members
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

/**
 * Team owners and admins can update member roles (except their own ownership)
 */
CREATE POLICY "Team owners/admins can update members" ON public.team_members
  FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    -- Prevent owners from demoting themselves
    AND NOT (user_id = auth.uid() AND role = 'owner')
  );

/**
 * Team owners and admins can remove members (except last owner)
 */
CREATE POLICY "Team owners/admins can remove members" ON public.team_members
  FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ----------------
-- PROJECTS POLICIES
-- ----------------

/**
 * Users can view:
 * - Public projects
 * - Projects they're members of
 * - Projects their teams have access to
 */
CREATE POLICY "Users can view accessible projects" ON public.projects
  FOR SELECT
  USING (
    visibility = 'public'
    OR id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid()
    )
    OR id IN (
      SELECT pt.project_id FROM public.project_teams pt
      WHERE pt.team_id IN (
        SELECT team_id FROM public.team_members
        WHERE user_id = auth.uid()
      )
    )
  );

/**
 * Project owners can update their projects
 */
CREATE POLICY "Project owners can update projects" ON public.projects
  FOR UPDATE
  USING (
    id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

/**
 * Team owners and admins can create projects in their teams
 */
CREATE POLICY "Team owners/admins can create projects" ON public.projects
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

/**
 * Project owners can delete projects
 */
CREATE POLICY "Project owners can delete projects" ON public.projects
  FOR DELETE
  USING (
    id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ----------------
-- PROJECT MEMBERS POLICIES
-- ----------------

/**
 * Project members can view other project members
 */
CREATE POLICY "Project members can view membership" ON public.project_members
  FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid()
    )
  );

/**
 * Project owners can add/remove members
 */
CREATE POLICY "Project owners can manage members" ON public.project_members
  FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ----------------
-- PROJECT TEAMS POLICIES
-- ----------------

/**
 * Team members can view which projects their teams have access to
 */
CREATE POLICY "Team members can view project access" ON public.project_teams
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members
      WHERE user_id = auth.uid()
    )
  );

/**
 * Project owners can grant team access
 */
CREATE POLICY "Project owners can grant team access" ON public.project_teams
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

/**
 * Project owners can revoke team access
 */
CREATE POLICY "Project owners can revoke team access" ON public.project_teams
  FOR DELETE
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

/**
 * Trigger to update updated_at timestamp on teams table
 */
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER update_teams_updated_at ON public.teams IS 'Auto-update updated_at timestamp on team modifications';

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

/**
 * Create a new team and make the creator an owner
 * Usage: SELECT create_team('My Team', 'my-team', 'Optional description');
 */
CREATE OR REPLACE FUNCTION public.create_team(
  team_name VARCHAR(255),
  team_slug VARCHAR(100),
  team_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_team_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to create team';
  END IF;

  -- Create team
  INSERT INTO public.teams (name, slug, description, created_by)
  VALUES (team_name, team_slug, team_description, current_user_id)
  RETURNING id INTO new_team_id;

  -- Add creator as owner
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (new_team_id, current_user_id, 'owner');

  RETURN new_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_team IS 'Create a new team and automatically add the creator as owner';

/**
 * Create a new project and make the creator an owner
 * Usage: SELECT create_project('team-id', 'My Project', 'my-project', 'Description', 'private');
 */
CREATE OR REPLACE FUNCTION public.create_project(
  p_team_id UUID,
  p_name VARCHAR(255),
  p_slug VARCHAR(100),
  p_description TEXT DEFAULT NULL,
  p_visibility VARCHAR(20) DEFAULT 'private'
)
RETURNS UUID AS $$
DECLARE
  new_project_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to create project';
  END IF;

  -- Verify user is team owner or admin
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id
    AND user_id = current_user_id
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Must be team owner or admin to create project';
  END IF;

  -- Create project
  INSERT INTO public.projects (team_id, name, slug, description, visibility, created_by)
  VALUES (p_team_id, p_name, p_slug, p_description, p_visibility, current_user_id)
  RETURNING id INTO new_project_id;

  -- Add creator as project owner
  INSERT INTO public.project_members (project_id, user_id, role, granted_by)
  VALUES (new_project_id, current_user_id, 'owner', current_user_id);

  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_project IS 'Create a new project and automatically add the creator as owner';

-- =============================================================================
-- DATA MIGRATION
-- =============================================================================

/**
 * For existing projects without team_id, create a default "Personal" team
 * for each user_profile and assign their projects to it.
 * This ensures smooth migration from MVP schema to multi-tenancy.
 */
DO $$
DECLARE
  user_record RECORD;
  default_team_id UUID;
  project_record RECORD;
BEGIN
  -- For each user in user_profiles
  FOR user_record IN SELECT id, email FROM public.user_profiles LOOP
    -- Check if user already has a team
    IF NOT EXISTS (
      SELECT 1 FROM public.team_members WHERE user_id = user_record.id
    ) THEN
      -- Create a default "Personal" team for this user
      INSERT INTO public.teams (name, slug, created_by)
      VALUES (
        'Personal',
        'personal-' || SUBSTRING(user_record.id::text FROM 1 FOR 8),
        user_record.id
      )
      RETURNING id INTO default_team_id;

      -- Add user as owner of their personal team
      INSERT INTO public.team_members (team_id, user_id, role)
      VALUES (default_team_id, user_record.id, 'owner');

      -- Update any orphaned projects (team_id NULL) to this team
      UPDATE public.projects
      SET team_id = default_team_id
      WHERE team_id IS NULL;

      -- Add user as owner of all projects in their team
      INSERT INTO public.project_members (project_id, user_id, role, granted_by)
      SELECT id, user_record.id, 'owner', user_record.id
      FROM public.projects
      WHERE team_id = default_team_id
      ON CONFLICT (project_id, user_id) DO NOTHING;

      RAISE NOTICE 'Created default team % for user %', default_team_id, user_record.email;
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Verify migration success
DO $$
DECLARE
  team_count INTEGER;
  member_count INTEGER;
  project_member_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO team_count FROM public.teams;
  SELECT COUNT(*) INTO member_count FROM public.team_members;
  SELECT COUNT(*) INTO project_member_count FROM public.project_members;

  RAISE NOTICE 'Migration 003 complete: % teams, % team members, % project members',
    team_count, member_count, project_member_count;
END $$;
