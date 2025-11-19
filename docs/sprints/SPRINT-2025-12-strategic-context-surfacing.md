# SPRINT-2025-12: Strategic Context Surfacing

## Sprint Overview

**Sprint Goal**: Surface strategic context (charter, team activity, patterns/gotchas) in `ginko start` to improve AI partner readiness from 6.5/10 to 7/10.

**Epic**: [EPIC-001: Strategic Context & Dynamic Adaptivity](../epics/EPIC-001-strategic-context-and-dynamic-adaptivity.md)

**Duration**: 1 week (TBD to TBD)

**Type**: Feature sprint (AI-UX enhancement)

**Philosophy**: AI partners need strategic north star (WHY) alongside tactical context (WHERE). Charter provides mission, team provides coordination signals, patterns provide accumulated wisdom.

**Success Criteria:**
- Charter visible in `ginko start` (when exists)
- Team activity feed shows last 7 days (when team > 1)
- Relevant patterns/gotchas surfaced (tag-matched)
- AI readiness improved to 7/10 (from 6.5/10)
- Clarifying questions reduced to 3-4 (from 5-7)
- Startup time remains <2.5s (currently <2s)

**Progress:** 33% (1/3 tasks complete)

---

## Accomplishments This Sprint

### 2025-11-19: TASK-1 Complete - Charter Integration

**Charter Creation & Display**: Project charter now surfaces in every session, improving AI partner readiness from session start.

**Completed:**
- ✅ Created PROJECT-CHARTER.md through AI-mediated natural conversation (~30 min)
  - Captured vision, problems, users, success criteria, scope, constraints, risks
  - Meta-validation: Charter creation process itself demonstrated Ginko's magic
  - User feedback: "This is the kind of magic we must bring to every aspect of ginko"

- ✅ Implemented charter-loader.ts (charter-loader.ts:1-195)
  - Parses markdown charter into structured data (purpose, goals, criteria, scope)
  - Git-root aware: Uses `git rev-parse --show-toplevel` (not process.cwd)
  - Handles missing charter gracefully
  - Extracts: purpose, goals, success criteria, scope boundaries

- ✅ Integrated charter into strategic context (context-loader-events.ts:232-268)
  - Loads charter from filesystem in loadRecentEvents()
  - Merges with GraphQL strategic context (filesystem takes precedence)
  - Logs: "Charter loaded from filesystem (X goals, Y criteria)"

- ✅ Implemented mode-aware display (start-reflection.ts:271-339)
  - Hack & Ship: Purpose only (minimal)
  - Think & Build: Purpose + top 3 goals (balanced)
  - Full Planning: Purpose + top 5 goals (comprehensive)
  - Clean formatting with proper spacing

**Impact:**
- AI partners see project mission, goals, and success criteria immediately
- Expected reduction in clarifying questions: 5-7 → 3-4
- Strategic north star visible every session
- Foundation for TASK-2 (team activity) and TASK-3 (patterns)

**Files:**
- packages/cli/src/lib/charter-loader.ts (new, 195 lines)
- packages/cli/src/lib/context-loader-events.ts (modified)
- packages/cli/src/commands/start/start-reflection.ts (modified)
- docs/PROJECT-CHARTER.md (new, 10KB)

**Commit:** fe7830f

---

## Strategic Context

### The Problem

**Current State:**
AI partners starting a `ginko start` session receive excellent tactical context:
- ✅ Flow state and resume point
- ✅ Uncommitted files and git status
- ✅ Recent events (last 50)
- ✅ Active sprint progress

But they miss critical strategic context:
- ❌ **Project mission** (WHY are we building this?)
- ❌ **Success criteria** (WHAT defines done?)
- ❌ **Team activity** (WHO is working on WHAT?)
- ❌ **Accumulated wisdom** (WHICH patterns apply? WHICH gotchas to avoid?)

**Impact:**
- AI asks 5-7 clarifying questions at session start
- Makes decisions without understanding project goals
- Reinvents patterns that already exist
- Repeats mistakes that were previously discovered
- Works in isolation without team coordination

### The Insight

