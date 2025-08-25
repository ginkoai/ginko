-- Session Scorecards Schema for Collaboration Coaching Dashboard
-- Purpose: Comprehensive tracking of AI-human collaboration quality
-- Created: 2025-08-13
-- Sprint: 009
-- Note: Pre-go-live - no legacy constraints

-- Drop existing tables if we need a clean slate (dev only)
-- DROP TABLE IF EXISTS public.session_scorecards CASCADE;

-- Comprehensive Session Scorecards Table
CREATE TABLE IF NOT EXISTS public.session_scorecards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) UNIQUE NOT NULL, -- External session ID from MCP
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID,
    project_id UUID,
    
    -- Temporal tracking
    session_start TIMESTAMPTZ NOT NULL,
    session_end TIMESTAMPTZ,
    duration_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Core Collaboration Scores (0-100)
    scores JSONB NOT NULL DEFAULT '{}',
    -- {
    --   "handoffQuality": 85,        -- From assess_handoff_quality
    --   "taskCompletion": 75,        -- % of planned work done
    --   "sessionDrift": 60,          -- How much we stayed on track
    --   "contextEfficiency": 90,     -- Token usage vs output
    --   "continuityScore": 80,       -- Momentum preservation
    --   "overallCollaboration": 78   -- Weighted average
    -- }
    
    -- Mood & Energy Tracking
    mood JSONB DEFAULT '{}',
    -- {
    --   "start": "excited",          -- excited/focused/uncertain/frustrated
    --   "end": "accomplished",       -- satisfied/accomplished/blocked/exhausted
    --   "trajectory": "improving",   -- improving/steady/declining
    --   "energyLevel": 7,           -- 1-10 scale
    --   "frustrationPoints": []     -- Array of frustration moments
    -- }
    
    -- Work Metrics
    work_metrics JSONB DEFAULT '{}',
    -- {
    --   "tasksPlanned": 5,
    --   "tasksCompleted": 3,
    --   "unexpectedTasks": 2,
    --   "filesModified": 12,
    --   "linesChanged": 450,
    --   "commitsCreated": 2,
    --   "testsRun": 15,
    --   "testsPassed": 14,
    --   "blockers": ["TypeScript error in auth.ts", "Database connection timeout"],
    --   "breakthroughs": ["Found root cause of bug", "Simplified complex logic"]
    -- }
    
    -- Context & Resource Usage
    context_usage JSONB DEFAULT '{}',
    -- {
    --   "tokensConsumed": 45000,
    --   "messagesExchanged": 67,
    --   "contextReloads": 2,
    --   "toolsUsed": ["context", "grep", "edit", "bash"],
    --   "toolCallCount": {"context": 3, "grep": 15, "edit": 8},
    --   "filesAccessed": 23,
    --   "searchQueries": 12,
    --   "errorRate": 0.05
    -- }
    
    -- Handoff Quality Assessment (if available)
    handoff_assessment JSONB DEFAULT '{}',
    -- {
    --   "contextCompleteness": 8,
    --   "taskClarity": 9,
    --   "emotionalContinuity": 7,
    --   "actionability": 8,
    --   "overallScore": 8,
    --   "feedback": "Good context but missing error details",
    --   "missingItems": ["Error stack trace", "Database schema"]
    -- }
    
    -- Coaching Insights (generated)
    coaching JSONB DEFAULT '{}',
    -- {
    --   "strengths": ["Clear communication", "Good problem decomposition"],
    --   "improvements": ["Include more context in handoffs", "Use vibecheck when stuck"],
    --   "recommendations": [
    --     {
    --       "category": "planning",
    --       "insight": "Tasks often expand beyond initial scope",
    --       "action": "Break down tasks more granularly",
    --       "priority": "high"
    --     }
    --   ],
    --   "patterns": [
    --     {
    --       "type": "positive",
    --       "pattern": "Morning sessions more productive",
    --       "frequency": 8,
    --       "impact": "25% higher completion rate"
    --     }
    --   ]
    -- }
    
    -- Collaboration Patterns (for ML later)
    patterns JSONB DEFAULT '{}',
    -- {
    --   "sessionTimeOfDay": "morning",
    --   "sessionDayOfWeek": "tuesday",
    --   "previousSessionGap": 18,    -- hours since last session
    --   "contextSwitchCount": 3,
    --   "deepWorkPeriods": 2,        -- Uninterrupted focus periods
    --   "collaborationStyle": "exploratory", -- vs structured, debugging, learning
    --   "successFactors": ["clear goals", "good handoff", "no blockers"]
    -- }
    
    -- Raw event stream (for replay/analysis)
    event_stream JSONB DEFAULT '[]',
    -- Array of timestamped events for detailed analysis
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_scorecards_user_id ON public.session_scorecards (user_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_team_id ON public.session_scorecards (team_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_project_id ON public.session_scorecards (project_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_session_start ON public.session_scorecards (session_start DESC);
CREATE INDEX IF NOT EXISTS idx_scorecards_scores_overall ON public.session_scorecards (((scores->>'overallCollaboration')::int) DESC);
CREATE INDEX IF NOT EXISTS idx_scorecards_mood_trajectory ON public.session_scorecards ((mood->>'trajectory'));

-- Aggregated User Performance Table (for trends)
CREATE TABLE IF NOT EXISTS public.user_collaboration_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
    
    -- Aggregated scores
    avg_collaboration_score DECIMAL(5,2),
    avg_handoff_quality DECIMAL(5,2),
    avg_task_completion DECIMAL(5,2),
    score_trend VARCHAR(20), -- 'improving', 'stable', 'declining'
    
    -- Session patterns
    total_sessions INTEGER DEFAULT 0,
    total_duration_minutes INTEGER DEFAULT 0,
    avg_session_duration INTEGER DEFAULT 0,
    most_productive_time VARCHAR(20), -- 'morning', 'afternoon', 'evening'
    
    -- Work metrics
    total_tasks_completed INTEGER DEFAULT 0,
    total_files_modified INTEGER DEFAULT 0,
    total_commits INTEGER DEFAULT 0,
    
    -- Insights
    top_strengths JSONB DEFAULT '[]',
    top_improvements JSONB DEFAULT '[]',
    recommended_actions JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, period_start, period_type)
);

-- Team Collaboration Patterns (for team insights)
CREATE TABLE IF NOT EXISTS public.team_collaboration_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL,
    
    -- Pattern identification
    pattern_type VARCHAR(50) NOT NULL, -- 'success_pattern', 'struggle_pattern', 'tool_usage'
    pattern_name VARCHAR(255) NOT NULL,
    pattern_description TEXT,
    
    -- Pattern data
    occurrence_count INTEGER DEFAULT 1,
    affected_users JSONB DEFAULT '[]', -- Array of user IDs
    example_sessions JSONB DEFAULT '[]', -- Array of session IDs
    
    -- Impact metrics
    avg_score_impact DECIMAL(5,2), -- How much this pattern affects scores
    frequency_per_week DECIMAL(5,2),
    
    -- Recommendations
    recommended_action TEXT,
    priority VARCHAR(20), -- 'high', 'medium', 'low'
    
    first_observed TIMESTAMPTZ DEFAULT NOW(),
    last_observed TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.session_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_collaboration_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_collaboration_patterns ENABLE ROW LEVEL SECURITY;

-- Users can view their own data
CREATE POLICY "Users view own scorecards" ON public.session_scorecards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users view own trends" ON public.user_collaboration_trends
    FOR SELECT USING (auth.uid() = user_id);

-- Team members can view team patterns
CREATE POLICY "Team members view patterns" ON public.team_collaboration_patterns
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM public.team_members 
            WHERE user_id = auth.uid()
        )
    );

