# SPRINT: Open-Source Release Sprint 1 - Repository Setup & Governance (EPIC-021 Sprint 1)

## Sprint Overview

**Sprint Goal**: Establish the public repo structure with all governance files in place.
**ID:** e021_s01
**Duration**: 1 day
**Type**: Infrastructure sprint
**Progress:** 0% (0/6 tasks complete)

**Success Criteria:**
- Public repo ginkoai/ginko exists with correct structure
- All governance files (LICENSE, CONTRIBUTING, CoC, SECURITY) present
- CLAUDE.md sanitized of internal references

---

## Sprint Tasks

### e021_s01_t01: Create new GitHub repo and directory scaffold (1h)
**Priority:** HIGH
**Status:** [ ]

**Problem:** Need a clean public repo with no history from the private monorepo.
**Solution:** Create ginkoai/ginko (public) with proper directory structure.

**Approach:**
- Create repo via `gh repo create ginkoai/ginko --public`
- Establish structure: packages/cli/, docs/adr/, .github/workflows/, .github/ISSUE_TEMPLATE/
- Create .gitignore (node_modules, dist, .env*, .ginko/local.json, *.key, auth.json)

---

### e021_s01_t02: Add AGPL-3.0 LICENSE (30m)
**Priority:** HIGH
**Status:** [ ]

**Problem:** Need copyleft license to protect against proprietary forks.
**Solution:** Standard AGPL-3.0-or-later text with Ginko AI copyright.

**Approach:**
- Add LICENSE file with AGPL-3.0-or-later text
- Copyright (C) 2025-2026 Ginko AI
- Update packages/cli/package.json license field from "MIT" to "AGPL-3.0-or-later"

---

### e021_s01_t03: Create CONTRIBUTING.md (1h)
**Priority:** HIGH
**Status:** [ ]

**Problem:** Contributors need clear guidance on how to participate.
**Solution:** Comprehensive contributing guide with dev setup, standards, and DCO.

**Approach:**
- Dev setup, build, test, PR process, coding standards
- DCO (Developer Certificate of Origin) sign-off requirement
- Reference AGPL-3.0 implications for contributions

---

### e021_s01_t04: Create CODE_OF_CONDUCT.md (30m)
**Priority:** MEDIUM
**Status:** [ ]

**Problem:** Community needs behavioral expectations for healthy collaboration.
**Solution:** Adopt Contributor Covenant v2.1 (industry standard).

---

### e021_s01_t05: Create SECURITY.md (30m)
**Priority:** HIGH
**Status:** [ ]

**Problem:** Security vulnerabilities need a responsible disclosure path.
**Solution:** Clear security policy with email-based reporting (not public issues).

**Approach:**
- Responsible disclosure process (security@ginkoai.com)
- Supported versions table
- Response timeline expectations

---

### e021_s01_t06: Sanitize CLAUDE.md for public release (2h)
**Priority:** HIGH
**Status:** [ ]

**Problem:** Current CLAUDE.md contains internal emails, deployment refs, and team-specific instructions.
**Solution:** Keep AI collaboration patterns as a feature showcase; remove all internal references.

**Approach:**
- Keep: AI collaboration patterns, command execution, context reflexes, confidence indicators
- Remove: reese@ginkoai.com, chris@watchhill.ai, internal deployment refs, dashboard-specific instructions
- Update: Graph commands noted as "requires Ginko Cloud"
- Validation: grep -r "watchhill\|cnorton\|reese@" CLAUDE.md returns zero

---

## Accomplishments This Sprint

[To be filled as work progresses]

## Next Steps

Sprint 2: Code Extraction & Cleanup (e021_s02)

## Blockers

None identified.
