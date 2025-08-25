-- Session Analytics Dashboard Schema Extensions
-- Complements existing schema.sql with analytics-specific tables

-- Session Analytics Summary (aggregated metrics)
CREATE TABLE session_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Time-based metrics
    analysis_date DATE NOT NULL,
    session_count INTEGER DEFAULT 1,
    total_duration INTEGER DEFAULT 0, -- seconds
    active_coding_time INTEGER DEFAULT 0, -- seconds of actual development
    context_switches INTEGER DEFAULT 0,
    
    -- Productivity metrics
    files_modified INTEGER DEFAULT 0,
    lines_added INTEGER DEFAULT 0,
    lines_removed INTEGER DEFAULT 0,
    commits_made INTEGER DEFAULT 0,
    
    -- AI interaction metrics
    ai_queries INTEGER DEFAULT 0,
    ai_response_time_avg INTEGER DEFAULT 0, -- milliseconds
    context_quality_avg DECIMAL(3,2) DEFAULT 0.0,
    successful_handoffs INTEGER DEFAULT 0,
    failed_handoffs INTEGER DEFAULT 0,
    
    -- Focus and attention metrics
    task_completion_rate DECIMAL(3,2) DEFAULT 0.0,
    context_switches_per_hour DECIMAL(5,2) DEFAULT 0.0,
    deep_work_sessions INTEGER DEFAULT 0, -- sessions >30min focused
    
    -- Collaboration metrics
    files_shared INTEGER DEFAULT 0,
    team_interactions INTEGER DEFAULT 0,
    knowledge_shared_score DECIMAL(3,2) DEFAULT 0.0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(session_id, analysis_date)
);

-- Team Analytics Summary (daily/weekly/monthly rollups)
CREATE TABLE team_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Time period
    period_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Team productivity metrics
    total_developers INTEGER DEFAULT 0,
    active_sessions INTEGER DEFAULT 0,
    total_session_time INTEGER DEFAULT 0, -- seconds
    average_session_length INTEGER DEFAULT 0, -- seconds
    
    -- Code health metrics
    total_commits INTEGER DEFAULT 0,
    total_files_modified INTEGER DEFAULT 0,
    code_coverage_trend DECIMAL(5,2), -- percentage change
    build_success_rate DECIMAL(3,2) DEFAULT 1.0,
    
    -- Context and AI metrics
    context_queries_total INTEGER DEFAULT 0,
    avg_context_quality DECIMAL(3,2) DEFAULT 0.0,
    handoff_success_rate DECIMAL(3,2) DEFAULT 1.0,
    ai_effectiveness_score DECIMAL(3,2) DEFAULT 0.0,
    
    -- Collaboration patterns
    pair_programming_sessions INTEGER DEFAULT 0,
    code_review_participation DECIMAL(3,2) DEFAULT 0.0,
    knowledge_sharing_events INTEGER DEFAULT 0,
    cross_file_collaboration_score DECIMAL(3,2) DEFAULT 0.0,
    
    -- Focus areas (top topics worked on)
    primary_focus_areas JSONB DEFAULT '[]',
    technology_usage JSONB DEFAULT '{}', -- {typescript: 45%, react: 30%, etc}
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(team_id, project_id, period_type, period_start)
);

-- File Activity Heatmap (for understanding hot spots)
CREATE TABLE file_activity_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    file_path VARCHAR(1000) NOT NULL,
    
    -- Activity metrics
    modification_count INTEGER DEFAULT 0,
    unique_contributors INTEGER DEFAULT 0,
    total_session_time INTEGER DEFAULT 0, -- seconds spent on this file
    complexity_score DECIMAL(3,2) DEFAULT 0.0,
    
    -- Collaboration metrics
    pair_sessions INTEGER DEFAULT 0,
    review_frequency DECIMAL(3,2) DEFAULT 0.0,
    bug_frequency DECIMAL(3,2) DEFAULT 0.0,
    
    -- Time period
    analysis_date DATE NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(project_id, file_path, analysis_date)
);

-- Context Quality Trends (for understanding session handoff effectiveness)
CREATE TABLE context_quality_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Quality measurements
    measurement_date DATE NOT NULL,
    avg_context_quality DECIMAL(3,2) NOT NULL,
    handoff_success_rate DECIMAL(3,2) DEFAULT 1.0,
    resumption_time_avg INTEGER DEFAULT 0, -- seconds to become productive
    
    -- Context characteristics
    avg_session_complexity DECIMAL(3,2) DEFAULT 0.0,
    context_preservation_score DECIMAL(3,2) DEFAULT 0.0,
    information_density DECIMAL(3,2) DEFAULT 0.0,
    
    -- Factors affecting quality
    session_duration_avg INTEGER DEFAULT 0,
    task_completion_rate DECIMAL(3,2) DEFAULT 0.0,
    interruption_frequency DECIMAL(3,2) DEFAULT 0.0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, team_id, project_id, measurement_date)
);

-- AI Assistant Performance Analytics
CREATE TABLE ai_performance_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Query performance
    analysis_date DATE NOT NULL,
    total_queries INTEGER DEFAULT 0,
    avg_response_time INTEGER DEFAULT 0, -- milliseconds
    success_rate DECIMAL(3,2) DEFAULT 1.0,
    
    -- Query types and effectiveness
    query_type_distribution JSONB DEFAULT '{}', -- {find_code: 40%, explain: 30%, etc}
    most_effective_queries JSONB DEFAULT '[]',
    least_effective_queries JSONB DEFAULT '[]',
    
    -- User satisfaction proxy metrics
    follow_up_query_rate DECIMAL(3,2) DEFAULT 0.0, -- indicates unclear responses
    query_retry_rate DECIMAL(3,2) DEFAULT 0.0,
    task_completion_after_query DECIMAL(3,2) DEFAULT 0.0,
    
    -- Context utilization
    context_hit_rate DECIMAL(3,2) DEFAULT 0.0, -- how often cached context helps
    context_staleness_avg INTEGER DEFAULT 0, -- minutes since last update
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(team_id, project_id, analysis_date)
);

