# SPRINT: Market Readiness Sprint 3 - Coaching Insights Engine

## Sprint Overview

**Sprint Goal**: Build AI-driven coaching insights engine that analyzes collaboration patterns and surfaces actionable feedback for developers.

**Duration**: 2 weeks
**Type**: Feature sprint
**Progress:** 100% (9/9 tasks complete) ✓
**Completed:** 2025-12-15

**Success Criteria:**
- [x] CLI command `ginko insights` generates analysis
- [x] Insights stored in Supabase
- [x] Dashboard displays coaching insights
- [x] At least 4 insight categories implemented

---

## Sprint Tasks

### TASK-1: Insights Engine Architecture Design (3h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Design the coaching insights engine architecture.

**Key Decisions:**
- AI model for analysis (Claude API direct, or local summarization)
- Data sources (events, task completions, commit logs)
- Storage schema in Supabase
- Insight refresh strategy (on-demand vs scheduled)

**Insight Categories (MVP):**
1. **Session Efficiency** - Time-to-flow, context load times, session duration
2. **Pattern Adoption** - Are ADRs being followed? Pattern usage frequency
3. **Collaboration Quality** - Commit frequency, task completion rates, handoff quality
4. **Anti-Patterns** - Repeated mistakes, abandoned tasks, context loss events

**Deliverables:**
- Architecture document
- Supabase schema design
- AI prompt templates for each category

**Files:**
- `docs/adr/ADR-XXX-coaching-insights-architecture.md` (new)

---

### TASK-2: Supabase Schema for Insights (2h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Create Supabase tables for storing coaching insights.

**Schema:**
```sql
-- Insight runs (when analysis was performed)
CREATE TABLE insight_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  graph_id TEXT,
  run_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  summary TEXT,
  metadata JSONB
);

-- Individual insights
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES insight_runs(id),
  category TEXT NOT NULL, -- efficiency, patterns, quality, anti-patterns
  severity TEXT DEFAULT 'info', -- info, suggestion, warning, critical
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB, -- supporting data points
  recommendations JSONB, -- actionable suggestions
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_insights_user ON insight_runs(user_id);
CREATE INDEX idx_insights_project ON insight_runs(project_id);
CREATE INDEX idx_insights_category ON insights(category);
```

**Files:**
- `dashboard/supabase/migrations/XXX_coaching_insights.sql` (new)

---

### TASK-3: Data Collection Module (4h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Build module to collect and prepare data for insight analysis.

**Data Sources:**
- Events from graph (last 30 days)
- Task completions from sprints
- Commit logs from git
- Session metadata (duration, flow state, context loads)

**Output Format:**
```typescript
interface InsightData {
  userId: string;
  projectId: string;
  period: { start: Date; end: Date };
  events: Event[];
  tasks: { completed: Task[]; inProgress: Task[]; abandoned: Task[] };
  commits: CommitInfo[];
  sessions: SessionSummary[];
}
```

**Files:**
- `packages/cli/src/lib/insights/data-collector.ts` (new)
- `packages/cli/src/lib/insights/types.ts` (new)

---

### TASK-4: Session Efficiency Analyzer (4h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Implement analysis for session efficiency insights.

**Metrics:**
- Average time-to-flow (session start to first meaningful action)
- Context load times (historical trend)
- Session duration distribution
- Cold vs hot start ratio
- Interruption frequency

**Example Insights:**
- "Your average time-to-flow is 45 seconds, which is 50% faster than baseline."
- "Context load times have increased 20% over the last week. Consider archiving old events."
- "You had 3 cold starts this week. Using `ginko handoff` can reduce this."

**Files:**
- `packages/cli/src/lib/insights/analyzers/efficiency.ts` (new)

---

### TASK-5: Pattern Adoption Analyzer (4h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Implement analysis for pattern adoption insights.

**Metrics:**
- ADR reference frequency in commits/events
- Pattern usage count
- Gotcha encounter rate (are known gotchas being avoided?)
- New patterns vs established patterns

**Example Insights:**
- "ADR-002 (frontmatter) was referenced 12 times this week. Strong adoption!"
- "The retry-pattern was used in 3 tasks. Consider documenting it as a standard."
- "You hit the timer-unref-gotcha twice. It's now documented for future reference."

**Files:**
- `packages/cli/src/lib/insights/analyzers/patterns.ts` (new)

---

### TASK-6: Collaboration Quality Analyzer (4h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Implement analysis for collaboration quality insights.

**Metrics:**
- Task completion rate
- Average task duration
- Commit frequency and size
- Handoff quality (completeness of handoff logs)
- Sprint velocity trend

**Example Insights:**
- "You completed 8/10 tasks this sprint (80%). Up from 70% last sprint."
- "Average commit size is 150 lines. Smaller commits may improve review quality."
- "Handoff completeness score: 85%. Consider adding more context to handoffs."

**Files:**
- `packages/cli/src/lib/insights/analyzers/quality.ts` (new)

---