**Strategic context exists but isn't surfaced:**
- Charter at `docs/PROJECT-CHARTER.md` (88% of projects don't have one, but when they do, it's comprehensive)
- Team events in graph (shared=true, decisions/achievements/blockers)
- Patterns and gotchas in context modules (`.ginko/context/modules/*.md`)
- Decision breadcrumbs in ADRs/PRDs (WHY rationale)

**We have the data, we just need to load and display it.**

### Business Impact

**With strategic context:**
- AI partner readiness: 6.5/10 → 7/10
- Clarifying questions: 5-7 → 3-4
- Time to productive work: Faster (less back-and-forth)
- Decision quality: Higher (aligned to charter)
- Team coordination: Better (see teammate activity)
- Pattern application: Proactive (see relevant practices)

**Foundation for future:**
- Dynamic adaptivity (Sprint 2) builds on charter visibility
- Knowledge capture nudging (Sprint 3) needs patterns surfaced
- AI learning (Post-MVP) learns from strategic context usage

---

## Sprint Tasks

### TASK-1: Charter Integration
**Status:** ✅ Complete (2025-11-19)
**Owner:** Chris Norton + Claude
**Effort:** 6 hours actual
**Priority:** CRITICAL

**Goal:** Surface project charter in `ginko start` output when it exists

**Acceptance Criteria:**
- [ ] Charter loader created in `context-loader-events.ts`
- [ ] Parses `docs/PROJECT-CHARTER.md` (purpose, goals, success criteria, constraints, non-goals)
- [ ] Displays charter section in `start-reflection.ts` output
- [ ] Mode-aware display:
  - Hack & Ship: Purpose only (1 line)
  - Think & Build: Purpose + top 3 goals (4-5 lines)
  - Full Planning: Full summary (8-12 lines)
- [ ] Handles missing charter gracefully (friendly prompt, not blocking)
- [ ] Shows freshness indicator (updated X days ago, warning if >30d)
- [ ] Creates structured charter object for AI (separate from human display)
- [ ] Loads in <100ms (parallel with other context)

**Implementation Details:**

```typescript
// packages/cli/src/lib/charter-loader.ts (new file)
export interface Charter {
  purpose: string;
  goals: Array<{ id: number; text: string; metric?: string; target?: string }>;
  successCriteria: Array<{ id: number; text: string; measurable: boolean }>;
  constraints: string[];
  nonGoals: string[];
  updatedAt: Date;
  version: string;
}

export async function loadCharter(projectRoot: string): Promise<Charter | null> {
  const charterPath = path.join(projectRoot, 'docs/PROJECT-CHARTER.md');
  if (!fs.existsSync(charterPath)) return null;

  const content = await fs.readFile(charterPath, 'utf-8');
  return parseCharterMarkdown(content);
}

function parseCharterMarkdown(content: string): Charter {
  // Parse markdown sections (Purpose, Goals, Success Criteria, etc.)
  // Return structured charter object
}
```

```typescript
// packages/cli/src/commands/start/start-reflection.ts (modify)
// Add to context loading section
const charter = await loadCharter(projectRoot);

// Add to output display
if (charter) {
  const charterSection = formatCharterSection(charter, workMode);
  output += `\n${charterSection}\n`;
}
```

**Display Format:**

```
📜 Project Charter
   Purpose: Git-native context management for AI-assisted development

   🎯 Goals:
   1. Sub-2s session startup (target: <2000ms)
   2. 7-8/10 AI partner readiness (target: 1-3 clarifying questions)
   3. Team coordination (target: <5% conflict rate)

   ⚠️ Updated 45 days ago - Consider reviewing
```

**Unit Tests:**
- [ ] `charter-loader.test.ts`: Test charter parsing (valid/invalid/missing)
- [ ] Test mode-aware formatting (Hack & Ship, Think & Build, Full Planning)
- [ ] Test freshness calculation (days since update)
- [ ] Test structured object creation for AI context

**Human UAT:**
- [ ] Test with project that has charter → Charter displayed correctly
- [ ] Test with project without charter → Friendly prompt, not blocking
- [ ] Test with stale charter (>30d) → Freshness warning shown
- [ ] Verify AI partner readiness improvement (6.5 → 6.8/10)

**Files:**
- Create: `packages/cli/src/lib/charter-loader.ts`
- Create: `packages/cli/test/unit/charter-loader.test.ts`
- Modify: `packages/cli/src/commands/start/start-reflection.ts`

