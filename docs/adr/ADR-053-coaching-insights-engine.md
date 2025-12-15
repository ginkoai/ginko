# ADR-053: Coaching Insights Engine Architecture

**Status:** Accepted
**Date:** 2025-12-15
**Author:** Chris Norton, Claude
**Epic:** EPIC-005 Market Readiness
**Sprint:** Sprint 3 - Coaching Insights Engine

## Context

Ginko captures rich collaboration data through events, sprint progress, pattern adoption, and session metadata. This data holds valuable insights about developer productivity and AI collaboration quality, but currently requires manual analysis to extract meaningful patterns.

Users need actionable coaching feedback to improve their AI collaboration skills. The insights should be:
1. **Automated** - Generated without manual effort
2. **Actionable** - Specific recommendations, not just metrics
3. **Evidence-based** - Backed by actual data from their sessions
4. **Progressive** - Track improvement over time

## Decision

Build a Coaching Insights Engine with the following architecture:

### 1. Data Collection Layer

**Sources:**
- **Events** (primary): Local JSONL + Graph API fallback
- **Sprint files**: Task completion, progress tracking
- **Session metadata**: Duration, flow state, context pressure
- **Git commits**: Frequency, size, patterns (via local git)

**Collection Strategy:**
```
┌─────────────────┐     ┌─────────────────┐
│ Local Events    │────▶│                 │
│ (.jsonl)        │     │   Data          │
├─────────────────┤     │   Collector     │────▶ InsightData
│ Sprint Files    │────▶│                 │
│ (markdown)      │     │   (aggregates   │
├─────────────────┤     │    & normalizes)│
│ Git Log         │────▶│                 │
│ (local repo)    │     └─────────────────┘
└─────────────────┘
```

### 2. Analysis Layer

**Four Analyzer Modules:**

| Analyzer | Input | Output |
|----------|-------|--------|
| EfficiencyAnalyzer | Sessions, events, context metrics | Time-to-flow, load times, interruptions |
| PatternAnalyzer | Events, ADR refs, pattern usage | Adoption rates, new patterns detected |
| QualityAnalyzer | Tasks, commits, handoffs | Completion rates, velocity, handoff quality |
| AntiPatternDetector | All sources | Abandoned tasks, context loss, repeated mistakes |

**Analysis Flow:**
```
InsightData ────▶ [Analyzer 1] ────▶ RawInsights[]
             ├──▶ [Analyzer 2] ────▶ RawInsights[]
             ├──▶ [Analyzer 3] ────▶ RawInsights[]
             └──▶ [Analyzer 4] ────▶ RawInsights[]
                                        │
                                        ▼
                              InsightAggregator
                                        │
                                        ▼
                              CoachingReport
```

### 3. AI Enhancement Layer

**When to use Claude API:**
- Synthesizing multiple data points into narrative insights
- Generating personalized recommendations
- Detecting nuanced patterns (e.g., "You tend to abandon tasks after 3 days")

**When NOT to use Claude API:**
- Simple metric calculations (handled by analyzers)
- Threshold comparisons
- Data aggregation

**Prompt Template Structure:**
```typescript
interface InsightPrompt {
  category: 'efficiency' | 'patterns' | 'quality' | 'anti-patterns';
  dataPoints: DataPoint[];
  userContext: {
    projectName: string;
    totalSessions: number;
    analysisWindow: string; // e.g., "last 30 days"
  };
  outputFormat: 'insight' | 'recommendation' | 'summary';
}
```

### 4. Storage Layer (Supabase)

**Schema:**
```sql
-- Insight runs track when analysis was performed
CREATE TABLE insight_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  graph_id TEXT,
  run_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  overall_score INTEGER, -- 0-100
  summary TEXT,
  data_window_start TIMESTAMPTZ,
  data_window_end TIMESTAMPTZ,
  metadata JSONB
);

-- Individual insights from each run
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES insight_runs(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- efficiency, patterns, quality, anti-patterns
  severity TEXT DEFAULT 'info', -- info, suggestion, warning, critical
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  metric_value NUMERIC, -- optional numeric score
  metric_target NUMERIC, -- optional target/baseline
  evidence JSONB, -- supporting data points
  recommendations JSONB, -- actionable suggestions
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track insight trends over time
CREATE TABLE insight_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  measured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_insight_runs_user ON insight_runs(user_id, run_at DESC);
CREATE INDEX idx_insight_runs_project ON insight_runs(project_id);
CREATE INDEX idx_insights_run ON insights(run_id);
CREATE INDEX idx_insights_category ON insights(category);
CREATE INDEX idx_trends_user_metric ON insight_trends(user_id, metric_name, measured_at DESC);
```

### 5. CLI Interface

**Command: `ginko insights`**
```bash
ginko insights              # Run analysis, display summary
ginko insights --detailed   # Show all insights with evidence
ginko insights --category efficiency  # Filter by category
ginko insights --json       # Output as JSON
ginko insights --sync       # Sync results to Supabase
ginko insights --days 14    # Analysis window (default: 30)
```

