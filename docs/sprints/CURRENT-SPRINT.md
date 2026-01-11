# SPRINT: Product Roadmap Sprint 1 - Schema & Data Migration

## Sprint Overview

**Sprint Goal**: Extend Epic schema with roadmap properties and migrate existing data
**Duration**: 1 week (2026-01-09 to 2026-01-15)
**Type**: Infrastructure sprint
**Progress:** 100% (5/5 tasks complete)

**Success Criteria:**
- [x] Epic schema includes all roadmap properties (commitment_status, roadmap_status, target quarters, changelog)
- [x] Validation rules enforced (no dates on uncommitted items)
- [x] Existing Epics migrated with safe defaults
- [x] Changelog entries created for any inferred historical changes

---

## Sprint Tasks

### e009_s01_t01: Define Epic Roadmap Schema (4h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Define TypeScript interfaces and Neo4j schema for roadmap properties on Epic nodes

**Implementation Notes:**
```typescript
interface EpicRoadmapProperties {
  commitment_status: 'uncommitted' | 'committed';
  roadmap_status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  target_start_quarter?: string;  // "Q1-2026"
  target_end_quarter?: string;
  roadmap_visible: boolean;
  changelog: ChangelogEntry[];
}

interface ChangelogEntry {
  timestamp: string;
  field: string;
  from: string | null;
  to: string;
  reason?: string;
}
```

**Files:**
- `packages/cli/src/types/graph.ts` (update)
- `packages/shared/src/types/epic.ts` (new or update)

Follow: ADR-056

---

### e009_s01_t02: Quarter Parsing Utilities (2h)
**Status:** [x] Complete
**Priority:** HIGH
**Depends:** t01

**Goal:** Create utility functions for quarter format validation and comparison

**Implementation Notes:**
```typescript
// Format: "Q{1-4}-{YYYY}"
const QUARTER_REGEX = /^Q[1-4]-\d{4}$/;

function parseQuarter(q: string): { year: number; quarter: number };
function formatQuarter(year: number, quarter: number): string;
function compareQuarters(a: string, b: string): number;
function getCurrentQuarter(): string;
function addQuarters(q: string, n: number): string;
```

**Files:**
- `packages/shared/src/utils/quarter.ts` (new)
- `packages/shared/src/utils/quarter.test.ts` (new)

---

### e009_s01_t03: Epic Validation Middleware (4h)
**Status:** [x] Complete
**Priority:** HIGH
**Depends:** t01, t02

**Goal:** Implement validation rules for Epic roadmap properties

**Implementation Notes:**
```typescript
// Rules:
// 1. Uncommitted items cannot have dates
// 2. Committed items should warn if > 2 years out
// 3. start_quarter must be <= end_quarter
// 4. Changelog is append-only (no deletions)

function validateEpicRoadmapProperties(epic: Epic): ValidationResult;
```

**Files:**
- `packages/shared/src/validation/epic-roadmap.ts` (new)
- `dashboard/src/lib/validation/epic.ts` (update)

Follow: ADR-056

---

### e009_s01_t04: Data Migration Script (4h)
**Status:** [x] Complete
**Priority:** HIGH
**Depends:** t01

**Goal:** Migrate existing Epic nodes to include roadmap properties with safe defaults

**Implementation Notes:**
```cypher
// Add default properties to all Epics
MATCH (e:Epic)
WHERE e.commitment_status IS NULL
SET e.commitment_status = 'uncommitted',
    e.roadmap_status = 'not_started',
    e.roadmap_visible = true,
    e.changelog = []
RETURN count(e) as migrated
```

- Create migration script that can be run via CLI
- Log all migrations for audit trail
- Support dry-run mode

**Files:**
- `packages/cli/src/commands/graph/migrations/009-epic-roadmap-properties.ts` (new)
- `packages/cli/src/commands/graph/migrate.ts` (update if exists)

---

### e009_s01_t05: Changelog Auto-Population (2h)
**Status:** [x] Complete
**Priority:** MEDIUM
**Depends:** t04

