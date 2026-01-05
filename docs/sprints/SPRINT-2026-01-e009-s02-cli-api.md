# SPRINT: Product Roadmap Sprint 2 - CLI & API

## Sprint Overview

**Sprint Goal**: Expose roadmap data through CLI command and API endpoints
**Duration**: 1 week (2026-01-13 to 2026-01-17)
**Type**: Feature sprint
**Progress:** 0% (0/4 tasks complete)

**Success Criteria:**
- [ ] `ginko roadmap` displays committed Epics by quarter
- [ ] API endpoint returns roadmap data with filtering
- [ ] Curated export endpoint for public roadmaps
- [ ] CLI output is readable and informative

---

## Sprint Tasks

### e009_s02_t01: CLI Roadmap Command (4h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Create `ginko roadmap` command for viewing roadmap from terminal

**Implementation Notes:**
```bash
ginko roadmap                    # Show committed epics by quarter
ginko roadmap --all              # Include uncommitted items
ginko roadmap --status in_progress  # Filter by status
ginko roadmap --format json      # JSON output for scripting
```

**Output Format:**
```
Product Roadmap
===============

Q1-2026
  [committed] EPIC-009: Product Roadmap (in_progress)
  [committed] EPIC-010: Analytics Dashboard (not_started)

Q2-2026
  [committed] EPIC-011: Billing Integration (not_started)

Uncommitted (use --all to show)
  3 items in backlog
```

**Files:**
- `packages/cli/src/commands/roadmap/roadmap-command.ts` (new)
- `packages/cli/src/commands/roadmap/index.ts` (new)

Follow: ADR-056

---

### e009_s02_t02: Roadmap Query API (4h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** API endpoint for querying roadmap data with filters

**Implementation Notes:**
```typescript
// GET /api/v1/roadmap?project_id=...&status=committed&from=Q1-2026&to=Q4-2026
interface RoadmapQueryParams {
  project_id: string;
  commitment_status?: 'uncommitted' | 'committed' | 'all';
  roadmap_status?: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  from_quarter?: string;
  to_quarter?: string;
  include_internal?: boolean;  // Include roadmap_visible=false
}

interface RoadmapResponse {
  quarters: {
    quarter: string;
    epics: EpicSummary[];
  }[];
  uncommitted_count: number;
  total_count: number;
}
```

**Files:**
- `dashboard/src/app/api/v1/roadmap/route.ts` (new)
- `dashboard/src/lib/roadmap/queries.ts` (new)

---

### e009_s02_t03: Roadmap Update API (3h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Depends:** t02

**Goal:** API endpoint for updating Epic roadmap properties

**Implementation Notes:**
```typescript
// PATCH /api/v1/roadmap/epic/:epicId
interface RoadmapUpdateRequest {
  commitment_status?: 'uncommitted' | 'committed';
  roadmap_status?: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  target_start_quarter?: string | null;
  target_end_quarter?: string | null;
  roadmap_visible?: boolean;
  change_reason?: string;  // Added to changelog
}
```

- Validate against rules (no dates on uncommitted)
- Auto-append to changelog on any change
- Return updated Epic

**Files:**
- `dashboard/src/app/api/v1/roadmap/epic/[epicId]/route.ts` (new)

Follow: ADR-056

---

### e009_s02_t04: Public Roadmap Export (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Depends:** t02

**Goal:** Curated export endpoint for public-facing roadmaps

**Implementation Notes:**
```typescript
// GET /api/v1/roadmap/export?project_id=...&format=json|markdown
interface PublicRoadmapExport {
  title: string;
  generated_at: string;
  quarters: {
    quarter: string;
    items: {
      title: string;
      description?: string;
      status: 'planned' | 'in_progress' | 'completed';
    }[];
  }[];
}
```

- Only includes `roadmap_visible=true` items
- Strips internal metadata
- Supports JSON and Markdown output

**Files:**
- `dashboard/src/app/api/v1/roadmap/export/route.ts` (new)
- `dashboard/src/lib/roadmap/export.ts` (new)

---

## Execution Plan

**Day 1-2:**
- t01: CLI command
- t02: Query API (parallel)

**Day 3-4:**
- t03: Update API (after t02)
- t04: Export endpoint (after t02)

**Day 5:**
- Testing and documentation

---

## Accomplishments This Sprint

[To be filled as work progresses]

## Next Steps

After Sprint 2:
- Sprint 3: Dashboard Roadmap Canvas (visual editor)

## Blockers

[To be updated if blockers arise]

---

## Sprint Metadata

**Epic:** EPIC-009 (Product Roadmap)
**Sprint ID:** e009_s02
**Started:** —
**Participants:** —
