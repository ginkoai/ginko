-- Best Practices Marketplace MVP Migration
-- Adds independent best practices with public/private visibility, ratings, and adoption
-- Migration 001: Phase 1 MVP Implementation

-- Best practices core table (replaces team_best_practices with marketplace model)
CREATE TABLE best_practices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    syntax TEXT,
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
    
    -- Author information (GitHub integration)
    author_id VARCHAR(255) NOT NULL, -- GitHub user ID
    author_name VARCHAR(255) NOT NULL,
    author_avatar VARCHAR(500),
    author_github_url VARCHAR(500),
    
    -- Organization boundaries for privacy
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Metadata
    usage_count INTEGER DEFAULT 0,
    adoption_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Full-text search vector
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', name || ' ' || description || ' ' || COALESCE(syntax, ''))
    ) STORED
);

-- Tags (normalized and reusable)
CREATE TABLE bp_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bp_id UUID REFERENCES best_practices(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    normalized_tag VARCHAR(100) NOT NULL, -- lowercase, trimmed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Project-level adoption tracking
CREATE TABLE bp_adoptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bp_id UUID REFERENCES best_practices(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    adopted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    adopted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT, -- Optional adoption notes
    
    UNIQUE(bp_id, project_id) -- Prevent duplicate adoptions
);

-- Usage analytics for best practices
CREATE TABLE bp_usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bp_id UUID REFERENCES best_practices(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- view, search_result, adopt, unadopt
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_bp_visibility ON best_practices(visibility);
CREATE INDEX idx_bp_author ON best_practices(author_id);
CREATE INDEX idx_bp_organization ON best_practices(organization_id);
CREATE INDEX idx_bp_search ON best_practices USING GIN(search_vector);
CREATE INDEX idx_bp_created ON best_practices(created_at DESC);
CREATE INDEX idx_bp_updated ON best_practices(updated_at DESC);
CREATE INDEX idx_bp_usage_count ON best_practices(usage_count DESC);
CREATE INDEX idx_bp_adoption_count ON best_practices(adoption_count DESC);

CREATE INDEX idx_tags_bp ON bp_tags(bp_id);
CREATE INDEX idx_tags_tag ON bp_tags(normalized_tag);
CREATE INDEX idx_tags_original ON bp_tags(tag);

CREATE INDEX idx_adoptions_bp ON bp_adoptions(bp_id);
CREATE INDEX idx_adoptions_project ON bp_adoptions(project_id);
CREATE INDEX idx_adoptions_user ON bp_adoptions(adopted_by_user_id);
CREATE INDEX idx_adoptions_date ON bp_adoptions(adopted_at DESC);

CREATE INDEX idx_bp_usage_bp ON bp_usage_events(bp_id);
CREATE INDEX idx_bp_usage_type ON bp_usage_events(event_type);
CREATE INDEX idx_bp_usage_user ON bp_usage_events(user_id);
CREATE INDEX idx_bp_usage_date ON bp_usage_events(created_at DESC);

-- Update trigger for best_practices.updated_at
CREATE TRIGGER update_best_practices_updated_at 
    BEFORE UPDATE ON best_practices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update usage counts
CREATE OR REPLACE FUNCTION update_bp_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.event_type = 'view' THEN
        UPDATE best_practices 
        SET usage_count = usage_count + 1 
        WHERE id = NEW.bp_id;
    ELSIF NEW.event_type = 'adopt' THEN
        UPDATE best_practices 
        SET adoption_count = adoption_count + 1 
        WHERE id = NEW.bp_id;
    ELSIF NEW.event_type = 'unadopt' THEN
        UPDATE best_practices 
        SET adoption_count = GREATEST(adoption_count - 1, 0) 
        WHERE id = NEW.bp_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bp_counts_trigger
    AFTER INSERT ON bp_usage_events
    FOR EACH ROW EXECUTE FUNCTION update_bp_usage_count();

-- Helper function to normalize tags
CREATE OR REPLACE FUNCTION normalize_tag(tag_text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(TRIM(tag_text));
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-normalize tags
CREATE OR REPLACE FUNCTION normalize_bp_tag()
RETURNS TRIGGER AS $$
BEGIN
    NEW.normalized_tag = normalize_tag(NEW.tag);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER normalize_bp_tag_trigger
    BEFORE INSERT OR UPDATE ON bp_tags
    FOR EACH ROW EXECUTE FUNCTION normalize_bp_tag();

-- View for public best practices with tag aggregation
CREATE VIEW public_best_practices AS
SELECT 
    bp.*,
    COALESCE(
        JSON_AGG(
            DISTINCT t.tag ORDER BY t.tag
        ) FILTER (WHERE t.tag IS NOT NULL),
        '[]'::json
    ) AS tags,
    COALESCE(
        JSON_AGG(
            DISTINCT JSON_BUILD_OBJECT(
                'project_id', a.project_id,
                'adopted_at', a.adopted_at,
                'notes', a.notes
            ) ORDER BY a.adopted_at DESC
        ) FILTER (WHERE a.project_id IS NOT NULL),
        '[]'::json
    ) AS recent_adoptions
FROM best_practices bp
LEFT JOIN bp_tags t ON bp.id = t.bp_id
LEFT JOIN bp_adoptions a ON bp.id = a.bp_id
WHERE bp.visibility = 'public'
GROUP BY bp.id;

-- View for organization best practices (includes private)
CREATE VIEW organization_best_practices AS
SELECT 
    bp.*,
    COALESCE(
        JSON_AGG(
            DISTINCT t.tag ORDER BY t.tag
        ) FILTER (WHERE t.tag IS NOT NULL),
        '[]'::json
    ) AS tags,
    COALESCE(
        JSON_AGG(
            DISTINCT JSON_BUILD_OBJECT(
                'project_id', a.project_id,
                'adopted_at', a.adopted_at,
                'notes', a.notes
            ) ORDER BY a.adopted_at DESC
        ) FILTER (WHERE a.project_id IS NOT NULL),
        '[]'::json
    ) AS recent_adoptions
FROM best_practices bp
LEFT JOIN bp_tags t ON bp.id = t.bp_id
LEFT JOIN bp_adoptions a ON bp.id = a.bp_id
GROUP BY bp.id;

-- Migration complete
-- This migration adds the foundation for Best Practices Marketplace MVP
-- Future migrations will add ratings, reviews, and enhanced governance features