-- Real-time Session Events (for live dashboard updates)
CREATE TABLE session_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL, -- session_start, task_complete, context_switch, handoff, etc
    event_data JSONB NOT NULL,
    
    -- Performance tracking
    duration_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_details TEXT,
    
    -- Context at time of event
    active_files JSONB DEFAULT '[]',
    current_focus VARCHAR(255),
    productivity_state VARCHAR(50), -- focused, distracted, blocked, flow
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dashboard Widget Configurations (user preferences)
CREATE TABLE dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Widget configuration
    widget_type VARCHAR(50) NOT NULL, -- productivity_chart, file_heatmap, team_overview
    widget_config JSONB NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    
    -- Layout
    grid_position JSONB DEFAULT '{}', -- {x: 0, y: 0, w: 4, h: 3}
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, team_id, widget_type, display_order)
);

-- Indexes for Analytics Performance
CREATE INDEX idx_session_analytics_user_date ON session_analytics(user_id, analysis_date DESC);
CREATE INDEX idx_session_analytics_team_project ON session_analytics(team_id, project_id);
CREATE INDEX idx_session_analytics_date ON session_analytics(analysis_date DESC);

CREATE INDEX idx_team_analytics_team_period ON team_analytics(team_id, period_type, period_start DESC);
CREATE INDEX idx_team_analytics_project ON team_analytics(project_id, period_start DESC);

CREATE INDEX idx_file_activity_project_date ON file_activity_analytics(project_id, analysis_date DESC);
CREATE INDEX idx_file_activity_file ON file_activity_analytics(file_path);

CREATE INDEX idx_context_quality_user_date ON context_quality_trends(user_id, measurement_date DESC);
CREATE INDEX idx_context_quality_team_project ON context_quality_trends(team_id, project_id);

CREATE INDEX idx_ai_performance_team_date ON ai_performance_analytics(team_id, analysis_date DESC);
CREATE INDEX idx_ai_performance_project ON ai_performance_analytics(project_id, analysis_date DESC);

CREATE INDEX idx_session_events_session_created ON session_events(session_id, created_at DESC);
CREATE INDEX idx_session_events_user_created ON session_events(user_id, created_at DESC);
CREATE INDEX idx_session_events_type_created ON session_events(event_type, created_at DESC);

CREATE INDEX idx_dashboard_widgets_user_team ON dashboard_widgets(user_id, team_id);
CREATE INDEX idx_dashboard_widgets_enabled ON dashboard_widgets(is_enabled, display_order);

-- Triggers for updated_at timestamps
CREATE TRIGGER update_session_analytics_updated_at BEFORE UPDATE ON session_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dashboard_widgets_updated_at BEFORE UPDATE ON dashboard_widgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for Common Analytics Queries

-- Daily Productivity Summary View
CREATE VIEW daily_productivity_summary AS
SELECT 
    sa.user_id,
    sa.team_id,
    sa.project_id,
    sa.analysis_date,
    sa.total_duration / 3600.0 as hours_worked,
    sa.active_coding_time / 3600.0 as productive_hours,
    CASE 
        WHEN sa.total_duration > 0 THEN (sa.active_coding_time::FLOAT / sa.total_duration) * 100 
        ELSE 0 
    END as productivity_percentage,
    sa.files_modified,
    sa.commits_made,
    sa.context_quality_avg,
    sa.successful_handoffs,
    sa.deep_work_sessions,
    tm.username,
    p.name as project_name
FROM session_analytics sa
JOIN team_members tm ON sa.user_id = tm.user_id AND sa.team_id = tm.team_id
JOIN projects p ON sa.project_id = p.id
WHERE sa.analysis_date >= CURRENT_DATE - INTERVAL '30 days';

-- Team Collaboration Health View
CREATE VIEW team_collaboration_health AS
SELECT 
    ta.team_id,
    ta.project_id,
    ta.period_start,
    ta.total_developers,
    ta.active_sessions,
    ta.avg_context_quality,
    ta.handoff_success_rate,
    ta.code_review_participation,
    ta.cross_file_collaboration_score,
    t.name as team_name,
    p.name as project_name
FROM team_analytics ta
JOIN teams t ON ta.team_id = t.id
JOIN projects p ON ta.project_id = p.id
WHERE ta.period_type = 'weekly' 
  AND ta.period_start >= CURRENT_DATE - INTERVAL '12 weeks';

-- File Hotspots View
CREATE VIEW file_hotspots AS
SELECT 
    faa.project_id,
    faa.file_path,
    faa.modification_count,
    faa.unique_contributors,
    faa.total_session_time / 3600.0 as hours_spent,
    faa.complexity_score,
    faa.bug_frequency,
    p.name as project_name,
    CASE 
        WHEN faa.modification_count > 20 AND faa.bug_frequency > 0.1 THEN 'high_risk'
        WHEN faa.modification_count > 10 THEN 'moderate_risk'
        ELSE 'low_risk'
    END as risk_level
FROM file_activity_analytics faa
JOIN projects p ON faa.project_id = p.id
WHERE faa.analysis_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY faa.modification_count DESC, faa.total_session_time DESC;