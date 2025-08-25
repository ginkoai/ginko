-- Legacy Session Migration Schema
-- Creates a simplified sessions table for migrating legacy context

-- Create sessions table if not exists
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000', -- Placeholder for migration
    title TEXT NOT NULL CHECK (length(title) <= 200),
    description TEXT CHECK (length(description) <= 1000),
    content JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    quality_score INTEGER DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 100),
    tags TEXT[] DEFAULT '{}',
    is_archived BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_quality_score ON sessions (quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_tags ON sessions USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_sessions_archived ON sessions (is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_sessions_public ON sessions (is_public) WHERE is_public = true;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE
    ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();