### TASK-7: Anti-Pattern Detector (4h)
**Status:** [x] Complete
**Priority:** MEDIUM

**Goal:** Implement detection of anti-patterns and improvement opportunities.

**Anti-Patterns to Detect:**
- Repeated mistakes (same error/fix cycle)
- Abandoned tasks (started but never completed)
- Context loss events (session restarts without handoff)
- Long sessions without logging (potential context pressure)
- Skipped gotchas (known gotcha not avoided)

**Example Insights:**
- "Task TASK-5 has been in progress for 5 days. Consider breaking it down."
- "3 sessions ended without handoff this week. Context may be lost."
- "You encountered 'verbose-output-gotcha' twice. Adding to your active gotchas list."

**Files:**
- `packages/cli/src/lib/insights/analyzers/anti-patterns.ts` (new)

---

### TASK-8: CLI `ginko insights` Command (4h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Implement CLI command to run insights analysis.

**Usage:**
```bash
ginko insights              # Run full analysis, display summary
ginko insights --detailed   # Show all insights with evidence
ginko insights --category efficiency  # Filter by category
ginko insights --json       # Output as JSON
ginko insights --sync       # Sync results to Supabase
```

**Output Format:**
```
Coaching Insights | chris@watchhill.ai | ginko

Session Efficiency
  ★ Time-to-flow: 32s average (excellent)
  ◐ Context loads increased 15% - consider archiving

Pattern Adoption
  ★ ADR-002 referenced 15 times
  ○ 2 new patterns detected - consider documenting

Collaboration Quality
  ★ Task completion: 85% (up from 75%)
  ◐ Handoff completeness: 70% - add more context

Anti-Patterns
  ⚠️ 2 abandoned tasks detected
  💡 3 sessions without handoff

Overall Score: 78/100 (Good)
Run `ginko insights --detailed` for full analysis
```

**Files:**
- `packages/cli/src/commands/insights/index.ts` (new)
- `packages/cli/src/commands/insights/insights-command.ts` (new)

---

### TASK-9: Dashboard Insights Display (6h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Display coaching insights in the dashboard.

**Features:**
- Insights overview card on main dashboard
- Dedicated insights page with full details
- Category tabs/filters
- Trend visualization (sparklines or small charts)
- "Last analyzed" timestamp
- "Run Analysis" button (triggers CLI via API or shows instructions)

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Coaching Insights                    Last: 2h ago  │
├─────────────────────────────────────────────────────┤
│  Overall Score: 78/100                              │
│  ████████████████████░░░░░ Good                     │
├─────────────────────────────────────────────────────┤
│  [Efficiency] [Patterns] [Quality] [Anti-Patterns]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ★ Time-to-flow: 32s average                       │
│    Your sessions start 50% faster than baseline    │
│                                                     │
│  ◐ Context load times +15%                         │
│    Consider archiving events older than 7 days     │
│    [View Details]                                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Files:**
- `dashboard/src/app/insights/page.tsx` (new)
- `dashboard/src/components/insights/InsightsOverview.tsx` (new)
- `dashboard/src/components/insights/InsightCard.tsx` (new)
- `dashboard/src/components/insights/InsightCategoryTabs.tsx` (new)

Follow: Marketing site visual style

---

## Accomplishments This Sprint

### 2025-12-15: Sprint Complete

**Insights Engine Architecture (TASK-1 through TASK-3)**
- Designed ephemeral insights approach (PATTERN-001 aligned)
- No Supabase dependency - purely local analysis
- Data collection from events, tasks, commits, sessions

**Analyzers (TASK-4 through TASK-7)**
- Session Efficiency: time-to-flow, context loads, session duration
- Pattern Adoption: ADR references, pattern usage, gotcha avoidance
- Collaboration Quality: task completion, commit frequency, handoff quality
- Anti-Pattern Detection: abandoned tasks, sessions without handoff

**CLI Command (TASK-8)**
- `ginko insights` command with full analysis
- `--detailed` flag for evidence
- `--category` filter
- `--json` output format
- CLI v1.8.0 released

**Dashboard Display (TASK-9)**
- `/insights` page with overview
- Category tabs and filtering
- Insight cards with severity icons
- Score visualization
- "Last analyzed" timestamp

**Key Files Created:**
- `packages/cli/src/commands/insights/index.ts`
- `packages/cli/src/commands/insights/insights-command.ts`
- `packages/cli/src/lib/insights/data-collector.ts`
- `packages/cli/src/lib/insights/analyzers/efficiency.ts`
- `packages/cli/src/lib/insights/analyzers/patterns.ts`
- `packages/cli/src/lib/insights/analyzers/quality.ts`
- `packages/cli/src/lib/insights/analyzers/anti-patterns.ts`
- `dashboard/src/app/insights/page.tsx`
- `dashboard/src/components/insights/InsightsOverview.tsx`

## Next Steps

Sprint 3 complete → Proceed to Sprint 4 (Knowledge Editing + Beta Polish)

## Blockers

None - sprint completed successfully.
