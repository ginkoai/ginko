# Sprint Plan: Configuration and Reference System

## Overview
**Start Date**: 2025-10-22
**Duration**: 2 weeks (20 hours effort)
**PRD Reference**: PRD-009 - Configuration and Reference System
**ADR Reference**: ADR-037 - Two-Tier Configuration Architecture

## Success Criteria
- [ ] AI finds all project resources in <1 second (no progressive searching)
- [ ] 80% of context loaded from 3-5 documents (session + sprint + refs)
- [ ] >90% of session log entries include references (TASK-XXX, PRD-YYY, ADR-ZZZ)
- [ ] Session log quality score reaches 9.5/10 with rich context capture
- [ ] Zero git conflicts on paths across team members
- [ ] 100% team visibility into active work through session logs
- [ ] Work mode controls documentation depth (hack-ship vs full-planning)

## Strategic Context

### Problem Being Solved
Current context loading is structurally inefficient:
- Progressive filesystem searching wastes tokens and time
- Session log entries lack strategic context (orphaned events)
- Short-term memory (sessions) disconnected from long-term memory (sprints/PRDs/ADRs)
- Team members have no visibility into each other's work

### Solution Architecture
**Two-tier configuration** (team-shared `ginko.json` + user-specific `.ginko/local.json`) with **reference link system** enabling semantic navigation across documentation hierarchy.

**Result**: 70% reduction in bootstrap tokens, instant path resolution, strategic context for all tactical work.

## Implementation Phases

### Phase 1: Two-Tier Configuration Foundation
**Duration**: 4 hours
**Goal**: Enable instant path resolution across team members without git conflicts

**Tasks**:
- [ ] **TASK-009**: Two-Tier Configuration Foundation

**Key Deliverables**:
- `packages/cli/src/utils/config-loader.ts` - Configuration loading
- `packages/cli/src/types/config.ts` - TypeScript interfaces
- Updated `ginko init` generating both configs
- Path resolution: `resolveProjectPath(relativePath)`

**Risk Factors**:
- Cross-platform path handling (Windows particularly)
- Backward compatibility with existing projects

**Mitigation**:
- Comprehensive cross-platform testing
- Fallback to progressive search if no config

### Phase 2: Reference Link System
**Duration**: 4 hours
**Goal**: Link session logs → sprints → PRDs → ADRs bidirectionally

**Tasks**:
- [ ] **TASK-010**: Reference Link System

**Key Deliverables**:
- `packages/cli/src/utils/reference-parser.ts` - Extract/resolve references
- Updated `ginko log` supporting inline references
- Reference validation (warn on broken links)
- Reference chain navigation helpers

**Success Metrics**:
- Extract all reference types with >99% accuracy
- References automatically detected in log descriptions
- Display reference chains: "TASK-006 → FEATURE-024 → PRD-009"

**Risk Factors**:
- Reference syntax might feel unnatural to users
- Validation could become performance bottleneck

**Mitigation**:
- User-friendly syntax: TASK-XXX, PRD-YYY (memorable)
- Validation warns, doesn't block (async)

### Phase 3: Progressive Context Loading
**Duration**: 6 hours
**Goal**: Load 80% of context from 3-5 core documents instead of 50+ files

**Tasks**:
- [ ] **TASK-011**: Progressive Context Loading

**Key Deliverables**:
- `packages/cli/src/utils/context-loader.ts` - Strategic loading
- Priority-ordered loading (sessions → sprint → refs)
- Work mode filters for documentation depth
- Reference following with maxDepth limit
- Performance instrumentation

**Success Metrics**:
- Context loading completes in <1 second
- 80% of needed context from ≤5 documents
- 70% token reduction vs full-scan approach

**Risk Factors**:
- Circular references could cause infinite loops
- Depth limit might miss critical context

**Mitigation**:
- Circular reference detection
- Configurable maxDepth (default: 3)
- Cache to prevent re-loading

### Phase 4: Team Collaboration Features
**Duration**: 2 hours
**Goal**: Enable team visibility and coordination through session logs

**Tasks**:
- [ ] **TASK-012**: Team Collaboration Features

**Key Deliverables**:
- `ginko team` command showing active teammates
- `ginko team <user>` viewing teammate's session
- Team activity timeline (all events chronologically)
- Documentation on collaboration patterns

**Success Metrics**:
- 100% visibility into teammate activity
- Zero git conflicts with parallel sessions
- Team members can coordinate work effectively

**Risk Factors**:
- Privacy concerns (exposing session data)
- Performance with 10+ team members

**Mitigation**:
- Session logs already git-tracked (no new exposure)
- Efficient caching and filtering

### Phase 5: Session Log Quality Enhancement
**Duration**: 4 hours
**Goal**: Enhance session logging to capture rich context (WHY, alternatives, insights)

**Tasks**:
- [ ] **TASK-013**: Session Log Quality Enhancements

**Key Deliverables**:
- Enhanced `ginko log` prompts for WHY and alternatives
- Auto-detection for git operations and files affected
- `ginko log --validate` with quality scoring
- Updated session log templates with inline examples

**Success Metrics**:
- Session log quality score reaches 9.5/10
- >70% of features include WHY context
- >60% of decisions include alternatives
- Auto-detection captures git ops without manual logging

