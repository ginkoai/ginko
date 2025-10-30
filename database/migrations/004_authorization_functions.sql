-- Migration 004: Authorization Helper Functions
-- Provides canReadProject, canWriteProject, canManageProject functions
-- Created: 2025-10-29
-- For: TASK-020 Multi-Tenancy Database Schema

-- =============================================================================
-- AUTHORIZATION HELPER FUNCTIONS
-- =============================================================================

/**
 * Check if a user can read a project
 *
 * A user can read a project if:
 * - They are a member of the project (any role)
 * - They are a member of a team that has access to the project
 * - The project is public
 * - They are a team owner/admin of the team that owns the project
 *
 * @param user_uuid - The user's ID
 * @param project_uuid - The project's ID
 * @returns TRUE if user can read, FALSE otherwise
 *
 * Usage: SELECT can_read_project(auth.uid(), 'project-id-here');
 */
CREATE OR REPLACE FUNCTION public.can_read_project(
  user_uuid UUID,
  project_uuid UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = user_uuid AND is_active = TRUE
  ) THEN
    RETURN FALSE;
  END IF;

  -- Check if project exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_uuid
  ) THEN
    RETURN FALSE;
  END IF;

  -- User can read if any of these conditions are true:
  RETURN EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_uuid
    AND (
      -- Condition 1: Public project
      p.visibility = 'public'

      -- Condition 2: User is a direct project member
      OR EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = project_uuid
        AND pm.user_id = user_uuid
      )

      -- Condition 3: User is in a team that has access to the project
      OR EXISTS (
        SELECT 1 FROM public.project_teams pt
        INNER JOIN public.team_members tm ON pt.team_id = tm.team_id
        WHERE pt.project_id = project_uuid
        AND tm.user_id = user_uuid
      )

      -- Condition 4: User is owner/admin of the team that owns the project
      OR EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = p.team_id
        AND tm.user_id = user_uuid
        AND tm.role IN ('owner', 'admin')
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.can_read_project IS 'Check if user has read access to a project (public, member, or team access)';

/**
 * Check if a user can write to a project
 *
 * A user can write to a project if:
 * - They are a project member (any role)
 * - They are a team owner/admin of the team that owns the project
 *
 * Write access is stricter than read access. Members can read but may not write.
 *
 * @param user_uuid - The user's ID
 * @param project_uuid - The project's ID
 * @returns TRUE if user can write, FALSE otherwise
 *
 * Usage: SELECT can_write_project(auth.uid(), 'project-id-here');
 */
CREATE OR REPLACE FUNCTION public.can_write_project(
  user_uuid UUID,
  project_uuid UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = user_uuid AND is_active = TRUE
  ) THEN
    RETURN FALSE;
  END IF;

  -- Check if project exists
  IF NOT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_uuid
  ) THEN
    RETURN FALSE;
  END IF;

  -- User can write if any of these conditions are true:
  RETURN EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_uuid
    AND (
      -- Condition 1: User is a direct project member
      EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = project_uuid
        AND pm.user_id = user_uuid
      )

      -- Condition 2: User is owner/admin of the team that owns the project
      OR EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = p.team_id
        AND tm.user_id = user_uuid
        AND tm.role IN ('owner', 'admin')
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.can_write_project IS 'Check if user has write access to a project (members and team owners/admins)';

/**
 * Check if a user can manage a project (owner-level permissions)
 *
 * A user can manage a project if:
 * - They are a project owner
 * - They are a team owner of the team that owns the project
 *
 * Manage access allows:
 * - Deleting the project
 * - Transferring ownership
 * - Changing project visibility
 * - Managing project members
 * - Critical configuration changes
 *
 * @param user_uuid - The user's ID
 * @param project_uuid - The project's ID
 * @returns TRUE if user can manage, FALSE otherwise
 *
 * Usage: SELECT can_manage_project(auth.uid(), 'project-id-here');
 */