-- Functions for scoring and coaching

-- Calculate overall collaboration score
CREATE OR REPLACE FUNCTION calculate_collaboration_score(scores JSONB)
RETURNS INTEGER AS $$
DECLARE
    weights JSONB := '{
        "handoffQuality": 0.25,
        "taskCompletion": 0.25,
        "sessionDrift": 0.15,
        "contextEfficiency": 0.15,
        "continuityScore": 0.20
    }';
    total DECIMAL := 0;
    weight_sum DECIMAL := 0;
    key TEXT;
    score_value DECIMAL;
    weight_value DECIMAL;
BEGIN
    FOR key IN SELECT jsonb_object_keys(weights) LOOP
        score_value := COALESCE((scores->>key)::DECIMAL, 50);
        weight_value := (weights->>key)::DECIMAL;
        total := total + (score_value * weight_value);
        weight_sum := weight_sum + weight_value;
    END LOOP;
    
    RETURN ROUND(total / NULLIF(weight_sum, 0));
END;
$$ LANGUAGE plpgsql;

-- Generate coaching recommendations based on scores
CREATE OR REPLACE FUNCTION generate_coaching_recommendations(
    scores JSONB,
    work_metrics JSONB,
    context_usage JSONB
) RETURNS JSONB AS $$
DECLARE
    recommendations JSONB := '[]'::JSONB;
    handoff_score INTEGER;
    task_completion INTEGER;
    context_reloads INTEGER;
BEGIN
    handoff_score := COALESCE((scores->>'handoffQuality')::INTEGER, 50);
    task_completion := COALESCE((scores->>'taskCompletion')::INTEGER, 50);
    context_reloads := COALESCE((context_usage->>'contextReloads')::INTEGER, 0);
    
    -- Handoff quality coaching
    IF handoff_score < 70 THEN
        recommendations := recommendations || jsonb_build_object(
            'category', 'communication',
            'insight', 'Your handoffs lack critical context',
            'action', 'Include specific file paths, error messages, and current state',
            'priority', 'high'
        )::JSONB;
    END IF;
    
    -- Task completion coaching
    IF task_completion < 60 THEN
        recommendations := recommendations || jsonb_build_object(
            'category', 'planning',
            'insight', 'Many planned tasks remain incomplete',
            'action', 'Break tasks into smaller, achievable chunks',
            'priority', 'medium'
        )::JSONB;
    END IF;
    
    -- Context efficiency coaching
    IF context_reloads > 3 THEN
        recommendations := recommendations || jsonb_build_object(
            'category', 'workflow',
            'insight', 'Frequent context reloads indicate lost state',
            'action', 'Create mini-handoffs during long sessions',
            'priority', 'medium'
        )::JSONB;
    END IF;
    
    RETURN jsonb_build_object('recommendations', recommendations);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update calculations
CREATE OR REPLACE FUNCTION update_scorecard_calculations()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate overall collaboration score
    NEW.scores := jsonb_set(
        NEW.scores,
        '{overallCollaboration}',
        to_jsonb(calculate_collaboration_score(NEW.scores))
    );
    
    -- Generate coaching if not already present
    IF NEW.coaching = '{}' OR NEW.coaching IS NULL THEN
        NEW.coaching := generate_coaching_recommendations(
            NEW.scores,
            NEW.work_metrics,
            NEW.context_usage
        );
    END IF;
    
    -- Calculate duration if both timestamps present
    IF NEW.session_end IS NOT NULL AND NEW.session_start IS NOT NULL THEN
        NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.session_end - NEW.session_start)) / 60;
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scorecard_auto_calculations
    BEFORE INSERT OR UPDATE ON public.session_scorecards
    FOR EACH ROW
    EXECUTE FUNCTION update_scorecard_calculations();