**Risk Factors**:
- Interactive prompts might slow workflow
- Quality scoring could be subjective

**Mitigation**:
- Make enhanced prompts optional (flags to skip)
- Base scoring on objective keywords and patterns
- Focus on guidance, not enforcement

## Task Breakdown

### TASK-009: Two-Tier Configuration Foundation
**Priority**: Critical | **Effort**: 4h | **Size**: M
**Status**: Todo
**Dependencies**: None (foundational)

Implement team-shared `ginko.json` (relative paths) and user-specific `.ginko/local.json` (absolute paths).

**Acceptance**: `ginko init` creates both configs, path resolution works cross-platform, <10ms load time

### TASK-010: Reference Link System
**Priority**: High | **Effort**: 4h | **Size**: M
**Status**: Todo
**Dependencies**: TASK-009

Implement reference extraction (TASK-XXX, PRD-YYY, ADR-ZZZ) and bidirectional navigation.

**Acceptance**: >99% extraction accuracy, reference validation warns on broken links, chains displayed

### TASK-011: Progressive Context Loading
**Priority**: High | **Effort**: 6h | **Size**: L
**Status**: Todo
**Dependencies**: TASK-009, TASK-010

Priority-ordered loading following reference chains to achieve 80% context from 3-5 docs.

**Acceptance**: <1s bootstrap, 80% context from ≤5 docs, 70% token reduction

### TASK-012: Team Collaboration Features
**Priority**: Medium | **Effort**: 2h | **Size**: S
**Status**: Todo
**Dependencies**: TASK-009, TASK-010

Leverage user-namespaced logs for team visibility and coordination.

**Acceptance**: `ginko team` shows active members, no conflicts, good performance

### TASK-013: Session Log Quality Enhancements
**Priority**: High | **Effort**: 4h | **Size**: M
**Status**: Todo
**Dependencies**: ADR-033 (session logging foundation)

Enhance session logging with interactive prompts, auto-detection, and quality validation to reach 9.5/10 quality.

**Acceptance**: Quality score 9.5/10, features include WHY, decisions include alternatives, validation working

## Timeline

**Week 1:**
- Days 1-2: TASK-009 (Configuration Foundation) - 4h
- Days 3-4: TASK-010 (Reference Links) - 4h
- Day 5: TASK-011 Start (Progressive Loading) - 2h

**Week 2:**
- Days 1-2: TASK-011 Complete (Progressive Loading) - 4h
- Day 3: TASK-012 (Team Collaboration) - 2h
- Day 3-4: TASK-013 (Session Log Quality) - 4h
- Day 5: Integration testing, documentation, polish

## Integration Points

### With Existing Systems
- **`ginko start`**: Use config for instant path resolution, progressive loading
- **`ginko log`**: Support inline references, validate on entry
- **`ginko init`**: Generate both config files, migration for existing projects
- **Session synthesis**: Follow reference chains for comprehensive context

### Breaking Changes
None - backward compatible with fallback to progressive search

### Migration Path
```bash
# Existing projects
ginko init --migrate  # Generates ginko.json from detected structure

# New projects
ginko init  # Interactive setup with config generation
```

## Risk Management

### Technical Risks
| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Cross-platform path bugs | High | Low | Comprehensive testing, path normalization |
| Reference validation performance | Medium | Medium | Async validation, caching |
| Circular reference loops | High | Low | Detection algorithm, maxDepth limit |
| Context loading too slow | Medium | Low | Caching, depth limits, lazy loading |

### Adoption Risks
| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Team resistance to references | Medium | Medium | Clear docs, examples, optional initially |
| Configuration maintenance burden | Low | Low | Validation tooling, clear error messages |
| Migration friction | Medium | Low | Automated migration, backward compat |

## Success Validation

### Before
```
$ ginko start
[AI searches 10+ directories progressively]
[Loads 50+ files to get context]
[5000 tokens used for bootstrap]
[Fresh AI: "Where were we? What's the goal?"]
```

### After
```
$ ginko start
[AI loads ginko.json + local.json instantly]
[Loads session log → sprint → 3 referenced docs]
[1500 tokens used for bootstrap (70% reduction)]
[Fresh AI: "Continuing TASK-009 per PRD-009, next step is..."]
```

### Metrics to Track
- Bootstrap time: <1 second (vs 10-30 seconds)
- Token usage: <2000 tokens (vs 5000+ tokens)
- Reference density: >90% of log entries have refs
- Team coordination: Observable in session logs
- Zero git conflicts on configuration

## Related Documents

- **PRD**: [PRD-009: Configuration and Reference System](../PRD/PRD-009-configuration-and-reference-system.md)
- **ADR**: [ADR-037: Two-Tier Configuration Architecture](../adr/ADR-037-two-tier-configuration-architecture.md)
- **Feature**: [FEATURE-024: Configuration and Reference System](../../backlog/items/FEATURE-024-configuration-and-reference-system.md)
- **ADR-033**: Session logging foundation (defensive logging)
- **ADR-036**: Session synthesis architecture

## Sprint Retrospective (Post-Sprint)

*To be filled after sprint completion*

### What Went Well
- TBD

### What Could Be Improved
- TBD

### Action Items
- TBD

### Lessons Learned
- TBD