CREATE OR REPLACE FUNCTION public.can_manage_project(
  user_uuid UUID,
  project_uuid UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = user_uuid AND is_active = TRUE
  ) THEN
    RETURN FALSE;
  END IF;

  -- Check if project exists
  IF NOT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_uuid
  ) THEN
    RETURN FALSE;
  END IF;

  -- User can manage if any of these conditions are true:
  RETURN EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_uuid
    AND (
      -- Condition 1: User is a project owner
      EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = project_uuid
        AND pm.user_id = user_uuid
        AND pm.role = 'owner'
      )

      -- Condition 2: User is owner of the team that owns the project
      OR EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = p.team_id
        AND tm.user_id = user_uuid
        AND tm.role = 'owner'
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.can_manage_project IS 'Check if user has owner-level access to a project (project owners and team owners only)';

-- =============================================================================
-- ADVANCED AUTHORIZATION FUNCTIONS
-- =============================================================================

/**
 * Get user's effective role for a project
 *
 * Returns the highest role the user has for the given project,
 * considering both direct project membership and team membership.
 *
 * Role hierarchy (highest to lowest):
 * - owner: Full control, can delete and transfer
 * - admin: Can manage but not transfer or delete
 * - member: Can contribute but not manage
 * - viewer: Read-only access
 * - none: No access
 *
 * @param user_uuid - The user's ID
 * @param project_uuid - The project's ID
 * @returns Role name or 'none' if no access
 *
 * Usage: SELECT get_user_project_role(auth.uid(), 'project-id-here');
 */
CREATE OR REPLACE FUNCTION public.get_user_project_role(
  user_uuid UUID,
  project_uuid UUID
)
RETURNS VARCHAR(50) AS $$
DECLARE
  project_role VARCHAR(50);
  team_role VARCHAR(50);
BEGIN
  -- Get direct project membership role
  SELECT role INTO project_role
  FROM public.project_members
  WHERE project_id = project_uuid AND user_id = user_uuid;

  -- If user is project owner, return immediately
  IF project_role = 'owner' THEN
    RETURN 'owner';
  END IF;

  -- Get team role for the project's team
  SELECT tm.role INTO team_role
  FROM public.projects p
  INNER JOIN public.team_members tm ON p.team_id = tm.team_id
  WHERE p.id = project_uuid AND tm.user_id = user_uuid;

  -- Return highest role
  IF team_role = 'owner' THEN
    RETURN 'owner';
  ELSIF team_role = 'admin' OR project_role = 'member' THEN
    RETURN COALESCE(team_role, project_role);
  ELSIF team_role = 'member' THEN
    RETURN 'member';
  ELSIF team_role = 'viewer' THEN
    RETURN 'viewer';
  ELSE
    -- Check if project is public
    IF EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_uuid AND visibility = 'public'
    ) THEN
      RETURN 'viewer';
    END IF;

    RETURN 'none';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_user_project_role IS 'Get user''s highest role for a project (owner, admin, member, viewer, or none)';

/**
 * Check if user can perform a specific action on a project
 *
 * Convenience function that checks permissions for common actions.
 *
 * Supported actions:
 * - read: View project content
 * - write: Create/edit content
 * - manage: Admin operations
 * - delete: Permanently delete project
 * - transfer: Transfer ownership
 *
 * @param user_uuid - The user's ID
 * @param project_uuid - The project's ID
 * @param action - The action to check (read, write, manage, delete, transfer)
 * @returns TRUE if user can perform action, FALSE otherwise
 *
 * Usage: SELECT can_perform_action(auth.uid(), 'project-id', 'write');
 */
CREATE OR REPLACE FUNCTION public.can_perform_action(
  user_uuid UUID,
  project_uuid UUID,
  action VARCHAR(50)
)
RETURNS BOOLEAN AS $$
BEGIN
  CASE action
    WHEN 'read' THEN
      RETURN public.can_read_project(user_uuid, project_uuid);

    WHEN 'write' THEN
      RETURN public.can_write_project(user_uuid, project_uuid);

    WHEN 'manage', 'delete', 'transfer' THEN
      RETURN public.can_manage_project(user_uuid, project_uuid);

    ELSE
      RAISE EXCEPTION 'Unknown action: %. Supported: read, write, manage, delete, transfer', action;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.can_perform_action IS 'Check if user can perform a specific action (read, write, manage, delete, transfer) on a project';

