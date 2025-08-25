-- Best Practices AI Attribution and Efficacy Tracking
-- Migration 002: Production Data Quality & A/B Testing
-- Addresses: AI-generated content transparency and real-world efficacy measurement

-- Add AI attribution and curation status to best practices
ALTER TABLE best_practices ADD COLUMN content_source VARCHAR(50) DEFAULT 'human' CHECK (content_source IN ('human', 'ai_generated', 'ai_curated'));
ALTER TABLE best_practices ADD COLUMN ai_model VARCHAR(100); -- e.g., 'claude-3-5-sonnet', 'gpt-4', etc.
ALTER TABLE best_practices ADD COLUMN ai_prompt_version VARCHAR(50); -- Track prompt versions for consistency
ALTER TABLE best_practices ADD COLUMN curator_id UUID REFERENCES users(id) ON DELETE SET NULL; -- Human who reviewed/approved AI content
ALTER TABLE best_practices ADD COLUMN curation_status VARCHAR(50) DEFAULT 'draft' CHECK (curation_status IN ('draft', 'under_review', 'approved', 'rejected'));
ALTER TABLE best_practices ADD COLUMN curation_notes TEXT; -- Reviewer feedback
ALTER TABLE best_practices ADD COLUMN verification_status VARCHAR(50) DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'community_tested', 'empirically_validated'));

-- Efficacy tracking system - A/B testing for best practices
CREATE TABLE bp_efficacy_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bp_id UUID REFERENCES best_practices(id) ON DELETE CASCADE,
    experiment_name VARCHAR(255) NOT NULL,
    hypothesis TEXT NOT NULL,
    control_group_description TEXT NOT NULL, -- "Without this best practice"
    treatment_group_description TEXT NOT NULL, -- "With this best practice"
    status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    target_sample_size INTEGER DEFAULT 100,
    confidence_level DECIMAL(3,2) DEFAULT 0.95,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Individual experiment sessions (control vs treatment)
CREATE TABLE bp_efficacy_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID REFERENCES bp_efficacy_experiments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, 
    session_id VARCHAR(255) NOT NULL, -- Claude Code session ID
    group_type VARCHAR(50) NOT NULL CHECK (group_type IN ('control', 'treatment')),
    
    -- Task context
    task_description TEXT,
    task_complexity VARCHAR(50) CHECK (task_complexity IN ('simple', 'medium', 'complex')),
    domain VARCHAR(100), -- e.g., 'frontend', 'backend', 'devops', 'testing'
    
    -- Measurable outcomes
    session_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    session_end_time TIMESTAMP WITH TIME ZONE,
    total_duration_seconds INTEGER,
    token_count_input INTEGER,
    token_count_output INTEGER,
    message_count INTEGER,
    
    -- Quality metrics
    task_completed BOOLEAN DEFAULT FALSE,
    solution_quality_score INTEGER CHECK (solution_quality_score BETWEEN 1 AND 10),
    user_satisfaction_score INTEGER CHECK (user_satisfaction_score BETWEEN 1 AND 10),
    rework_required BOOLEAN DEFAULT FALSE,
    rework_attempts INTEGER DEFAULT 0,
    
    -- Error tracking
    syntax_errors_count INTEGER DEFAULT 0,
    runtime_errors_count INTEGER DEFAULT 0,
    logical_errors_count INTEGER DEFAULT 0,
    
    -- Collaboration metrics
    context_switches_count INTEGER DEFAULT 0, -- Times user had to restart/explain context
    external_resource_lookups INTEGER DEFAULT 0, -- Times user looked outside Claude for help
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aggregated efficacy results
CREATE TABLE bp_efficacy_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID REFERENCES bp_efficacy_experiments(id) ON DELETE CASCADE,
    
    -- Sample sizes
    control_group_size INTEGER NOT NULL,
    treatment_group_size INTEGER NOT NULL,
    
    -- Time to completion metrics
    control_avg_duration_seconds DECIMAL(10,2),
    treatment_avg_duration_seconds DECIMAL(10,2),
    duration_improvement_percent DECIMAL(5,2), -- positive = improvement
    duration_p_value DECIMAL(10,8),
    
    -- Token efficiency metrics
    control_avg_tokens_per_task DECIMAL(10,2),
    treatment_avg_tokens_per_task DECIMAL(10,2),
    token_efficiency_improvement_percent DECIMAL(5,2),
    token_p_value DECIMAL(10,8),
    
    -- Quality metrics
    control_avg_quality_score DECIMAL(3,2),
    treatment_avg_quality_score DECIMAL(3,2),
    quality_improvement_percent DECIMAL(5,2),
    quality_p_value DECIMAL(10,8),
    
    -- Success rate metrics
    control_completion_rate DECIMAL(5,4), -- 0.0 to 1.0
    treatment_completion_rate DECIMAL(5,4),
    completion_rate_improvement DECIMAL(5,4),
    completion_p_value DECIMAL(10,8),
    
    -- Rework metrics
    control_rework_rate DECIMAL(5,4),
    treatment_rework_rate DECIMAL(5,4),
    rework_reduction_percent DECIMAL(5,2),
    rework_p_value DECIMAL(10,8),
    
    -- Overall efficacy score (composite metric)
    efficacy_score DECIMAL(5,2), -- Weighted combination of all metrics
    statistical_significance BOOLEAN DEFAULT FALSE,
    confidence_interval_lower DECIMAL(5,2),
    confidence_interval_upper DECIMAL(5,2),
    
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    calculated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Community validation tracking
CREATE TABLE bp_community_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bp_id UUID REFERENCES best_practices(id) ON DELETE CASCADE,
    validator_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    validation_type VARCHAR(50) NOT NULL CHECK (validation_type IN ('tried_it', 'works_great', 'needs_improvement', 'doesnt_work')),
    context_description TEXT, -- Where/how they tried it
    outcome_notes TEXT,
    evidence_url VARCHAR(500), -- Link to example, repo, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_bp_content_source ON best_practices(content_source);
