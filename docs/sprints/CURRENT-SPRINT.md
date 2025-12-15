# SPRINT: Market Readiness Sprint 3 - Coaching Insights Engine

## Sprint Overview

**Sprint Goal**: Build AI-driven coaching insights engine that analyzes collaboration patterns and surfaces actionable feedback for developers.

**Duration**: 2 weeks
**Type**: Feature sprint
**Progress:** 78% (7/9 tasks complete)

**Success Criteria:**
- [ ] CLI command `ginko insights` generates analysis
- [ ] Insights stored in Supabase
- [ ] Dashboard displays coaching insights
- [ ] At least 4 insight categories implemented

---

## Sprint Tasks

### TASK-1: Insights Engine Architecture Design (3h)
**Status:** [x] Complete
**Priority:** HIGH
**ID:** e005_s03_t01

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
- `docs/adr/ADR-053-coaching-insights-engine.md` (created)

---

### TASK-2: Supabase Schema for Insights (2h)
**Status:** [x] Complete
**Priority:** HIGH
**ID:** e005_s03_t02

**Goal:** Create Supabase tables for storing coaching insights.

**Schema:** See migration file for full schema including:
- `insight_runs` - Analysis run tracking with overall scores
- `insights` - Individual insights with evidence/recommendations
- `insight_trends` - Historical metric tracking for sparklines
- Row Level Security (RLS) policies
- Views for dashboard queries

**Files:**
- `dashboard/supabase/migrations/20251215_coaching_insights.sql` (created)
- `dashboard/src/lib/insights/types.ts` (created)

---

### TASK-3: Data Collection Module (4h)
**Status:** [x] Complete
**Priority:** HIGH
**ID:** e005_s03_t03

**Goal:** Build module to collect and prepare data for insight analysis.

**Data Sources:**
- Events from local JSONL (with ADR/task/pattern extraction)
- Task completions from sprint markdown
- Commit logs from git (with stats)
- Session metadata from archive files
- Patterns and gotchas from local docs

**Files:**
- `packages/cli/src/lib/insights/types.ts` (created)
- `packages/cli/src/lib/insights/data-collector.ts` (created)
- `packages/cli/src/lib/insights/index.ts` (created)

---

### TASK-4: Session Efficiency Analyzer (4h)
**Status:** [x] Complete
**Priority:** HIGH
**ID:** e005_s03_t04

**Goal:** Implement analysis for session efficiency insights.

**Implemented Metrics:**
- Time-to-flow analysis (excellent/good/warning thresholds)
- Context load time tracking
- Session duration analysis (optimal range detection)
- Cold start ratio calculation

**Files:**
- `packages/cli/src/lib/insights/analyzers/efficiency.ts` (created)

---

### TASK-5: Pattern Adoption Analyzer (4h)
**Status:** [x] Complete
**Priority:** HIGH
**ID:** e005_s03_t05

**Goal:** Implement analysis for pattern adoption insights.

**Implemented Metrics:**
- ADR adoption analysis (reference rate in events/commits)
- Pattern usage tracking (library size, confidence levels)
- Gotcha avoidance rate (encounters vs resolutions)
- New pattern discovery detection

**Files:**
- `packages/cli/src/lib/insights/analyzers/patterns.ts` (created)

---

### TASK-6: Collaboration Quality Analyzer (4h)
**Status:** [x] Complete
**Priority:** HIGH
**ID:** e005_s03_t06

**Goal:** Implement analysis for collaboration quality insights.

**Implemented Metrics:**
- Task completion rate (with completion/abandonment tracking)
- Commit frequency per session
- Commit size analysis (optimal range detection)
- Handoff quality (rate of sessions with handoffs)
- Sprint velocity via events per day

**Files:**
- `packages/cli/src/lib/insights/analyzers/quality.ts` (created)

---

### TASK-7: Anti-Pattern Detector (4h)
**Status:** [x] Complete
**Priority:** MEDIUM
**ID:** e005_s03_t07

**Goal:** Implement detection of anti-patterns and improvement opportunities.

**Implemented Detections:**
- Abandoned/stuck tasks (5+ days in progress, 10+ critical)
- Context loss (sessions without handoff)
- Long silent sessions (hours without logging)
- Repeated gotcha encounters (same gotcha hit multiple times)
- Scope creep (ad-hoc tasks ratio)

**Files:**
- `packages/cli/src/lib/insights/analyzers/anti-patterns.ts` (created)

---

### TASK-8: CLI `ginko insights` Command (4h)
**Status:** [ ] Not Started
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
**Status:** [ ] Not Started
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

[To be filled as work progresses]

## Next Steps

[To be updated during sprint]

## Blockers

[To be updated if blockers arise]
