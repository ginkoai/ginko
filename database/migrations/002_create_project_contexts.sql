-- Migration: Create project_contexts table for MCP tools
-- This table stores cached context data for projects

-- Create projects table first if it doesn't exist
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    repository_url VARCHAR(500),
    repository_provider VARCHAR(50),
    webhook_secret VARCHAR(255),
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_contexts table
CREATE TABLE IF NOT EXISTS project_contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    context_type VARCHAR(50) NOT NULL,
    context_key VARCHAR(255) NOT NULL,
    context_data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(project_id, context_type, context_key)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_contexts_project_id ON project_contexts(project_id);
CREATE INDEX IF NOT EXISTS idx_project_contexts_type ON project_contexts(context_type);
CREATE INDEX IF NOT EXISTS idx_project_contexts_key ON project_contexts(context_key);
CREATE INDEX IF NOT EXISTS idx_project_contexts_expires ON project_contexts(expires_at);

-- Insert a default project for testing
INSERT INTO projects (id, name, slug, repository_url, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Ginko Platform',
    'ginko',
    'https://github.com/ginkoai/ginko',
    true
) ON CONFLICT (id) DO NOTHING;