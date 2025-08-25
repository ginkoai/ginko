-- ContextMCP Database Schema
-- Production-ready persistence layer for team collaboration

-- Organizations and Teams
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan_tier VARCHAR(20) NOT NULL DEFAULT 'free', -- free, pro, enterprise
    plan_status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, past_due, canceled, trialing
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255),
    billing_email VARCHAR(255) NOT NULL,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

-- Projects and Repositories
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    repository_url VARCHAR(500),
    repository_provider VARCHAR(50), -- github, gitlab, bitbucket
    webhook_secret VARCHAR(255),
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, slug)
);

-- Users (identity & authentication)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- owner, admin, member, viewer
    api_key_hash VARCHAR(255) UNIQUE,
    api_key_prefix VARCHAR(8), -- First 8 chars for display
    last_active TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization invitations
CREATE TABLE organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    invited_by UUID REFERENCES users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Members and Access Control (updated to reference users table)
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- admin, member, viewer
    permissions JSONB DEFAULT '{}',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE,
    UNIQUE(team_id, user_id)
);

-- Context Storage and Caching
CREATE TABLE project_contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    context_type VARCHAR(50) NOT NULL, -- overview, file_analysis, dependency_graph
    context_key VARCHAR(255) NOT NULL, -- file path, or context identifier
    context_data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(project_id, context_type, context_key)
);

-- Git Events and Change Tracking
CREATE TABLE git_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- push, merge, pull_request
    commit_hash VARCHAR(40),
    branch VARCHAR(255),
    author_name VARCHAR(255) NOT NULL,
    author_email VARCHAR(255),
    message TEXT,
    files_changed JSONB NOT NULL, -- array of {type, path, additions, deletions}
    webhook_payload JSONB,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Usage tracking for billing
CREATE TABLE usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL, -- session_create, context_query, git_webhook, etc.
    resource_id UUID, -- project_id, session_id, etc.
    quantity INTEGER DEFAULT 1,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plan usage summaries (for quick lookups)
CREATE TABLE usage_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    total_quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, period_start, period_end, event_type)
);

-- Team Activity and Usage Analytics (updated to reference users table)
CREATE TABLE team_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL, -- context_query, file_access, search
    activity_data JSONB NOT NULL,
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Context Query History and Learning (updated to reference users table)
CREATE TABLE context_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    query_type VARCHAR(50) NOT NULL, -- get_project_overview, find_relevant_code, etc.
    query_params JSONB NOT NULL,
    response_summary TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Insights and Pattern Recognition
CREATE TABLE team_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL, -- hot_files, collaboration_patterns, focus_areas
    insight_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Performance and Monitoring
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(50) NOT NULL, -- context_generation_time, webhook_processing_time
    metric_value DECIMAL(10,3) NOT NULL,
    labels JSONB DEFAULT '{}', -- team_id, project_id, etc.
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_organizations_plan_tier ON organizations(plan_tier);
CREATE INDEX idx_organizations_stripe_customer ON organizations(stripe_customer_id);

CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_api_key ON users(api_key_hash);
CREATE INDEX idx_users_active ON users(is_active, last_active);

CREATE INDEX idx_organization_invitations_org ON organization_invitations(organization_id);
CREATE INDEX idx_organization_invitations_email ON organization_invitations(email);
CREATE INDEX idx_organization_invitations_token ON organization_invitations(token);

CREATE INDEX idx_usage_events_organization ON usage_events(organization_id);
CREATE INDEX idx_usage_events_user ON usage_events(user_id);
CREATE INDEX idx_usage_events_type_date ON usage_events(event_type, created_at);
CREATE INDEX idx_usage_events_resource ON usage_events(resource_id);

CREATE INDEX idx_usage_summaries_org_period ON usage_summaries(organization_id, period_start, period_end);
CREATE INDEX idx_usage_summaries_type ON usage_summaries(event_type);

CREATE INDEX idx_teams_organization ON teams(organization_id);
CREATE INDEX idx_projects_team ON projects(team_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);

CREATE INDEX idx_project_contexts_project ON project_contexts(project_id);
CREATE INDEX idx_project_contexts_type_key ON project_contexts(project_id, context_type, context_key);
CREATE INDEX idx_project_contexts_expires ON project_contexts(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_git_events_project ON git_events(project_id);
CREATE INDEX idx_git_events_timestamp ON git_events(timestamp DESC);
CREATE INDEX idx_git_events_author ON git_events(author_name);

CREATE INDEX idx_team_activities_team_project ON team_activities(team_id, project_id);
CREATE INDEX idx_team_activities_user ON team_activities(user_id);
CREATE INDEX idx_team_activities_created ON team_activities(created_at DESC);

CREATE INDEX idx_context_queries_project ON context_queries(project_id);
CREATE INDEX idx_context_queries_user ON context_queries(user_id);
CREATE INDEX idx_context_queries_created ON context_queries(created_at DESC);

CREATE INDEX idx_team_insights_team_project ON team_insights(team_id, project_id);
CREATE INDEX idx_team_insights_type ON team_insights(insight_type);
CREATE INDEX idx_team_insights_expires ON team_insights(expires_at) WHERE expires_at IS NOT NULL;

-- Team Best Practices Configuration
CREATE TABLE team_best_practices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    practice_id VARCHAR(100) NOT NULL, -- Reference to practice definition
    category VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    rationale TEXT,
    examples JSONB DEFAULT '{}',
    priority VARCHAR(20) NOT NULL, -- critical, high, medium, low
    tags JSONB DEFAULT '[]',
    is_custom BOOLEAN DEFAULT false,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, practice_id)
);

