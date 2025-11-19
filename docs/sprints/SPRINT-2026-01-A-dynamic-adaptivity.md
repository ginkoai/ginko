# SPRINT-2026-01-A: Dynamic Adaptivity

## Sprint Overview

**Sprint Goal**: Implement project maturity detection and dynamic mode recommendations to automatically sense when projects should transition from Hack & Ship → Think & Build → Full Planning.

**Epic**: [EPIC-001: Strategic Context & Dynamic Adaptivity](../epics/EPIC-001-strategic-context-and-dynamic-adaptivity.md)

**Duration**: 1 week (TBD to TBD)

**Type**: Architecture + Feature sprint

**Philosophy**: Modes should follow project maturity, not manual configuration. AI senses complexity/team size and recommends appropriate rigor level.

**Success Criteria:**
- Project maturity detection working (git, code, team analysis)
- Mode recommendations shown (non-blocking)
- 70%+ recommendation accuracy in test scenarios
- Work mode implementations consolidated (fix conflicts)
- Foundation for Sprint 3 (significance detection uses maturity)

**Progress:** 0% (0/3 tasks complete)

---

## Strategic Context

### The Problem

**Current State:**
- Work modes exist (Hack & Ship, Think & Build, Full Planning)
- Modes are manually configured in `ginko.json`
- Three conflicting `detectWorkMode()` implementations
- No automatic adaptation as projects grow

**Impact:**
- Projects outgrow initial mode (need manual updates)
- Solo → Team transition missed
- Simple → Complex evolution ignored
- Mode recommendations would help but don't exist

### The Solution

**Dynamic Maturity Detection:**
- Analyze git history (commits, contributors, age)
- Analyze codebase (files, LOC, dependencies)
- Analyze team signals (session directories, recent committers)
- Calculate maturity score (0-100) across dimensions
- Map to recommended mode

**Consolidate Work Modes:**
- Fix three conflicting implementations
- Clear taxonomy: `WorkMode` (strategic) vs `ActivityPhase` (tactical)
- Canonical `ModeDetector` service
- Mode recommendation UI (non-blocking)

---

## Sprint Tasks

### TASK-4: Project Maturity Detection
**Status:** Not Started
**Effort:** 10-12 hours
**Priority:** CRITICAL

**Goal:** Automatically sense project complexity and team size

**Acceptance Criteria:**
- [ ] `ProjectMaturityAnalyzer` service created
- [ ] Git analysis: commit count, contributor count, age in days
- [ ] Code analysis: file count, LOC, dependency depth
- [ ] Team analysis: session directories, recent committers (30d)
- [ ] Maturity score calculated (0-100) with dimensions:
  - Solo vs Team (1 contributor = 0, 2-4 = 50, 5+ = 100)
  - Simple vs Complex (files/LOC/deps normalized)
  - New vs Established (age: <7d = 0, 7-30d = 50, >90d = 100)
- [ ] Mode recommendation logic:
  - 0-30: Hack & Ship
  - 31-65: Think & Build
  - 66-100: Full Planning

**Unit Tests** (20 tests):
- Git analysis: zero commits, solo, team, ancient repo
- Code analysis: empty project, small, medium, large
- Team analysis: solo, small team, large team
- Score calculation: boundary conditions, weighted average
- Mode recommendations: each threshold region

**UAT Scenarios**:
- Solo new project (3 commits, 1 contributor, 2d old) → Hack & Ship
- Growing project (47 commits, 3 contributors, 14d old) → Think & Build
- Established (500+ commits, 7 contributors, 180d old) → Full Planning

**Files:**
- Create: `packages/cli/src/services/project-maturity-analyzer.ts`
- Create: `packages/cli/test/unit/project-maturity-analyzer.test.ts`

---

### TASK-5: Work Mode Consolidation
**Status:** Not Started
**Effort:** 8-10 hours
**Priority:** HIGH

**Goal:** Fix conflicting implementations, establish clear taxonomy

**Acceptance Criteria:**
- [ ] Clear types defined:
  - `WorkMode` = 'hack-ship' | 'think-build' | 'full-planning' (strategic, stable)
  - `ActivityPhase` = 'implementing' | 'testing' | 'debugging' | 'exploring' | 'refactoring' (tactical, dynamic)
- [ ] Canonical `ModeDetector` service created
- [ ] `session-collector.ts` migrated to return `ActivityPhase`
- [ ] `helpers.ts` migrated to use canonical detector
- [ ] `signal-detection.ts` kept for charter conversation only
- [ ] Mode recommendation logic added (detected maturity → suggested mode)

**Unit Tests** (16 tests):
- Type definitions: valid/invalid values
- Activity phase detection: git status patterns
- Mode detection: uses maturity analyzer
- Recommendation logic: maturity score → mode mapping
- Backward compatibility: existing configs still work

**UAT Scenarios**:
- Verify no TypeScript errors after refactor
- Test mode detection on 5 different project types
- Validate recommendations match expected (70%+ accuracy)

