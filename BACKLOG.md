# Ginko Project Backlog

This document tracks tasks, technical debt, and future enhancements for the Ginko project.

## Task Format
```
TASK-XXX: [Title]
Priority: [high|medium|low]
Status: [backlog|in-progress|blocked|done]
Created: YYYY-MM-DD
```

---

## Active Tasks

### TASK-001: Resolve ADR Directory Reference Conflict
**Priority**: Medium
**Status**: Backlog
**Created**: 2025-11-05

**Problem**:
Inconsistent ADR directory references across the codebase:
- CLAUDE.md references: `docs/adr/` (e.g., `docs/adr/ADR-033-context-pressure-mitigation-strategy.md`)
- create-adr.sh script: Configured for `docs/architecture/`
- Neither directory currently contains ADR files

**Impact**:
- Confusion about correct ADR location
- Broken links in documentation
- create-adr.sh script won't work with current directory structure

**Proposed Solution**:
1. Standardize on `docs/adr/` directory (matches CLAUDE.md references)
2. Update create-adr.sh to use `docs/adr/` instead of `docs/architecture/`
3. Create ADR index file at `docs/adr/ADR-INDEX.md`
4. Backfill referenced ADRs:
   - ADR-002: AI-Optimized File Discovery
   - ADR-033: Context Pressure Mitigation Strategy
   - ADR-043: Event-Based Context Loading
5. Update all documentation links to use consistent paths

**Files to Update**:
- `scripts/create-adr.sh` (lines 9-11: DOCS_DIR variable)
- Any documentation with ADR links

**Acceptance Criteria**:
- [x] ADR-044 created in docs/adr/ (completed 2025-11-05)
- [ ] create-adr.sh updated to use docs/adr/
- [ ] ADR-INDEX.md created
- [ ] All CLAUDE.md references point to existing or planned ADRs
- [ ] No broken ADR links in documentation

**Related**:
- ADR-044: Neo4j AuraDB Migration (first ADR using new structure)

---

## Future Enhancements

*(Add future tasks here)*

---

## Completed Tasks

*(Tasks move here when status = done)*
