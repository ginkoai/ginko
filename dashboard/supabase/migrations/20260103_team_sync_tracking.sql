-- Migration: Team Sync Tracking for EPIC-008
-- Purpose: Add last_sync_at tracking to team_members for staleness detection
-- Date: 2026-01-03

-- Add last_sync_at column to team_members if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'team_members'
        AND column_name = 'last_sync_at'
    ) THEN
        ALTER TABLE team_members
        ADD COLUMN last_sync_at TIMESTAMPTZ DEFAULT NULL;

        COMMENT ON COLUMN team_members.last_sync_at IS
            'Timestamp of when this user last synced project context (EPIC-008)';
    END IF;
END $$;

-- Add graph_id column to teams if it doesn't exist
-- Links a team to its project graph
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'teams'
        AND column_name = 'graph_id'
    ) THEN
        ALTER TABLE teams
        ADD COLUMN graph_id TEXT DEFAULT NULL;

        COMMENT ON COLUMN teams.graph_id IS
            'The Neo4j graph ID this team is associated with';

        -- Add index for efficient lookups by graph_id
        CREATE INDEX IF NOT EXISTS idx_teams_graph_id ON teams(graph_id);
    END IF;
END $$;

-- Add index on last_sync_at for staleness queries
CREATE INDEX IF NOT EXISTS idx_team_members_last_sync_at
ON team_members(last_sync_at);