-- =============================================================================
-- BATCH AUTHORIZATION FUNCTIONS
-- =============================================================================

/**
 * Check read access for multiple projects at once
 *
 * Returns a JSONB object mapping project IDs to boolean access values.
 * This is more efficient than calling can_read_project multiple times.
 *
 * @param user_uuid - The user's ID
 * @param project_uuids - Array of project IDs to check
 * @returns JSONB object like {"project-id-1": true, "project-id-2": false}
 *
 * Usage: SELECT batch_can_read_projects(auth.uid(), ARRAY['id1', 'id2']::UUID[]);
 */
CREATE OR REPLACE FUNCTION public.batch_can_read_projects(
  user_uuid UUID,
  project_uuids UUID[]
)
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}';
  project_id UUID;
BEGIN
  FOREACH project_id IN ARRAY project_uuids
  LOOP
    result := jsonb_set(
      result,
      ARRAY[project_id::text],
      to_jsonb(public.can_read_project(user_uuid, project_id))
    );
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.batch_can_read_projects IS 'Check read access for multiple projects efficiently';

-- =============================================================================
-- AUDIT LOGGING FOR AUTHORIZATION
-- =============================================================================

/**
 * Log authorization failures for security monitoring
 * This table tracks denied access attempts for auditing
 */
CREATE TABLE IF NOT EXISTS public.authorization_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resource_type VARCHAR(50) NOT NULL,  -- 'project', 'team', etc.
  resource_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,  -- 'read', 'write', 'manage'
  result BOOLEAN NOT NULL,  -- TRUE if allowed, FALSE if denied
  reason TEXT,  -- Why access was denied
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_user ON public.authorization_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_resource ON public.authorization_audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_created ON public.authorization_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_denied ON public.authorization_audit_log(result) WHERE result = FALSE;

COMMENT ON TABLE public.authorization_audit_log IS 'Audit log for authorization checks (especially denials)';

-- Enable RLS on audit log
ALTER TABLE public.authorization_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" ON public.authorization_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    )
  );

/**
 * Log an authorization check
 * Call this from application code to track access attempts
 *
 * @param p_user_id - User attempting access
 * @param p_resource_type - Type of resource (project, team, etc.)
 * @param p_resource_id - Resource ID
 * @param p_action - Action attempted (read, write, manage)
 * @param p_result - Whether access was granted
 * @param p_reason - Why access was denied (if applicable)
 */
CREATE OR REPLACE FUNCTION public.log_authorization_check(
  p_user_id UUID,
  p_resource_type VARCHAR(50),
  p_resource_id UUID,
  p_action VARCHAR(50),
  p_result BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Only log denials to reduce noise (can be changed to log all if needed)
  IF p_result = FALSE THEN
    INSERT INTO public.authorization_audit_log (
      user_id, resource_type, resource_id, action, result, reason
    ) VALUES (
      p_user_id, p_resource_type, p_resource_id, p_action, p_result, p_reason
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.log_authorization_check IS 'Log an authorization check (mainly denials) for security auditing';

-- =============================================================================
-- MIGRATION VERIFICATION
-- =============================================================================

DO $$
BEGIN
  -- Test authorization functions exist and work
  RAISE NOTICE 'Testing authorization functions...';

  -- These should not error even with invalid UUIDs
  PERFORM public.can_read_project(gen_random_uuid(), gen_random_uuid());
  PERFORM public.can_write_project(gen_random_uuid(), gen_random_uuid());
  PERFORM public.can_manage_project(gen_random_uuid(), gen_random_uuid());
  PERFORM public.get_user_project_role(gen_random_uuid(), gen_random_uuid());
  PERFORM public.can_perform_action(gen_random_uuid(), gen_random_uuid(), 'read');

  RAISE NOTICE 'Migration 004 complete: Authorization functions installed successfully';
END $$;