**Files:**
- Modify: `packages/cli/src/types/charter.ts`
- Create: `packages/cli/src/services/mode-detector.ts`
- Modify: `packages/cli/src/utils/session-collector.ts`
- Modify: `packages/cli/src/utils/helpers.ts`
- Create: `packages/cli/test/unit/mode-detector.test.ts`

---

### TASK-6: Mode Recommendation UI
**Status:** Not Started
**Effort:** 6-8 hours
**Priority:** MEDIUM-HIGH

**Goal:** Show AI-detected mode recommendations without forcing

**Acceptance Criteria:**
- [ ] Display current mode + recommendation in `ginko start`
- [ ] Only show if different from current (no noise)
- [ ] Show reasoning (detected signals: contributors, commits, complexity)
- [ ] Provide action command: `ginko config set workMode think-build`
- [ ] Add `--accept-mode-recommendation` flag to auto-apply
- [ ] Track recommendation acceptance rate (foundation for learning)
- [ ] Respect user overrides (don't nag if explicitly set)

**Display Format:**
```
📋 Work Mode: Hack & Ship (configured)
💡 Recommendation: Think & Build
   Detected: 3 contributors, 47 commits, growing complexity
   Change: ginko config set workMode think-build
```

**Unit Tests** (10 tests):
- Display logic: show/hide recommendation
- Reasoning text generation
- Command generation
- Acceptance tracking
- Override detection

**UAT Scenarios**:
- Project matches mode → No recommendation shown
- Project outgrew mode → Recommendation shown with reasoning
- Accept recommendation → Mode updated, success message
- Dismiss recommendation → Tracked, don't show again for 7d

**Files:**
- Modify: `packages/cli/src/commands/start/start-reflection.ts`
- Create: `packages/cli/src/utils/mode-recommendation.ts`
- Create: `packages/cli/test/unit/mode-recommendation.test.ts`

---

## Testing & Validation

### Unit Test Summary
**Total Tests**: 46 tests across 3 files
**Coverage Target**: >80%

### Human UAT Scenarios

#### UAT-6: Solo New Project → Hack & Ship
- 3 commits, 1 contributor, 2 days old, 15 files
- Expected: Hack & Ship recommended
- Expected: No upgrade suggestion (matches maturity)

#### UAT-7: Growing Project → Think & Build
- 47 commits, 3 contributors, 14 days old, 150 files
- Expected: Think & Build recommended
- Expected: If currently Hack & Ship, show upgrade suggestion

#### UAT-8: Complex Project → Full Planning
- 500 commits, 7 contributors, 180 days old, 800 files
- Expected: Full Planning recommended
- Expected: If currently Think & Build, show upgrade suggestion

#### UAT-9: Stale Mode Override
- Project: Team + Complex
- Config: Hack & Ship (explicitly set by user 30d ago)
- Expected: Recommendation shown
- Expected: Respectful tone (user previously chose this)

#### UAT-10: Recommendation Acceptance
- Growing project recommends Think & Build
- User accepts: `ginko config set workMode think-build`
- Expected: Mode updated, success message, tracking recorded
- Expected: Next session shows Think & Build active, no recommendation

---

## Milestones

### Milestone 1: Maturity Detection (Day 3)
- ✓ ProjectMaturityAnalyzer working
- ✓ Git + code + team analysis complete
- ✓ Unit tests passing (20/20)
- ✓ UAT 6-8 validated (70%+ accuracy)

### Milestone 2: Mode Consolidation (Day 5)
- ✓ WorkMode vs ActivityPhase clear
- ✓ Canonical ModeDetector created
- ✓ Conflicting implementations fixed
- ✓ Unit tests passing (16/16)

### Milestone 3: Sprint Complete (Day 7)
- ✓ Recommendation UI working
- ✓ All tests passing (46/46)
- ✓ All UAT scenarios validated
- ✓ Foundation for Sprint 3 (significance detection)

---

## Success Metrics

1. **Maturity Detection Accuracy**: 70%+ correct recommendations
2. **Mode Consolidation**: Zero TypeScript errors, clean taxonomy
3. **Recommendation Usefulness**: Shown in appropriate cases, not noise
4. **User Acceptance**: Track rate (foundation for learning)
5. **Test Coverage**: >80% for all new code

---

## Related Documents

- **Epic**: [EPIC-001](../epics/EPIC-001-strategic-context-and-dynamic-adaptivity.md)
- **Previous**: [SPRINT-2025-12: Strategic Context](./SPRINT-2025-12-strategic-context-surfacing.md)
- **Next**: [SPRINT-2026-01-B: Knowledge Capture](./SPRINT-2026-01-B-intelligent-knowledge-capture.md)
- **ADR-048** (to be created): Dynamic Adaptivity & Mode Sensing

---

**Sprint Status**: Planning
**Last Updated**: 2025-11-19
**Progress**: 0% (0/3 tasks complete)
