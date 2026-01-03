-- Migration: Node Edit Locks for EPIC-008 Sprint 2
-- Purpose: Prevent concurrent edit conflicts with 15-minute auto-expiring locks
-- Date: 2026-01-03
-- Sprint: EPIC-008 Sprint 2 - Edit Locking System

-- =============================================================================
-- NODE LOCKS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.node_locks (
  node_id TEXT NOT NULL,
  graph_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (node_id, graph_id)
);

COMMENT ON TABLE public.node_locks IS 'Edit locks to prevent concurrent node editing (EPIC-008 Sprint 2)';
COMMENT ON COLUMN public.node_locks.node_id IS 'The ID of the locked node';
COMMENT ON COLUMN public.node_locks.graph_id IS 'The graph containing the locked node';
COMMENT ON COLUMN public.node_locks.user_id IS 'User who holds the lock';
COMMENT ON COLUMN public.node_locks.user_email IS 'Email of lock holder for display purposes';
COMMENT ON COLUMN public.node_locks.acquired_at IS 'When the lock was acquired';
COMMENT ON COLUMN public.node_locks.expires_at IS 'When the lock auto-expires (15 min from acquired)';

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_node_locks_expires ON public.node_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_node_locks_user ON public.node_locks(user_id);
CREATE INDEX IF NOT EXISTS idx_node_locks_graph ON public.node_locks(graph_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.node_locks ENABLE ROW LEVEL SECURITY;

-- Users can view all locks (needed to check if node is locked by another user)
CREATE POLICY "Users can view locks" ON public.node_locks
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can create locks (they will be associated with their user_id)
CREATE POLICY "Authenticated users can create locks" ON public.node_locks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own locks
CREATE POLICY "Users can update own locks" ON public.node_locks
  FOR UPDATE USING (user_id = auth.uid());

-- Users can only delete their own locks
CREATE POLICY "Users can delete own locks" ON public.node_locks
  FOR DELETE USING (user_id = auth.uid());

-- =============================================================================
-- HELPER FUNCTION: Clean up expired locks
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_locks()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.node_locks
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_expired_locks IS 'Remove expired node locks (EPIC-008 Sprint 2)';

-- =============================================================================
-- HELPER FUNCTION: Acquire lock with cleanup
-- =============================================================================

CREATE OR REPLACE FUNCTION public.acquire_node_lock(
  p_node_id TEXT,
  p_graph_id TEXT,
  p_user_email TEXT,
  p_duration_minutes INTEGER DEFAULT 15
)
RETURNS TABLE(
  success BOOLEAN,
  lock_node_id TEXT,
  lock_graph_id TEXT,
  lock_user_id UUID,
  lock_user_email TEXT,
  lock_acquired_at TIMESTAMPTZ,
  lock_expires_at TIMESTAMPTZ,
  held_by_user_id UUID,
  held_by_email TEXT,
  held_since TIMESTAMPTZ
) AS $$
DECLARE
  current_user_id UUID;
  existing_lock RECORD;
  lock_expiry TIMESTAMPTZ;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to acquire lock';
  END IF;

  -- Clean up expired locks first
  DELETE FROM public.node_locks WHERE expires_at < NOW();

  -- Check for existing lock
  SELECT * INTO existing_lock
  FROM public.node_locks
  WHERE node_locks.node_id = p_node_id AND node_locks.graph_id = p_graph_id;

  IF FOUND THEN
    -- Lock exists
    IF existing_lock.user_id = current_user_id THEN
      -- User already holds the lock - extend it
      lock_expiry := NOW() + (p_duration_minutes || ' minutes')::INTERVAL;

      UPDATE public.node_locks
      SET expires_at = lock_expiry
      WHERE node_locks.node_id = p_node_id AND node_locks.graph_id = p_graph_id;

      RETURN QUERY SELECT
        TRUE,
        p_node_id,
        p_graph_id,
        current_user_id,
        p_user_email,
        existing_lock.acquired_at,
        lock_expiry,
        NULL::UUID,
        NULL::TEXT,
        NULL::TIMESTAMPTZ;
    ELSE
      -- Another user holds the lock
      RETURN QUERY SELECT
        FALSE,
        NULL::TEXT,
        NULL::TEXT,
        NULL::UUID,
        NULL::TEXT,
        NULL::TIMESTAMPTZ,
        NULL::TIMESTAMPTZ,
        existing_lock.user_id,
        existing_lock.user_email,
        existing_lock.acquired_at;
    END IF;
  ELSE
    -- No lock exists - create one
    lock_expiry := NOW() + (p_duration_minutes || ' minutes')::INTERVAL;

    INSERT INTO public.node_locks (node_id, graph_id, user_id, user_email, acquired_at, expires_at)
    VALUES (p_node_id, p_graph_id, current_user_id, p_user_email, NOW(), lock_expiry);

    RETURN QUERY SELECT
      TRUE,
      p_node_id,
      p_graph_id,
      current_user_id,
      p_user_email,
      NOW(),
      lock_expiry,
      NULL::UUID,
      NULL::TEXT,
      NULL::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.acquire_node_lock IS 'Attempt to acquire or extend a node edit lock (EPIC-008 Sprint 2)';

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'EPIC-008 Sprint 2 Node Locks schema migration complete';
END $$;
