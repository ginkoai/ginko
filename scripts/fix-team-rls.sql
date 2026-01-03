-- Fix: Team RLS Infinite Recursion
-- The policies reference team_members from within team_members policies
-- Solution: Use a security definer function to bypass RLS for the check

-- =============================================================================
-- DROP EXISTING POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can update teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can delete teams" ON public.teams;

DROP POLICY IF EXISTS "Team members can view membership" ON public.team_members;
DROP POLICY IF EXISTS "Team owners/admins can add members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners/admins can update members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners/admins can remove members" ON public.team_members;

DROP POLICY IF EXISTS "Team owners/admins can view invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Team owners/admins can create invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Team owners/admins can update invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Team owners/admins can delete invitations" ON public.team_invitations;

-- =============================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER to bypass RLS)
-- =============================================================================

-- Check if user is member of a team
CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is owner/admin of a team
CREATE OR REPLACE FUNCTION public.is_team_admin(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id
    AND user_id = p_user_id
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get all team IDs for a user
CREATE OR REPLACE FUNCTION public.get_user_team_ids(p_user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY SELECT team_id FROM public.team_members WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get team IDs where user is admin
CREATE OR REPLACE FUNCTION public.get_user_admin_team_ids(p_user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY SELECT team_id FROM public.team_members
    WHERE user_id = p_user_id AND role IN ('owner', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- TEAMS POLICIES (using helper functions)
-- =============================================================================

CREATE POLICY "Users can view own teams" ON public.teams
  FOR SELECT USING (
    id IN (SELECT public.get_user_team_ids(auth.uid()))
  );

CREATE POLICY "Authenticated users can create teams" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Team owners can update teams" ON public.teams
  FOR UPDATE USING (
    id IN (SELECT public.get_user_admin_team_ids(auth.uid()))
  );

CREATE POLICY "Team owners can delete teams" ON public.teams
  FOR DELETE USING (
    id IN (SELECT public.get_user_admin_team_ids(auth.uid()))
  );

-- =============================================================================
-- TEAM MEMBERS POLICIES (using helper functions)
-- =============================================================================

CREATE POLICY "Team members can view membership" ON public.team_members
  FOR SELECT USING (
    public.is_team_member(team_id, auth.uid())
  );

CREATE POLICY "Team owners/admins can add members" ON public.team_members
  FOR INSERT WITH CHECK (
    public.is_team_admin(team_id, auth.uid())
    OR NOT EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_members.team_id)
  );

CREATE POLICY "Team owners/admins can update members" ON public.team_members
  FOR UPDATE USING (
    public.is_team_admin(team_id, auth.uid())
  );

CREATE POLICY "Team owners/admins can remove members" ON public.team_members
  FOR DELETE USING (
    public.is_team_admin(team_id, auth.uid())
  );

-- =============================================================================
-- TEAM INVITATIONS POLICIES (using helper functions)
-- =============================================================================

CREATE POLICY "Team admins can view invitations" ON public.team_invitations
  FOR SELECT USING (
    public.is_team_admin(team_id, auth.uid())
  );

CREATE POLICY "Team admins can create invitations" ON public.team_invitations
  FOR INSERT WITH CHECK (
    public.is_team_admin(team_id, auth.uid())
  );

CREATE POLICY "Team admins can update invitations" ON public.team_invitations
  FOR UPDATE USING (
    public.is_team_admin(team_id, auth.uid())
  );

CREATE POLICY "Team admins can delete invitations" ON public.team_invitations
  FOR DELETE USING (
    public.is_team_admin(team_id, auth.uid())
  );

-- =============================================================================
-- DONE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'RLS policies fixed with security definer functions';
END $$;