CREATE INDEX idx_bp_verification_status ON best_practices(verification_status);
CREATE INDEX idx_bp_curation_status ON best_practices(curation_status);
CREATE INDEX idx_efficacy_sessions_experiment ON bp_efficacy_sessions(experiment_id);
CREATE INDEX idx_efficacy_sessions_user ON bp_efficacy_sessions(user_id);
CREATE INDEX idx_efficacy_sessions_group ON bp_efficacy_sessions(group_type);
CREATE INDEX idx_community_validations_bp ON bp_community_validations(bp_id);

-- Update existing best_practices table with AI attribution for any existing records
UPDATE best_practices 
SET content_source = 'ai_generated',
    ai_model = 'claude-3-5-sonnet',
    ai_prompt_version = 'v1.0',
    curation_status = 'under_review'
WHERE author_name IN ('Sarah Chen', 'Mike Rodriguez', 'Alex Thompson', 'Emma Wilson', 'David Park', 'Lisa Chang');

-- Add efficacy tracking trigger to update practice stats
CREATE OR REPLACE FUNCTION update_bp_efficacy_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update verification status based on community validations
    UPDATE best_practices 
    SET verification_status = CASE 
        WHEN (
            SELECT COUNT(*) FROM bp_community_validations 
            WHERE bp_id = NEW.bp_id AND validation_type IN ('works_great', 'tried_it')
        ) >= 5 THEN 'community_tested'
        WHEN (
            SELECT COUNT(*) FROM bp_efficacy_results 
            WHERE experiment_id IN (
                SELECT id FROM bp_efficacy_experiments WHERE bp_id = NEW.bp_id
            ) AND statistical_significance = TRUE AND efficacy_score > 75
        ) >= 1 THEN 'empirically_validated'
        ELSE 'unverified'
    END
    WHERE id = NEW.bp_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bp_efficacy_stats
    AFTER INSERT ON bp_community_validations
    FOR EACH ROW
    EXECUTE FUNCTION update_bp_efficacy_stats();

-- Views for easy querying
CREATE VIEW bp_with_efficacy AS
SELECT 
    bp.*,
    COALESCE(er.efficacy_score, 0) as efficacy_score,
    COALESCE(er.statistical_significance, false) as statistically_significant,
    COALESCE(cv.validation_count, 0) as community_validation_count,
    CASE 
        WHEN bp.content_source = 'ai_generated' AND bp.curation_status = 'approved' THEN '🤖 AI-Generated (Reviewed)'
        WHEN bp.content_source = 'ai_generated' THEN '🤖 AI-Generated (Under Review)'
        WHEN bp.content_source = 'ai_curated' THEN '🤖 AI-Curated'
        ELSE '👤 Community Contributed'
    END as source_label
FROM best_practices bp
LEFT JOIN (
    SELECT 
        bp_id,
        AVG(efficacy_score) as efficacy_score,
        BOOL_AND(statistical_significance) as statistical_significance
    FROM bp_efficacy_results er
    JOIN bp_efficacy_experiments ex ON er.experiment_id = ex.id
    GROUP BY bp_id
) er ON bp.id = er.bp_id
LEFT JOIN (
    SELECT bp_id, COUNT(*) as validation_count
    FROM bp_community_validations
    WHERE validation_type IN ('works_great', 'tried_it')
    GROUP BY bp_id
) cv ON bp.id = cv.bp_id;