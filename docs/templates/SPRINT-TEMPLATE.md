# SPRINT-YYYY-MM-sprint-name

## Sprint Overview

**Sprint Goal**: [One sentence describing what this sprint achieves]
**Duration**: [2 weeks] (YYYY-MM-DD to YYYY-MM-DD)
**Type**: [Feature | Infrastructure | Bugfix | Research]
**Progress:** 0% (0/N tasks complete)

**Success Criteria:**
- [Measurable outcome 1]
- [Measurable outcome 2]
- [Performance target if applicable]

---

## Sprint Tasks

### TASK-1: [Task Title] (Xh)
**Status:** [ ] Not Started
**Priority:** [CRITICAL | HIGH | MEDIUM | LOW]
**Owner:** [Name]

**Goal:** [What this task accomplishes]

**Acceptance Criteria:**
- [ ] [Specific, testable criterion]
- [ ] [Another criterion]

**Files:**
- Create: `path/to/new/file.ts`
- Update: `path/to/existing/file.ts`

Follow: ADR-002, ADR-043

---

### TASK-2: [Task Title] (Xh)
**Status:** [ ] Not Started
**Priority:** HIGH
**Owner:** [Name]

**Goal:** [What this task accomplishes]

**Acceptance Criteria:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]

**Files:**
- Update: `relevant/files.ts`

Related: ADR-XXX

---

## Related Documents

- **EPIC**: [Link to parent epic if applicable]
- **ADRs**: ADR-XXX, ADR-YYY
- **PRD**: [Link to product requirements if applicable]

---

**Sprint Status**: Not Started
**Start Date**: YYYY-MM-DD
**Created By**: [Name]

---

## Usage Notes

### ADR References

Tasks can reference Architecture Decision Records using these patterns:

1. **Follow line** (recommended): `Follow: ADR-002, ADR-043`
2. **Related line**: `Related: ADR-002, ADR-043, ADR-047`
3. **Inline reference**: `This task follows ADR-002 patterns.`

### MUST_FOLLOW Relationships

When the sprint is synced to the knowledge graph via `ginko sprint sync`:

```cypher
(task:Task)-[:MUST_FOLLOW]->(adr:ADR)
```

This enables AI constraint awareness at session start:
- AI sees which ADRs apply to the current task
- Ensures architectural decisions are followed
- Provides context without manual lookup

### Sprint Sync

```bash
# Sync sprint to graph
ginko sprint sync docs/sprints/SPRINT-YYYY-MM-name.md

# Or use the API
curl -X POST https://app.ginkoai.com/api/v1/sprint/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"graphId": "your_graph_id", "sprintContent": "..."}'
```

### Graph Relationships Created

| Relationship | Direction | Purpose |
|-------------|-----------|---------|
| CONTAINS | Sprint → Task | Sprint contains which tasks |
| NEXT_TASK | Sprint → Task | Points to first incomplete task |
| MUST_FOLLOW | Task → ADR | Task must follow ADR constraints |
| MODIFIES | Task → File | Task modifies which files |
