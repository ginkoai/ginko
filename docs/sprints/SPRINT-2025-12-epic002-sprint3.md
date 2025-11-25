# SPRINT: EPIC-002 Sprint 3 - Pattern & Gotcha Surfacing

## Sprint Overview

**Sprint Goal**: Surface pattern guidance and gotcha warnings to AI at session start
**Duration**: 2 weeks (2025-12-01 to 2025-12-15)
**Type**: Feature sprint (UX + API endpoints)
**Progress:** 100% (4/4 tasks complete)

**Success Criteria:**
- Patterns and gotchas visible in ginko start output
- API endpoints for querying task patterns/gotchas
- Gotcha resolution tracking operational
- AI constraint context includes patterns + gotchas

---

## Sprint Tasks

### TASK-1: Display Patterns & Gotchas in ginko start (4h)
**Status:** [x] Complete
**Priority:** HIGH
**Owner:** Chris Norton

**Goal:** Show pattern guidance and gotcha warnings alongside ADR constraints in session start

**Acceptance Criteria:**
- [x] Patterns displayed under current task: `Apply: output-formatter.ts`
- [x] Gotchas displayed under current task: `Avoid: verbose-output-gotcha`
- [ ] Work mode affects verbosity (deferred - Hack & Ship minimal, Full Planning detailed)
- [x] Integration with existing sprint checklist display

**Implementation Notes:**
Use pattern from packages/cli/src/lib/output-formatter.ts for display structure.
Apply pattern_sprint_display for checklist formatting.
Avoid the verbose-output-gotcha that overwhelms users with too much context.

**Files:**
- Update: `packages/cli/src/lib/output-formatter.ts`
- Update: `packages/cli/src/lib/sprint-loader.ts`
- Update: `packages/cli/src/commands/start/start-reflection.ts`

Follow: ADR-002, ADR-033, ADR-043

**Completed:** 2025-11-25
- Added patterns/gotchas to AISessionContext interface
- Added display in formatHumanOutput() with color coding (blue=patterns, red=gotchas)
- Updated buildAIContext() to populate patterns/gotchas from sprint task
- Improved gotcha extraction regex to prioritize explicit kebab-case names
- Fixed pre-existing type errors in log.ts and event-logger.ts (added 'gotcha' category)

---

### TASK-2: API Endpoints for Pattern & Gotcha Queries (3h)
**Status:** [x] Complete
**Priority:** HIGH
**Owner:** Chris Norton

**Goal:** Enable programmatic access to task patterns and gotchas

**Acceptance Criteria:**
- [x] GET /api/v1/task/:id/patterns - returns patterns for a task
- [x] GET /api/v1/task/:id/gotchas - returns gotchas for a task
- [x] GET /api/v1/pattern/:id/usages - returns where a pattern is applied
- [x] Response includes relationship metadata (source, extracted_at)

**Implementation Notes:**
See example from dashboard/src/app/api/v1/task/[id]/constraints/route.ts for structure.
Use pattern_cypher_query for Neo4j graph queries.

**Files:**
- Create: `dashboard/src/app/api/v1/task/[id]/patterns/route.ts`
- Create: `dashboard/src/app/api/v1/task/[id]/gotchas/route.ts`
- Create: `dashboard/src/app/api/v1/pattern/[id]/usages/route.ts`

Follow: ADR-043

**Completed:** 2025-11-25
- Created patterns endpoint with APPLIES_PATTERN relationship queries
- Created gotchas endpoint with AVOID_GOTCHA relationship queries, sorted by severity
- Created pattern usages endpoint showing APPLIED_IN (files) and APPLIES_PATTERN (tasks)
- All endpoints follow constraints route pattern with relationship metadata

---

### TASK-3: Pattern Severity & Confidence Levels (2h)
**Status:** [x] Complete
**Priority:** MEDIUM
**Owner:** Chris Norton

**Goal:** Add metadata to patterns for prioritization and trust

**Acceptance Criteria:**
- [x] Pattern nodes have `confidence: high | medium | low` property
- [x] Confidence based on usage count and age
- [x] Higher confidence patterns shown first in output
- [x] API endpoints return confidence in response

**Implementation Notes:**
Apply pattern_progressive_trust for confidence calculation.
Watch out for cold-start issues with new patterns (default to medium).

**Files:**
- Update: `dashboard/src/app/api/v1/sprint/sync/route.ts`
- Update: `packages/cli/src/lib/sprint-loader.ts`
- Create: `packages/cli/src/utils/pattern-confidence.ts`

Follow: ADR-002

**Completed:** 2025-11-25
- Created pattern-confidence.ts utility with confidence calculation (usage count + age)
- Added mergeNode() method to CloudGraphClient for upsert with usage tracking
- Updated sprint sync to use mergeNode for patterns/gotchas with confidence properties
- Updated patterns API to return confidenceScore/usageCount and sort by confidence
- Updated gotchas API to return confidence and sort by severity then confidence
- Gotchas now include resolutionRate calculation

---

### TASK-4: Gotcha Resolution Tracking (3h)
**Status:** [x] Complete
**Priority:** MEDIUM
**Owner:** Chris Norton

**Goal:** Track when gotchas are encountered and resolved to improve AI learning

**Acceptance Criteria:**
- [x] Gotcha nodes have `encounters: number` property
- [x] Gotcha nodes have `resolutions: number` property
- [x] `ginko log --category=gotcha` increments encounter count
- [x] Resolution events link to fix commits
- [x] Gotcha effectiveness score: resolutions / encounters

**Implementation Notes:**
Use pattern from packages/cli/src/lib/event-queue.ts for event tracking.
Beware of over-counting from repeated session starts.
Gotcha: ensure atomic updates to counter properties.

**Files:**
- Update: `dashboard/src/app/api/v1/sprint/sync/route.ts`
- Update: `packages/cli/src/utils/command-helpers.ts`
- Create: `dashboard/src/app/api/v1/gotcha/[id]/resolve/route.ts`

Follow: ADR-033, ADR-043

**Completed:** 2025-11-25
- Created POST /api/v1/gotcha/:id/encounter endpoint (atomic counter increment)
- Created POST /api/v1/gotcha/:id/resolve endpoint (links to commit, creates RESOLVED_BY relationship)
- Added GET /api/v1/gotcha/:id/resolve endpoint for resolution history
- Added extractGotchaReferences() utility in command-helpers.ts (supports 4 patterns)
- Added recordGotchaEncounter(), resolveGotcha(), getGotchaResolutions() to GraphApiClient
- Updated ginko log to detect gotcha references and track encounters via API
- Effectiveness score calculated as: (resolutions / encounters) * 100

---

## Related Documents

- **EPIC**: [EPIC-002: AI-Native Sprint Graphs](../epics/EPIC-002-ai-native-sprint-graphs.md)
- **Previous Sprint**: [EPIC-002 Sprint 2](./SPRINT-2025-11-epic002-sprint2.md)
- **ADRs**: ADR-002, ADR-033, ADR-043

---

**Sprint Status**: Complete ✅
**Start Date**: 2025-12-01
**Completed**: 2025-11-25
**Created By**: Chris Norton
