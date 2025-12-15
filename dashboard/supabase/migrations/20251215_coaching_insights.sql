-- Migration: Coaching Insights Engine
-- Date: 2025-12-15
-- ADR: ADR-053-coaching-insights-engine.md
-- Sprint: EPIC-005 Sprint 3 - Coaching Insights Engine

-- ============================================================================
-- INSIGHT RUNS TABLE
-- Tracks when analysis was performed for a user/project
-- ============================================================================
CREATE TABLE IF NOT EXISTS insight_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  graph_id TEXT,
  run_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  summary TEXT,
  data_window_start TIMESTAMPTZ,
  data_window_end TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INSIGHTS TABLE
-- Individual insights from each analysis run
-- ============================================================================
CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES insight_runs(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('efficiency', 'patterns', 'quality', 'anti-patterns')),
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'suggestion', 'warning', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  metric_name TEXT,
  metric_value NUMERIC,
  metric_target NUMERIC,
  metric_unit TEXT,
  score_impact INTEGER DEFAULT 0, -- Points added/subtracted from category score
  evidence JSONB DEFAULT '[]', -- Supporting data points
  recommendations JSONB DEFAULT '[]', -- Actionable suggestions
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INSIGHT TRENDS TABLE
-- Historical tracking of key metrics over time
-- ============================================================================
CREATE TABLE IF NOT EXISTS insight_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  run_id UUID REFERENCES insight_runs(id) ON DELETE SET NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  measured_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Insight runs: Query by user, project, and time
CREATE INDEX IF NOT EXISTS idx_insight_runs_user_project
  ON insight_runs(user_id, project_id, run_at DESC);

CREATE INDEX IF NOT EXISTS idx_insight_runs_status
  ON insight_runs(status) WHERE status != 'completed';

-- Insights: Query by run and category
CREATE INDEX IF NOT EXISTS idx_insights_run
  ON insights(run_id);

CREATE INDEX IF NOT EXISTS idx_insights_category
  ON insights(category);

CREATE INDEX IF NOT EXISTS idx_insights_severity
  ON insights(severity) WHERE severity IN ('warning', 'critical');

-- Trends: Query by user, metric, and time for sparklines
CREATE INDEX IF NOT EXISTS idx_trends_user_metric
  ON insight_trends(user_id, project_id, metric_name, measured_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Users can only access their own data
-- ============================================================================

ALTER TABLE insight_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_trends ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read/write their own insight runs
CREATE POLICY insight_runs_user_policy ON insight_runs
  FOR ALL
  USING (user_id = auth.jwt() ->> 'email')
  WITH CHECK (user_id = auth.jwt() ->> 'email');

-- Policy: Users can read insights from their runs
CREATE POLICY insights_user_policy ON insights
  FOR ALL
  USING (
    run_id IN (
      SELECT id FROM insight_runs WHERE user_id = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    run_id IN (
      SELECT id FROM insight_runs WHERE user_id = auth.jwt() ->> 'email'
    )
  );

-- Policy: Users can read/write their own trends
CREATE POLICY trends_user_policy ON insight_trends
  FOR ALL
  USING (user_id = auth.jwt() ->> 'email')
  WITH CHECK (user_id = auth.jwt() ->> 'email');

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for insight_runs
CREATE TRIGGER update_insight_runs_updated_at
  BEFORE UPDATE ON insight_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Latest run per user/project for quick dashboard queries
CREATE OR REPLACE VIEW latest_insight_runs AS
SELECT DISTINCT ON (user_id, project_id)
  id,
  user_id,
  project_id,
  graph_id,
  run_at,
  status,
  overall_score,
  summary,
  data_window_start,
  data_window_end,
  metadata
FROM insight_runs
WHERE status = 'completed'
ORDER BY user_id, project_id, run_at DESC;

-- Insight summary by category
CREATE OR REPLACE VIEW insight_category_summary AS
SELECT
  ir.user_id,
  ir.project_id,
  ir.run_at,
  i.category,
  COUNT(*) as insight_count,
  COUNT(*) FILTER (WHERE i.severity = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE i.severity = 'warning') as warning_count,
  COUNT(*) FILTER (WHERE i.severity = 'suggestion') as suggestion_count,
  SUM(i.score_impact) as total_score_impact
FROM insight_runs ir
JOIN insights i ON i.run_id = ir.id
WHERE ir.status = 'completed'
GROUP BY ir.user_id, ir.project_id, ir.run_at, i.category;