**Related:** ADR-047 (to be created), Epic TASK-1

---

### TASK-2: Team Activity Feed
**Status:** Not Started
**Owner:** TBD
**Effort:** 8-10 hours
**Priority:** HIGH

**Goal:** Show teammate activity (decisions, achievements, blockers) from last 7 days

**Acceptance Criteria:**
- [ ] Team events query created (shared=true, last 7d, exclude self)
- [ ] Consolidated API endpoint: `/api/v1/context/team-activity`
- [ ] Parses team events by category (decisions, achievements, blockers)
- [ ] Mode-aware display:
  - Hack & Ship: Count only ("3 team decisions this week")
  - Think & Build: Top 5 items with names/timeframes (default)
  - Full Planning: Expanded feed with rationale excerpts
- [ ] Handles solo projects gracefully (hide section entirely)
- [ ] Detects team size (contributors in last 30d)
- [ ] Loads in <200ms (parallel query)

**Implementation Details:**

```typescript
// dashboard/src/app/api/v1/context/team-activity/route.ts (new)
export async function GET(request: Request) {
  const { userId, projectId } = parseQuery(request);

  const query = `
    MATCH (user:User)-[:LOGGED]->(e:Event)
    WHERE e.project_id = $projectId
      AND e.user_id != $userId
      AND e.shared = true
      AND e.category IN ['decision', 'achievement', 'git']
      AND e.timestamp > datetime() - duration({days: 7})
    RETURN e, user.name
    ORDER BY e.timestamp DESC
    LIMIT 20
  `;

  const events = await runQuery(query, { projectId, userId });
  return Response.json(groupByCategory(events));
}
```

```typescript
// packages/cli/src/lib/context-loader-events.ts (modify)
export async function loadTeamActivity(
  userId: string,
  projectId: string
): Promise<TeamActivity> {
  const response = await fetch(
    `${API_URL}/api/v1/context/team-activity?userId=${userId}&projectId=${projectId}`
  );
  return response.json();
}
```

**Display Format:**

```
👥 Team Activity (7d)
   Decisions:
   - Alice: PostgreSQL over MySQL for scalability (2d ago)
   - Bob: OAuth2 approach with refresh tokens (5d ago)

   Achievements:
   - Charlie: Auth system deployed to production (1d ago)
   - Dana: All unit tests passing (3h ago)

   Blockers:
   - Eve: Waiting on API keys from vendor (2d)
```

**Unit Tests:**
- [ ] `team-activity-loader.test.ts`: Test team query (solo/team, recent/old)
- [ ] Test category grouping (decisions, achievements, blockers)
- [ ] Test solo project handling (returns empty, hidden in display)
- [ ] Test team size detection (count contributors in last 30d)
- [ ] Test mode-aware formatting

**Human UAT:**
- [ ] Test with solo project → No team section displayed
- [ ] Test with team project (3 contributors) → Team activity visible
- [ ] Test with recent team events → Correct grouping and timeframes
- [ ] Test with no recent team events → "No team activity this week"
- [ ] Verify AI partner sees coordination signals

**Files:**
- Create: `dashboard/src/app/api/v1/context/team-activity/route.ts`
- Modify: `packages/cli/src/lib/context-loader-events.ts`
- Create: `packages/cli/test/unit/team-activity-loader.test.ts`
- Modify: `packages/cli/src/commands/start/start-reflection.ts`

**Related:** ADR-043 (Event Stream), Epic TASK-2

---

### TASK-3: Relevant Patterns & Gotchas
**Status:** Not Started
**Owner:** TBD
**Effort:** 8-10 hours
**Priority:** MEDIUM-HIGH

**Goal:** Surface accumulated wisdom (patterns to apply, gotchas to avoid) matched to current work

**Acceptance Criteria:**
- [ ] Query patterns/gotchas by tag matching (recent events + file areas)
- [ ] Consolidated API endpoint: `/api/v1/context/relevant-practices`
- [ ] Score relevance (tag overlap × recency × impact)
- [ ] Mode-aware display:
  - Hack & Ship: Hide (speed focus, minimal guidance)
  - Think & Build: Top 3 patterns + top 2 gotchas (default)
  - Full Planning: Top 5 patterns + top 3 gotchas + decision breadcrumbs
