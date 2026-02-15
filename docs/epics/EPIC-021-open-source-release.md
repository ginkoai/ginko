---
epic_id: EPIC-021
status: active
created: 2026-02-13
updated: 2026-02-13
---

# EPIC-021: Prepare Ginko for Open-Source Release

## Vision
Make Ginko's AI-native project management CLI available to the broader developer community. A clean public release builds trust, drives adoption, and creates a contribution flywheel — while keeping infrastructure (dashboard, graph, team features) as the Ginko Cloud premium tier.

## Goal
Create a new public repo (ginkoai/ginko) with a clean first commit containing the CLI package, governance files, documentation, and CI/CD — fully functional in local-only mode with zero credentials required.

## Success Criteria
- [ ] `npm install -g @ginkoai/cli` works from public npm
- [ ] `ginko init → start → log → handoff → start` works with zero env vars
- [ ] GitHub Actions CI passes on Node 18/20/22
- [ ] Zero secrets or internal references in public repo (verified by scan)
- [ ] AGPL-3.0 license properly applied
- [ ] README clearly documents local vs cloud tiers

## Scope

### In Scope
- CLI package extraction (packages/cli/)
- AGPL-3.0 licensing
- Governance files (CONTRIBUTING, CoC, SECURITY)
- CLAUDE.md sanitization (keep as feature showcase)
- Local-only mode verification (graceful degradation)
- GitHub Actions CI/CD (test + npm publish)
- Public ADR curation (~25-35 relevant ADRs)
- README and getting-started documentation

### Out of Scope
- Dashboard or website code
- @ginko/shared package (CLI has zero imports)
- MCP server (deprecated)
- Marketing announcement (post-release)
- Credential rotation in private monorepo (post-release)
- Dependabot setup (post-release)

### Dependencies
- GitHub org ginkoai (exists)
- NPM org @ginkoai (exists)
- Current CLI package builds and tests pass

## Sprint Breakdown

| Sprint | ID | Goal | Tasks |
|--------|----|------|-------|
| Sprint 1 | e021_s01 | Repository Setup & Governance | 6 |
| Sprint 2 | e021_s02 | Code Extraction & Cleanup | 6 |
| Sprint 3 | e021_s03 | Local-Only Mode Verification | 4 |
| Sprint 4 | e021_s04 | CI/CD & Testing | 4 |
| Sprint 5 | e021_s05 | Documentation & Polish | 5 |

## Key Decisions
- **License**: AGPL-3.0-or-later (copyleft — protects against proprietary forks)
- **Repo strategy**: New public repo with fresh commit (no git history from private monorepo)
- **Tier model**: Local-only (free, open source) vs Ginko Cloud (graph sync, teams, dashboard)
- **CLAUDE.md**: Keep as feature showcase, sanitize internal references

## Risks & Mitigations
- **Leaked secrets**: Fresh repo + secrets scan mitigates. Rotate private repo creds post-release.
- **Broken local mode**: Sprint 3 dedicated to verifying all graph-dependent paths degrade gracefully.
- **AGPL concerns**: Some enterprises avoid AGPL. Acceptable tradeoff for copyleft protection.

---

## Changelog

### v1.0.0 - 2026-02-13
- Initial epic creation
- Participants: Chris Norton (chris@watchhill.ai), Claude