-- Best Practices Violations/Reminders
CREATE TABLE practice_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    practice_id VARCHAR(100) NOT NULL,
    context_type VARCHAR(50) NOT NULL, -- code_review, query, suggestion
    context_data JSONB NOT NULL,
    reminder_count INTEGER DEFAULT 1,
    last_reminded TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for best practices
CREATE INDEX idx_team_best_practices_team ON team_best_practices(team_id);
CREATE INDEX idx_team_best_practices_enabled ON team_best_practices(team_id, is_enabled);
CREATE INDEX idx_practice_reminders_team_project ON practice_reminders(team_id, project_id);
CREATE INDEX idx_practice_reminders_acknowledged ON practice_reminders(acknowledged);

-- Session Handoff and Context Persistence (updated to reference users table)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_key VARCHAR(255) UNIQUE NOT NULL, -- External session identifier
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Session metadata
    working_directory TEXT NOT NULL,
    current_task TEXT,
    focus_areas JSONB DEFAULT '[]',
    
    -- AI conversation context
    conversation_summary TEXT,
    key_decisions JSONB DEFAULT '[]',
    
    -- Development state
    recent_files JSONB DEFAULT '[]',
    open_tasks JSONB DEFAULT '[]',
    active_features JSONB DEFAULT '[]',
    
    -- Problem-solving context
    current_challenges JSONB DEFAULT '[]',
    discoveries JSONB DEFAULT '[]',
    
    -- Tool and command history
    recent_commands JSONB DEFAULT '[]',
    
    -- Session metrics
    session_duration INTEGER DEFAULT 0, -- seconds
    total_tokens_used INTEGER DEFAULT 0,
    average_response_time INTEGER DEFAULT 0, -- milliseconds
    productivity_score DECIMAL(3,2) DEFAULT 0.0,
    context_quality DECIMAL(3,2) DEFAULT 0.0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Session state
    is_active BOOLEAN DEFAULT true,
    resumption_count INTEGER DEFAULT 0
);

-- Session Context Snapshots (for versioning)
CREATE TABLE session_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    snapshot_type VARCHAR(50) NOT NULL, -- manual, auto, handoff, resumption
    
    -- Full context snapshot
    context_data JSONB NOT NULL,
    context_hash VARCHAR(64) NOT NULL, -- SHA-256 of context for deduplication
    
    -- Snapshot metadata
    created_by UUID REFERENCES users(id), -- user who created snapshot
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_count INTEGER DEFAULT 0,
    total_size INTEGER DEFAULT 0, -- bytes
    
    -- Compression and storage
    compression_level VARCHAR(20) DEFAULT 'standard', -- minimal, standard, comprehensive
    storage_format VARCHAR(20) DEFAULT 'json' -- json, compressed, encrypted
);

-- Session Handoff Events (audit trail, updated to reference users table)
CREATE TABLE session_handoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
    to_session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Handoff details
    handoff_type VARCHAR(50) NOT NULL, -- context_rot, session_timeout, manual, scheduled
    context_preservation_score DECIMAL(3,2), -- how much context was preserved
    resumption_time INTEGER, -- seconds to resume productive work
    
    -- Context transfer metadata
    original_context_size INTEGER, -- bytes
    compressed_context_size INTEGER, -- bytes
    context_items_preserved INTEGER,
    context_items_lost INTEGER,
    
    -- Quality metrics
    user_satisfaction_score INTEGER, -- 1-10 rating
    resumption_success BOOLEAN DEFAULT true,
    issues_encountered JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for session management
CREATE INDEX idx_user_sessions_user_team ON user_sessions(user_id, team_id);
CREATE INDEX idx_user_sessions_project ON user_sessions(project_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active, expires_at);
CREATE INDEX idx_user_sessions_last_accessed ON user_sessions(last_accessed DESC);

CREATE INDEX idx_session_snapshots_session ON session_snapshots(session_id);
CREATE INDEX idx_session_snapshots_created ON session_snapshots(created_at DESC);
CREATE INDEX idx_session_snapshots_hash ON session_snapshots(context_hash);

CREATE INDEX idx_session_handoffs_user ON session_handoffs(user_id);
CREATE INDEX idx_session_handoffs_project ON session_handoffs(project_id);
CREATE INDEX idx_session_handoffs_created ON session_handoffs(created_at DESC);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_contexts_updated_at BEFORE UPDATE ON project_contexts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_best_practices_updated_at BEFORE UPDATE ON team_best_practices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usage_summaries_updated_at BEFORE UPDATE ON usage_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();