- [ ] Show decision breadcrumbs (WHY references from ADRs/PRDs)
- [ ] Loads in <200ms (parallel query with caching)

**Implementation Details:**

```typescript
// dashboard/src/app/api/v1/context/relevant-practices/route.ts (new)
export async function GET(request: Request) {
  const { projectId, tags, workMode } = parseQuery(request);

  // Query patterns and gotchas with tag overlap
  const query = `
    MATCH (node)
    WHERE node:Pattern OR node:Gotcha
      AND node.project_id = $projectId
      AND ANY(tag IN node.tags WHERE tag IN $tags)
    RETURN node, labels(node) as type,
           size([tag IN node.tags WHERE tag IN $tags]) as tagOverlap
    ORDER BY tagOverlap DESC, node.relevance DESC
    LIMIT ${workMode === 'full-planning' ? 8 : 5}
  `;

  const practices = await runQuery(query, { projectId, tags });
  return Response.json({
    patterns: practices.filter(p => p.type.includes('Pattern')),
    gotchas: practices.filter(p => p.type.includes('Gotcha'))
  });
}
```

**Display Format:**

```
🧠 Relevant Patterns & Gotchas
   Apply:
   - #auth → JWT refresh tokens (Pattern-28)
   - #database → Connection pooling (Pattern-15)
   - #testing → Snapshot testing for UI (Pattern-42)

   Avoid:
   - #react → Stale closures in useEffect (Gotcha-05)
   - #postgres → Migration rollback ordering (Gotcha-19)

   Why:
   - Decision-042: PostgreSQL over MySQL (scalability + JSON)
   - ADR-039: Cloud-first pivot (cost + team collaboration)
```

**Unit Tests:**
- [ ] `relevant-practices-loader.test.ts`: Test tag matching (exact/overlap/none)
- [ ] Test relevance scoring (tag overlap × recency × impact)
- [ ] Test mode-aware filtering (limits, breadcrumbs)
- [ ] Test empty results (no matches)
- [ ] Test caching (5min TTL)

**Human UAT:**
- [ ] Test with tagged events → Relevant patterns surfaced
- [ ] Test with no tag overlap → No patterns shown (not noise)
- [ ] Test in Hack & Ship mode → Patterns hidden (speed focus)
- [ ] Test in Think & Build mode → Balanced patterns shown
- [ ] Test in Full Planning mode → Rich patterns + breadcrumbs
- [ ] Verify AI partner applies patterns proactively

**Files:**
- Create: `dashboard/src/app/api/v1/context/relevant-practices/route.ts`
- Modify: `packages/cli/src/lib/context-loader-events.ts`
- Create: `packages/cli/test/unit/relevant-practices-loader.test.ts`
- Modify: `packages/cli/src/commands/start/start-reflection.ts`

**Related:** ADR-039 (Knowledge Graph), Epic TASK-3

---

## Testing & Validation

### Unit Test Summary

**Total Tests**: ~40 tests across 3 files

**Coverage Target**: >80% for all new code

**Test Files:**
1. `charter-loader.test.ts` (12 tests)
2. `team-activity-loader.test.ts` (14 tests)
3. `relevant-practices-loader.test.ts` (14 tests)

**Run Command:**
```bash
npm test -- --testPathPattern="charter-loader|team-activity|relevant-practices"
```

---

### Human UAT Scenarios

#### UAT-1: New Solo Project (Hack & Ship)
**Setup:**
- Solo developer
- No charter
- Simple project (< 50 files, < 5K LOC)
- Work mode: Hack & Ship

**Test Steps:**
1. Run `ginko start`
2. Observe output

