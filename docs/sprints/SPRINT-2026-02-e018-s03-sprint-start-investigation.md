---
sprint_id: e018_s03
epic_id: EPIC-018
status: complete
created: 2026-02-05
updated: 2026-02-05
confidence: 85%
---

# Sprint: Sprint-Start Investigation

**Epic**: EPIC-018 Flow State Optimization
**Sprint**: 3 of 3
**ID**: `e018_s03`
**Duration**: 1 week

## Goal

Normalize inquiry at sprint start as a strength, not a weakness.

## Problem Statement

Questions feel like weakness. Uncertainty is avoided rather than surfaced. This results in wrong work, rework, and frustration. We need to establish sprint start as the natural time for investigation and clarification.

## Sprint Backlog

### e018_s03_t01: Add investigation phase to sprint start (2h)

**Status:** [x] Complete
**Priority:** HIGH
**Confidence:** 85%

**Problem:** No structured time for clarification exists in the sprint workflow. Developers jump straight into work without resolving ambiguities.

**Solution:** Add an investigation prompt to `ginko sprint start` that surfaces thin tasks and encourages clarification.

**Approach:** Modify the sprint start command to check for thin tasks and display an investigation phase prompt with options to enrich or proceed.

**Scope:**
  - Includes: `ginko sprint start` workflow modification, investigation prompt display
  - Excludes: Automatic task enrichment, AI-assisted clarification

**Acceptance Criteria:**
  - [ ] `ginko sprint start` shows investigation prompt when thin tasks exist
  - [ ] User can choose to enrich tasks, proceed anyway, or review goals
  - [ ] Prompt emphasizes "questions now = thoughtfulness"

---

### e018_s03_t02: Update CLAUDE.md inquiry protocol (1h)

**Status:** [x] Complete
**Priority:** HIGH
**Confidence:** 90%

**Problem:** No explicit permission for AI to express uncertainty in CLAUDE.md. AI partners may feel they should appear confident even when uncertain.

**Solution:** Add a confidence indicator protocol to CLAUDE.md that normalizes expressing uncertainty.

**Approach:** Add a new section to CLAUDE.md defining confidence levels, when to state them, and example formats.

**Scope:**
  - Includes: CLAUDE.md section on confidence indicators, examples
  - Excludes: Automated confidence detection, mandatory confidence on all responses

**Acceptance Criteria:**
  - [ ] CLAUDE.md has "Confidence Indicators" section
  - [ ] Confidence levels defined: high (80%+), medium (50-80%), low (<50%)
  - [ ] Examples provided for each level
  - [ ] AI encouraged to ask before proceeding when confidence < 50%

---

### e018_s03_t03: Add confidence indicator to responses (2h)

**Status:** [x] Complete
**Priority:** MEDIUM
**Confidence:** 75%

**Problem:** Uncertainty is hidden rather than surfaced in AI responses. Users can't distinguish confident recommendations from educated guesses.

**Solution:** Define a standard confidence indicator format that AI partners can use when uncertainty exists.

**Approach:** Create a simple format (e.g., "(confidence: medium)") and document when to use it.

**Scope:**
  - Includes: Format definition, usage guidelines, integration with CLAUDE.md
  - Excludes: Automated confidence calculation, mandatory display

**Acceptance Criteria:**
  - [ ] Confidence indicator format documented
  - [ ] Guidelines for when to include indicators (non-trivial decisions only)
  - [ ] Examples in CLAUDE.md show proper usage

---

### e018_s03_t04: Document inquiry culture (1.5h)

**Status:** [x] Complete
**Priority:** MEDIUM
**Confidence:** 80%

**Problem:** The culture of "inquiry as strength" is not explicitly documented. Manifesto principle 10 exists but lacks practical guidance.

**Solution:** Update AI-UX-MANIFESTO and CLAUDE.md to explicitly define and celebrate inquiry culture.

**Approach:** Add sections explaining why questions are valuable, when to ask them, and how sprint-start investigation fits the workflow.

**Scope:**
  - Includes: AI-UX-MANIFESTO updates, CLAUDE.md context reflexes
  - Excludes: Training materials, onboarding docs

**Acceptance Criteria:**
  - [ ] AI-UX-MANIFESTO has expanded guidance on principle 10
  - [ ] "Inquiry timing" concept documented (epic creation = best effort, sprint start = investigation)
  - [ ] Examples of good questions provided

---

### e018_s03_t05: Thin task enrichment at sprint start (2h)

**Status:** [x] Complete
**Priority:** HIGH
**Confidence:** 80%

**Problem:** Existing thin tasks are not addressed proactively. Users start working on poorly-defined tasks and waste time on clarification.

**Solution:** Flag thin tasks at sprint start and prompt for enrichment before work begins.

**Approach:** Use `assessTaskContentQuality()` from Sprint 2 to identify thin tasks, display them prominently, and offer enrichment flow.

**Scope:**
  - Includes: Thin task detection at sprint start, enrichment prompt, integration with task show
  - Excludes: Automatic enrichment, AI-generated content

**Acceptance Criteria:**
  - [ ] Sprint start identifies and displays thin tasks
  - [ ] Enrichment prompt offers: enrich now, proceed anyway, review goals
  - [ ] `ginko task show` displays content quality indicator

---

## Dependencies

- Sprint 2 complete (task content schema, validation, rich display)
- `assessTaskContentQuality()` function available

## Risks

| Risk | Mitigation |
|------|------------|
| Prompts feel bureaucratic | Make optional, keep prompts brief |
| Culture change takes time | Lead by example, celebrate good questions |
| Confidence indicators ignored | Show value through better outcomes |

## Success Metrics

- Sprint start surfaces thin tasks before work begins
- AI partners express confidence levels on uncertain recommendations
- Documentation explicitly celebrates inquiry as strength