**Goal:** Infer historical changes from existing Epic data and populate changelog

**Implementation Notes:**
- Check Epic status field for completed Epics
- If Epic has sprints with completion dates, infer timeline
- Create initial changelog entry: "Migrated from legacy schema"

```typescript
function inferHistoricalChangelog(epic: Epic, sprints: Sprint[]): ChangelogEntry[];
```

**Files:**
- `packages/cli/src/lib/roadmap/changelog-inference.ts` (new)

---

## Execution Plan

**Day 1-2:**
- t01: Define schema (parallel start)
- t02: Quarter utilities (parallel start)

**Day 3:**
- t03: Validation middleware (after t01, t02)

**Day 4-5:**
- t04: Migration script
- t05: Changelog inference

---

## Accomplishments This Sprint

### 2026-01-09: Complete Schema & Infrastructure (T1-T5)

**T1: Epic Roadmap Schema**
- Created `packages/shared/src/types/roadmap.ts` with full type definitions
- Extended `dashboard/src/lib/graph/types.ts` EpicNode with roadmap properties
- Types: CommitmentStatus, RoadmapStatus, ChangelogEntry, EpicRoadmapProperties
- Exports integrated into shared package index

**T2: Quarter Parsing Utilities**
- Created `packages/shared/src/utils/quarter.ts` with comprehensive utilities
- Functions: parseQuarter, formatQuarter, compareQuarters, getCurrentQuarter, addQuarters, quartersBetween
- Additional helpers: getQuarterStartDate, getQuarterEndDate, isFarFuture
- Test file created with full coverage

**T3: Epic Validation Middleware**
- Created `packages/shared/src/validation/epic-roadmap.ts`
- Validates: uncommitted items can't have dates, quarter format, start <= end
- Warnings: far future quarters (>2 years), missing end quarter
- Helper functions: createChangelogEntry, detectRoadmapChanges, formatValidationResult

**T4: Data Migration Script**
- Created CLI migration: `packages/cli/src/commands/graph/migrations/009-epic-roadmap-properties.ts`
- Created API endpoint: `dashboard/src/app/api/v1/migrations/009-epic-roadmap/route.ts`
- Added `ginko graph migrate 009` command with --dry-run and --verbose options
- Migration adds default roadmap properties and initializes changelog

**T5: Changelog Auto-Population**
- Created `packages/cli/src/lib/roadmap/changelog-inference.ts`
- Infers roadmap_status from Epic status (complete→completed, active→in_progress)
- Uses sprint dates for timeline inference
- Helper functions: inferHistoricalChangelog, mergeChangelogs, summarizeChangelog, validateChangelog

**Files Created:**
- `packages/shared/src/types/roadmap.ts`
- `packages/shared/src/types/index.ts`
- `packages/shared/src/utils/quarter.ts`
- `packages/shared/src/utils/__tests__/quarter.test.ts`
- `packages/shared/src/validation/epic-roadmap.ts`
- `packages/shared/src/validation/index.ts`
- `packages/cli/src/commands/graph/migrations/009-epic-roadmap-properties.ts`
- `packages/cli/src/lib/roadmap/changelog-inference.ts`
- `dashboard/src/app/api/v1/migrations/009-epic-roadmap/route.ts`

**Files Updated:**
- `packages/shared/src/index.ts` (exports)
- `packages/shared/tsconfig.json` (exclude tests)
- `packages/cli/src/commands/graph/index.ts` (migrate command)
- `dashboard/src/lib/graph/types.ts` (EpicNode roadmap properties)
- `docs/epics/EPIC-INDEX.md` (marked EPIC-001, EPIC-002 complete)

## Next Steps

After Sprint 1:
- Sprint 2: CLI `ginko roadmap` command and API endpoints

## Blockers

[To be updated if blockers arise]

---

## Sprint Metadata

**Epic:** EPIC-009 (Product Roadmap)
**Sprint ID:** e009_s01
**Started:** 2026-01-09
**Participants:** Chris Norton, Claude
