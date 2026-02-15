# SPRINT: Open-Source Release Sprint 4 - CI/CD & Testing (EPIC-021 Sprint 4)

## Sprint Overview

**Sprint Goal**: Set up GitHub Actions CI/CD and community templates for the public repo.
**ID:** e021_s04
**Duration**: 1 day
**Type**: Infrastructure sprint
**Progress:** 0% (0/4 tasks complete)

**Success Criteria:**
- CI runs on push to main and PRs (Node 18/20/22 matrix)
- npm test passes with zero credentials in CI
- NPM publish workflow ready (triggers on GitHub release)
- Issue and PR templates in place

---

## Sprint Tasks

### e021_s04_t01: Create GitHub Actions test workflow (2h)
**Priority:** HIGH
**Status:** [ ]

**Problem:** Public repo needs automated testing on every push and PR.
**Solution:** CI workflow with Node.js version matrix.

**Approach:**
- .github/workflows/ci.yml — triggers on push to main and PRs
- Node.js matrix: 18, 20, 22
- Steps: checkout, setup-node, npm ci, build, test

---

### e021_s04_t02: Tag and skip graph-dependent tests (2h)
**Priority:** HIGH
**Status:** [ ]

**Problem:** Some tests require a live graph connection and will fail in CI.
**Solution:** Conditional skip based on env var.

**Approach:**
- Identify tests requiring live graph (live-graph-api.test.ts, write-dispatcher-integration.test.ts, etc.)
- Add conditional skip: process.env.GINKO_GRAPH_ENABLED === 'true'
- npm test passes with zero credentials; npm run test:integration for graph tests

---

### e021_s04_t03: Create NPM publish workflow (1h)
**Priority:** MEDIUM
**Status:** [ ]

**Problem:** Need automated npm publishing on release.
**Solution:** GitHub Actions workflow triggered on GitHub release creation.

**Approach:**
- .github/workflows/publish.yml — triggers on GitHub release
- Builds, tests, publishes with --provenance for supply chain security
- Requires NPM_TOKEN secret

---

### e021_s04_t04: Create issue and PR templates (1h)
**Priority:** MEDIUM
**Status:** [ ]

**Problem:** Contributors need structured templates for reporting bugs and requesting features.
**Solution:** Standard GitHub templates.

**Approach:**
- .github/ISSUE_TEMPLATE/bug_report.md — repro steps, expected/actual, environment
- .github/ISSUE_TEMPLATE/feature_request.md — problem/solution format
- .github/PULL_REQUEST_TEMPLATE.md — summary, test plan, checklist

---

## Accomplishments This Sprint

[To be filled as work progresses]

## Next Steps

Sprint 5: Documentation & Polish (e021_s05)

## Blockers

None identified.