**Expected Results:**
- ✓ No charter section (project doesn't have one)
- ✓ Friendly note: "📜 Project Charter: Not found (create with: ginko charter)"
- ✓ No team activity section (solo project)
- ✓ No patterns section (Hack & Ship hides)
- ✓ Startup time <2s

**Success Criteria:**
- AI partner doesn't see noise (no charter, no team, no patterns)
- Gentle nudge to create charter (not blocking)
- Fast startup preserved

---

#### UAT-2: Growing Team Project (Think & Build)
**Setup:**
- 3 contributors (active in last 30d)
- Charter exists (created 14d ago)
- Moderate complexity (200 files, 20K LOC)
- Work mode: Think & Build

**Test Steps:**
1. Teammates log shared events (2 decisions, 1 achievement, 1 blocker)
2. Run `ginko start`
3. Observe output

**Expected Results:**
- ✓ Charter section visible (purpose + top 3 goals)
- ✓ Team activity section shows 4 items (grouped by category)
- ✓ Patterns section shows top 3 patterns + top 2 gotchas
- ✓ No decision breadcrumbs (Think & Build doesn't include)
- ✓ Startup time <2.5s

**Success Criteria:**
- AI partner sees strategic north star (charter purpose + goals)
- AI partner aware of team activity (coordination signals)
- AI partner sees relevant patterns (tag-matched to recent work)
- Clarifying questions reduced (5-7 → 3-4)

---

#### UAT-3: Complex Established Project (Full Planning)
**Setup:**
- 5+ contributors
- Charter exists (created 90d ago, stale)
- High complexity (500+ files, 100K+ LOC)
- Multiple ADRs/PRDs
- Work mode: Full Planning

**Test Steps:**
1. Run `ginko start`
2. Observe output
3. Count AI partner clarifying questions

**Expected Results:**
- ✓ Charter section: Full summary (purpose, goals, success criteria, constraints)
- ✓ Freshness warning: "⚠️ Updated 90 days ago - Consider reviewing"
- ✓ Team activity: Expanded feed with rationale excerpts
- ✓ Patterns: Top 5 patterns + top 3 gotchas
- ✓ Decision breadcrumbs: WHY references to ADRs/PRDs
- ✓ Startup time <2.5s

**Success Criteria:**
- AI partner has rich strategic context
- Stale charter flagged (drift detection foundation)
- Decision breadcrumbs provide rationale
- Clarifying questions minimal (1-3)
- AI readiness 7-8/10

---

#### UAT-4: Project Without Charter (Any Mode)
**Setup:**
- Team project (3 contributors)
- No charter
- Moderate complexity
- Work mode: Think & Build

**Test Steps:**
1. Run `ginko start`
2. Observe charter nudge
3. Run `ginko start` 2 more times (3 total)
4. Observe nudge escalation

**Expected Results:**
- ✓ Session 1: "📜 Project Charter: Not found (create with: ginko charter)"
- ✓ Sessions 2-3: Same gentle note (not escalating yet)
- ✓ No blocking behavior
- ✓ Team activity and patterns still shown

**Success Criteria:**
- Gentle nudging (not nagging)
- Value proposition clear
- Doesn't block work
- Foundation for Sprint 3 (nudge escalation after 3+ sessions)

---

#### UAT-5: Project With Stale Charter (Any Mode)
**Setup:**
- Charter exists (created 45d ago)
- Recent architectural changes (major ADRs)
- Work mode: Think & Build

**Test Steps:**
1. Log high-impact decision event (different from charter)
2. Run `ginko start`
3. Observe freshness warning

**Expected Results:**
- ✓ Charter section visible
- ✓ Freshness indicator: "⚠️ Updated 45 days ago"
- ✓ No drift warning yet (Sprint 3 feature)
- ✓ Charter content displayed normally

**Success Criteria:**
- Stale charter flagged
- Foundation for Sprint 3 (charter drift detection)
- AI partner aware charter might be outdated

---

### Performance Testing

**Baseline:** Current startup time <2s

**Target:** Startup time <2.5s with strategic context

**Test Scenarios:**
1. **Charter loading** (target: <100ms)
   - Small charter (1KB): <50ms
   - Large charter (5KB): <100ms
   - Missing charter: <10ms (fast fail)

2. **Team activity loading** (target: <200ms)
   - Solo project (0 team events): <50ms
   - Small team (10 events): <150ms
   - Large team (50 events): <200ms

3. **Patterns loading** (target: <200ms)
   - No tag matches: <50ms
   - Few matches (3-5): <150ms
   - Many matches (10+): <200ms

4. **Parallel loading** (target: <300ms)
   - All 3 sources in parallel
   - Measure total time (not sum)
   - p95 latency <300ms

**Run Command:**
```bash
npm run benchmark -- --test=strategic-context-loading
```

---

## Milestones

### Milestone 1: Charter Integration Complete (Day 3)
**Target:** Mid-sprint

**Deliverables:**
- ✓ Charter loader working
- ✓ Mode-aware display implemented
- ✓ Unit tests passing (12/12)
- ✓ UAT-1 and UAT-4 validated

**Success Criteria:**
- Charter visible when exists
- Graceful handling when missing
- Performance target met (<100ms)

---

### Milestone 2: Team Activity Complete (Day 5)
**Target:** End of week

**Deliverables:**
- ✓ Team activity API endpoint working
- ✓ Mode-aware display implemented
- ✓ Team size detection working
- ✓ Unit tests passing (14/14)
- ✓ UAT-2 validated

**Success Criteria:**
- Team activity visible for teams
- Hidden for solo projects
- Coordination signals clear
- Performance target met (<200ms)

---

### Milestone 3: Sprint Complete (Day 7)
**Target:** End of sprint

**Deliverables:**
- ✓ Patterns/gotchas surfacing working
- ✓ All 3 features integrated
- ✓ Unit tests passing (40/40)
- ✓ All 5 UAT scenarios validated
- ✓ Performance targets met (<2.5s total)
- ✓ AI readiness improved (6.5 → 7/10)

**Success Criteria:**
- Strategic context fully surfaced
- Mode-aware display working
- No performance regression
- Clarifying questions reduced (5-7 → 3-4)
- Foundation for Sprint 2 established

---

## Success Metrics

### Quantitative Targets

1. **AI Readiness**: 6.5/10 → 7/10
2. **Clarifying Questions**: 5-7 → 3-4
3. **Startup Time**: <2.5s (currently <2s)
4. **Context Coverage**: 80%
   - Charter: 100% (when exists)
   - Team: 100% (when team > 1)
   - Patterns: 60%+ (when relevant)
5. **Test Coverage**: >80% for all new code
6. **UAT Pass Rate**: 5/5 scenarios passing

### Qualitative Success

- AI partner understands project mission (charter)
- AI partner sees team coordination signals (activity)
- AI partner applies patterns proactively (relevance)
- No performance degradation felt by users
- Foundation solid for Sprint 2 (adaptivity)

---

## Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Charter parsing breaks on edge cases | Medium | Low | Comprehensive unit tests, graceful fallbacks |
| Team query slow (large teams) | Medium | Low | Limit to 20 events, cache 5min, parallel query |
| Pattern matching irrelevant | High | Medium | Relevance scoring, hide when no matches, UAT validation |
| Performance regression | High | Low | Parallel queries, caching, performance tests, --skip-strategic flag |
| Too much output (overwhelming) | Medium | Medium | Mode-aware display, compact format, hide when irrelevant |

---

## Sprint Retrospective

**To be completed:** End of sprint

### What Went Well
- TBD

### What Didn't Go Well
- TBD

### What We Learned
- TBD

### Action Items for Sprint 2
- TBD

---

## Related Documents

### Epic
- **[EPIC-001: Strategic Context & Dynamic Adaptivity](../epics/EPIC-001-strategic-context-and-dynamic-adaptivity.md)**

### Architecture Decision Records
- **[ADR-043](../adr/ADR-043-event-based-context-loading.md)** - Event-Based Context Loading
- **[ADR-039](../adr/ADR-039-knowledge-discovery-graph.md)** - Knowledge Discovery Graph
- **ADR-047** (to be created): Strategic Context Surfacing

### Code References
- Charter creation: `packages/cli/src/commands/charter.ts`
- Context loading: `packages/cli/src/lib/context-loader-events.ts`
- Session display: `packages/cli/src/commands/start/start-reflection.ts`
- Graph API: `dashboard/src/app/api/v1/context/initial-load/route.ts`

### Next Sprint
- **[SPRINT-2026-01-A: Dynamic Adaptivity](./SPRINT-2026-01-dynamic-adaptivity.md)**

---

**Sprint Status**: Planning
**Last Updated**: 2025-11-19
**Progress**: 0% (0/3 tasks complete)
