# SPRINT: Open-Source Release Sprint 2 - Code Extraction & Cleanup (EPIC-021 Sprint 2)

## Sprint Overview

**Sprint Goal**: Extract CLI package into the public repo with all internal references removed.
**ID:** e021_s02
**Duration**: 1-2 days
**Type**: Feature sprint
**Progress:** 0% (0/6 tasks complete)

**Success Criteria:**
- CLI code copied to public repo, builds and tests pass
- Zero hardcoded internal references (watchhill, cnorton, reese)
- dotenv loading works without monorepo .env
- .env.example documents only optional vars

---

## Sprint Tasks

### e021_s02_t01: Extract CLI package into new repo (2h)
**Priority:** HIGH
**Status:** [ ]

**Problem:** CLI source lives in private monorepo; need clean copy in public repo.
**Solution:** Copy packages/cli/ source, tests, and config; exclude _archive, dist, node_modules.

**Approach:**
- Copy packages/cli/src/, test/, tests/, config files
- Exclude: _archive/, dist/, node_modules/
- Run secrets scan on all copied files

---

### e021_s02_t02: Create root package.json and workspace config (1h)
**Priority:** HIGH
**Status:** [ ]

**Problem:** Public repo needs proper workspace setup for monorepo-style structure.
**Solution:** Minimal root package.json with workspaces pointing to packages/cli.

**Approach:**
- Root: "workspaces": ["packages/cli"]
- Scripts: build, test, clean
- Root tsconfig.json referencing only CLI
- Verify: npm install && npm run build && npm test

---

### e021_s02_t03: Remove hardcoded internal references (2h)
**Priority:** HIGH
**Status:** [ ]

**Problem:** CLI source contains hardcoded emails, org IDs, and co-author strings.
**Solution:** Replace with dynamic values from git config or generic defaults.

**Files:**
- `event-logger.ts:108` — orgId = 'watchhill-ai' → derive from config or use 'default'
- `ship.ts:94` — hardcoded co-author → read from git config user.name/email
- `sync-command.ts:231` — same co-author fix
- `init-copilot.ts:148` — same co-author fix
- `task-parser.test.ts` — chris@watchhill.ai → user@example.com
- `task-integration.test.ts` — chris@watchhill.ai → user@example.com
- `config-loader.ts:241/245` — path comments → generic examples

**Validation:** grep -r "watchhill\|cnorton" packages/cli/src/ returns zero

---

### e021_s02_t04: Update package.json metadata (30m)
**Priority:** MEDIUM
**Status:** [ ]

**Problem:** package.json still references private repo and MIT license.
**Solution:** Update license, repository URL, homepage, bugs.url.

**Approach:**
- License → AGPL-3.0-or-later
- repository.url → https://github.com/ginkoai/ginko.git
- homepage, bugs.url → ginkoai/ginko

---

### e021_s02_t05: Fix dotenv loading path (30m)
**Priority:** HIGH
**Status:** [ ]

**Problem:** index.ts:25 uses relative path to monorepo root .env which won't exist in public repo.
**Solution:** Use dotenv.config() (loads from cwd) instead of hardcoded relative path.

**Approach:**
- Change: dotenv.config({ path: resolve(__dirname, '../../../.env') }) → dotenv.config()
- Verify: CLI starts with ginko --version when no .env exists

---

### e021_s02_t06: Create minimal .env.example (30m)
**Priority:** MEDIUM
**Status:** [ ]

**Problem:** Users need to know which env vars are available/optional.
**Solution:** .env.example with only optional vars, clearly marked.

**Approach:**
- Only optional vars: AI API keys (ANTHROPIC, OPENAI, GROK), Ginko Cloud config
- All clearly marked as OPTIONAL
- No infrastructure secrets (Neo4j, Stripe, Supabase, Vercel)

---

## Accomplishments This Sprint

[To be filled as work progresses]

## Next Steps

Sprint 3: Local-Only Mode Verification (e021_s03)

## Blockers

None identified.