**Output Format:**
```
Coaching Insights | chris@watchhill.ai | ginko
Analysis window: Dec 1 - Dec 15, 2025

Session Efficiency                              Score: 85/100
  ★ Time-to-flow: 32s average (excellent)
  ◐ Context loads increased 15% - consider archiving

Pattern Adoption                                Score: 78/100
  ★ ADR-002 referenced 15 times this period
  ○ 2 new patterns detected - consider documenting

Collaboration Quality                           Score: 82/100
  ★ Task completion: 85% (up from 75%)
  ◐ Handoff completeness: 70% - add more context

Anti-Patterns                                   Score: 65/100
  ⚠️ 2 abandoned tasks detected
  💡 3 sessions without handoff

────────────────────────────────────────────────────────────
Overall Score: 78/100 (Good)
Trend: ↑ 5 points from last analysis

Run `ginko insights --detailed` for full analysis
```

### 6. Dashboard Integration

**Insights Page Features:**
- Overall score with trend indicator
- Category breakdown with expandable details
- Evidence links (click to see source events)
- Historical chart (score over time)
- "Run Analysis" button or CLI instructions

**API Endpoints:**
```
GET  /api/v1/insights/latest?userId=X&projectId=Y
GET  /api/v1/insights/runs?userId=X&limit=10
GET  /api/v1/insights/trends?userId=X&metric=time_to_flow
POST /api/v1/insights/run  # Trigger new analysis (optional)
```

## Insight Categories (MVP)

### 1. Session Efficiency
| Metric | Calculation | Good | Warning |
|--------|-------------|------|---------|
| Time-to-flow | Avg time from `ginko start` to first event | < 60s | > 120s |
| Context load time | From start command timing | < 3s | > 10s |
| Session duration | Time between first/last event | 1-4h | > 6h |
| Cold start ratio | Sessions without prior handoff | < 30% | > 60% |

### 2. Pattern Adoption
| Metric | Calculation | Good | Warning |
|--------|-------------|------|---------|
| ADR reference rate | ADR mentions / total events | > 10% | < 2% |
| Pattern usage | Unique patterns applied | > 3 | 0 |
| Gotcha avoidance | Known gotchas not repeated | > 80% | < 50% |
| New pattern discovery | Patterns created this period | > 1/week | 0 |

### 3. Collaboration Quality
| Metric | Calculation | Good | Warning |
|--------|-------------|------|---------|
| Task completion rate | Completed / started tasks | > 80% | < 50% |
| Sprint velocity | Tasks per sprint | Consistent | Declining |
| Commit frequency | Commits per session | 2-5 | 0 |
| Handoff completeness | Word count + structure | > 200 words | < 50 words |

### 4. Anti-Patterns
| Pattern | Detection | Severity |
|---------|-----------|----------|
| Abandoned tasks | In progress > 5 days, no events | Warning |
| Context loss | Session end without handoff | Suggestion |
| Repeated mistakes | Same gotcha hit 2+ times | Warning |
| Long silent sessions | > 2h without events | Info |
| Scope creep | Tasks added mid-sprint | Info |

## Scoring Algorithm

**Overall Score Calculation:**
```typescript
const weights = {
  efficiency: 0.25,
  patterns: 0.25,
  quality: 0.30,
  antiPatterns: 0.20
};

function calculateOverallScore(categoryScores: Record<string, number>): number {
  return Object.entries(weights).reduce((total, [category, weight]) => {
    return total + (categoryScores[category] * weight);
  }, 0);
}
```

**Category Score:**
- Each insight has a score impact (+/- points)
- Base score: 70 (neutral)
- Good findings: +5 to +15 points
- Warnings: -10 to -20 points
- Critical: -25 to -40 points

## Consequences

### Positive
- Developers get actionable feedback on collaboration quality
- Objective metrics replace subjective assessments
- Trends visible over time enable continuous improvement
- Evidence-backed insights build trust

### Negative
- Requires Claude API calls for synthesis (cost)
- Analysis needs sufficient data (cold start problem)
- Privacy considerations for team insights

### Mitigations
- Cache analysis results (don't recompute on every view)
- Minimum data threshold before generating insights
- Team insights opt-in only, aggregated (no individual callouts)

## Implementation Plan

1. **TASK-1**: This ADR (architecture design) ✓
2. **TASK-2**: Supabase schema migration
3. **TASK-3**: Data collection module
4. **TASK-4-7**: Four analyzer implementations
5. **TASK-8**: CLI command
6. **TASK-9**: Dashboard integration

## References

- ADR-033: Context Pressure Mitigation (session logging)
- ADR-043: Event-Based Context Loading
- ADR-052: Unified Entity Naming Convention
- packages/cli/src/lib/context-metrics.ts (existing metrics code)
- packages/cli/src/utils/pattern-confidence.ts (confidence scoring)
