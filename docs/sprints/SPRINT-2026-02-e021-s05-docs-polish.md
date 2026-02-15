# SPRINT: Open-Source Release Sprint 5 - Documentation & Polish (EPIC-021 Sprint 5)

## Sprint Overview

**Sprint Goal**: Final documentation, secrets audit, and initial public commit.
**ID:** e021_s05
**Duration**: 1-2 days
**Type**: Polish sprint
**Progress:** 0% (0/5 tasks complete)

**Success Criteria:**
- Public ADRs curated (no internal infra ADRs)
- README polished with badges, tier comparison, dev instructions
- Getting-started guide covers local-only and cloud paths
- Final secrets scan passes with zero matches
- Initial commit pushed, CI green, GitHub release created

---

## Sprint Tasks

### e021_s05_t01: Curate ADRs for public release (3h)
**Priority:** HIGH
**Status:** [ ]

**Problem:** Not all ADRs are relevant to public users; some contain internal infrastructure details.
**Solution:** Include ~25-35 architecture ADRs; exclude internal infra ADRs.

**Approach:**
- Include: CLI design, privacy, event model, entity naming, context architecture
- Exclude: Hetzner, AuraDB migration, Stripe billing, internal deployment
- Validation: grep -r "178\.\|hetzner" docs/adr/ returns zero

---

### e021_s05_t02: Update README for public repo (2h)
**Priority:** HIGH
**Status:** [ ]

**Problem:** Current README is internal-facing; needs public-facing polish.
**Solution:** Professional README with badges, clear install instructions, tier comparison.

**Approach:**
- Add badges: npm version, CI status, AGPL-3.0 license, Node.js version
- Update license section, add tier comparison, fix development instructions
- Remove internal phase-status sections

---

### e021_s05_t03: Create getting-started guide (2h)
**Priority:** MEDIUM
**Status:** [ ]

**Problem:** New users need a clear path from install to productive use.
**Solution:** Step-by-step guide covering the full local workflow.

**Approach:**
- docs/guides/GETTING-STARTED.md — install → init → start → handoff → resume
- Cover local-only and optional cloud paths
- Troubleshooting section

---

### e021_s05_t04: Final secrets audit (1h)
**Priority:** HIGH
**Status:** [ ]

**Problem:** Must guarantee zero secrets in the public repo before first commit.
**Solution:** Comprehensive scan using regex patterns for known secret formats.

**Approach:**
- Run trufflehog or manual grep for key patterns (sk-ant, sk_test, whsec_, gk_, IPs)
- Review every file in docs/ for internal references
- Verify .gitignore coverage
- Validation: grep -rE "sk-ant|sk_test|pk_test|whsec_|gk_|password.*=.*['\"]|178\.\|hetzner|watchhill|cnorton" . returns zero

---

### e021_s05_t05: Create initial public commit and verify (1h)
**Priority:** HIGH
**Status:** [ ]

**Problem:** First commit to the public repo must be clean and complete.
**Solution:** Single clean commit with all files, verify everything works.

**Approach:**
- git add -A && git commit with proper co-authors
- Push to ginkoai/ginko
- Verify: GitHub detects AGPL-3.0, README renders, CI runs green
- Create GitHub release v2.4.5

---

## Accomplishments This Sprint

[To be filled as work progresses]

## Post-Release (Not in this epic)

- Rotate all credentials in private monorepo (Stripe, Neo4j, Supabase, GitHub OAuth, Voyage API)
- Set up Dependabot on public repo
- Marketing announcement
- NPM publish from public repo CI

## Blockers

None identified.
